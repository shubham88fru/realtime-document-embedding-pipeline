import {
  ObjectAlreadyExistsError,
  ObjectIntegrityError,
  type ObjectStorage,
} from "@/lib/object-storage";
import type { DocumentStatus } from "@/types/document";
import {
  hasPdfSignature,
  validateUploadBatch,
  type UploadIssue,
  type UploadLimits,
} from "./validation";

export type UploadedDocument = {
  id: string;
  fileName: string;
  status: DocumentStatus;
  progressPercentage: number;
  errorMessage: string | null;
};

export type CreateUploadedDocumentInput = {
  userId: string;
  fileName: string;
  s3Key: string;
  fileUrl: string;
  status: "uploaded";
  progressPercentage: 0;
};

export type DocumentRepository = {
  findByS3Key(s3Key: string): Promise<UploadedDocument | null>;
  createUploaded(
    input: CreateUploadedDocumentInput,
  ): Promise<UploadedDocument>;
};

export type UploadDocumentInput = {
  userId: string;
  uploadId: string;
  file: {
    name: string;
    type: string;
    size: number;
    bytes: Uint8Array;
  };
};

export class UploadValidationError extends Error {
  constructor(readonly issues: UploadIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "UploadValidationError";
  }
}

export class UploadInProgressError extends Error {
  constructor() {
    super("This upload is already being finalized. Try again shortly.");
    this.name = "UploadInProgressError";
  }
}

type DocumentUploadServiceDependencies = {
  storage: ObjectStorage;
  documents: DocumentRepository;
  limits: UploadLimits;
  staleObjectAgeMs?: number;
  now?: () => number;
};

const DEFAULT_STALE_OBJECT_AGE_MS = 5 * 60 * 1000;

const UPLOAD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUploadId(value: string): boolean {
  return UPLOAD_ID_PATTERN.test(value);
}

export function createDocumentUploadService({
  storage,
  documents,
  limits,
  staleObjectAgeMs = DEFAULT_STALE_OBJECT_AGE_MS,
  now = Date.now,
}: DocumentUploadServiceDependencies) {
  return {
    async uploadDocument({
      userId,
      uploadId,
      file,
    }: UploadDocumentInput): Promise<UploadedDocument> {
      const issues = validateUploadBatch([file], limits);
      if (!hasPdfSignature(file.bytes)) {
        issues.push({
          code: "unsupported_type",
          fileIndex: 0,
          message: `${file.name} does not contain PDF data.`,
        });
      }
      if (issues.length > 0) {
        throw new UploadValidationError(issues);
      }
      if (!isUploadId(uploadId)) {
        throw new Error("Upload ID must be a UUID.");
      }

      const key = `users/${userId}/documents/${uploadId}.pdf`;
      const existing = await documents.findByS3Key(key);
      if (existing) {
        return existing;
      }

      let storedObject;
      try {
        storedObject = await storage.putPdf({
          key,
          bytes: file.bytes,
        });
      } catch (error) {
        if (error instanceof ObjectAlreadyExistsError) {
          const concurrentUpload = await documents.findByS3Key(key);
          if (concurrentUpload) {
            return concurrentUpload;
          }

          let existingObject;
          try {
            existingObject = await storage.findPdf({
              key,
              bytes: file.bytes,
            });
          } catch (verificationError) {
            if (verificationError instanceof ObjectIntegrityError) {
              throw new UploadInProgressError();
            }
            throw verificationError;
          }
          if (
            !existingObject ||
            now() - existingObject.uploadedAt < staleObjectAgeMs
          ) {
            throw new UploadInProgressError();
          }

          storedObject = existingObject;
        } else {
          try {
            const verifiedObject = await storage.findPdf({
              key,
              bytes: file.bytes,
            });
            if (verifiedObject) {
              storedObject = verifiedObject;
            } else {
              throw error;
            }
          } catch (verificationError) {
            if (verificationError instanceof ObjectIntegrityError) {
              throw new UploadInProgressError();
            }
            throw new AggregateError(
              [error, verificationError],
              "The object write could not be verified.",
            );
          }
        }
      }

      try {
        return await documents.createUploaded({
          userId,
          fileName: file.name,
          s3Key: key,
          fileUrl: storedObject.fileUrl,
          status: "uploaded",
          progressPercentage: 0,
        });
      } catch (error) {
        try {
          const concurrentUpload = await documents.findByS3Key(key);
          if (concurrentUpload) {
            return concurrentUpload;
          }
        } catch (reconciliationError) {
          throw new AggregateError(
            [error, reconciliationError],
            "Document creation failed and its commit outcome could not be determined. The stored object was preserved.",
          );
        }

        throw error;
      }
    },
  };
}
