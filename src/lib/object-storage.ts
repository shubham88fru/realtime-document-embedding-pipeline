import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput,
  type S3ClientConfig,
  type PutObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";

import { serverEnv } from "@/lib/env";

export type ObjectStorageConfig = {
  region: string;
  bucketName: string;
  endpoint?: string;
  forcePathStyle: boolean;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
};

export type PutPdfInput = {
  key: string;
  bytes: Uint8Array;
};

export type StoredObject = {
  fileUrl: string;
  uploadedAt: number;
  versionId?: string;
};

export type DeleteStoredObjectInput = {
  key: string;
  versionId?: string;
};

export type ObjectStorage = {
  putPdf(input: PutPdfInput): Promise<StoredObject>;
  findPdf(input: PutPdfInput): Promise<StoredObject | null>;
  deleteObject(input: DeleteStoredObjectInput): Promise<void>;
  destroy(): void;
};

export class ObjectAlreadyExistsError extends Error {
  constructor(readonly key: string) {
    super(`An object already exists at ${key}.`);
    this.name = "ObjectAlreadyExistsError";
  }
}

export class ObjectIntegrityError extends Error {
  constructor(readonly key: string) {
    super(`The existing object at ${key} does not match this upload.`);
    this.name = "ObjectIntegrityError";
  }
}

function isPreconditionFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.name === "PreconditionFailed" ||
    candidate.name === "ConditionalRequestConflict" ||
    candidate.$metadata?.httpStatusCode === 409 ||
    candidate.$metadata?.httpStatusCode === 412
  );
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.name === "NotFound" ||
    candidate.$metadata?.httpStatusCode === 404
  );
}

function contentHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createS3ObjectStorage(
  config: ObjectStorageConfig,
): ObjectStorage {
  const clientConfig: S3ClientConfig = {
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    ...(config.credentials ? { credentials: config.credentials } : {}),
  };
  const client = new S3Client(clientConfig);

  return {
    async putPdf({ key, bytes }) {
      const uploadHash = contentHash(bytes);
      const uploadedAt = Date.now();
      let result: PutObjectCommandOutput;
      try {
        result = await client.send(
          new PutObjectCommand({
            Bucket: config.bucketName,
            Key: key,
            Body: bytes,
            ContentLength: bytes.byteLength,
            ContentType: "application/pdf",
            IfNoneMatch: "*",
            Metadata: {
              "upload-sha256": uploadHash,
              "upload-size": String(bytes.byteLength),
              "uploaded-at": String(uploadedAt),
            },
            ...(config.endpoint ? {} : { ServerSideEncryption: "AES256" }),
          }),
        );
      } catch (error) {
        if (isPreconditionFailure(error)) {
          throw new ObjectAlreadyExistsError(key);
        }
        throw error;
      }

      return {
        fileUrl: `s3://${config.bucketName}/${key}`,
        uploadedAt,
        ...(result.VersionId ? { versionId: result.VersionId } : {}),
      };
    },

    async findPdf({ key, bytes }) {
      let result: HeadObjectCommandOutput;
      try {
        result = await client.send(
          new HeadObjectCommand({
            Bucket: config.bucketName,
            Key: key,
          }),
        );
      } catch (error) {
        if (isNotFound(error)) {
          return null;
        }
        throw error;
      }

      const expectedHash = contentHash(bytes);
      const uploadedAt = Number(result.Metadata?.["uploaded-at"]);
      if (
        result.ContentLength !== bytes.byteLength ||
        result.Metadata?.["upload-sha256"] !== expectedHash ||
        result.Metadata?.["upload-size"] !== String(bytes.byteLength) ||
        !Number.isFinite(uploadedAt)
      ) {
        throw new ObjectIntegrityError(key);
      }

      return {
        fileUrl: `s3://${config.bucketName}/${key}`,
        uploadedAt,
        ...(result.VersionId ? { versionId: result.VersionId } : {}),
      };
    },

    async deleteObject({ key, versionId }) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: key,
          ...(versionId ? { VersionId: versionId } : {}),
        }),
      );
    },

    destroy() {
      client.destroy();
    },
  };
}

const globalForObjectStorage = globalThis as typeof globalThis & {
  __documentPipelineObjectStorage?: ObjectStorage;
};

let storage: ObjectStorage | undefined;

export function objectStorage(): ObjectStorage {
  const cached =
    storage ?? globalForObjectStorage.__documentPipelineObjectStorage;
  if (cached) {
    storage = cached;
    return cached;
  }

  const env = serverEnv();
  const created = createS3ObjectStorage(env.storage);
  storage = created;
  if (!env.isProduction) {
    globalForObjectStorage.__documentPipelineObjectStorage = created;
  }
  return created;
}
