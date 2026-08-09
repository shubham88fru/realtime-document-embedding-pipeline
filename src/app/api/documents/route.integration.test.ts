import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectVersionsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { createS3ObjectStorage } from "@/lib/object-storage";
import { documentUploadService } from "@/services/uploads/server";
import { resetDatabase } from "@/test-support/database";
import { createDocumentUploadHandler } from "./handler";

const client = db();
const storageConfig = serverEnv().storage;
const s3 = new S3Client(storageConfig);
const storage = createS3ObjectStorage(storageConfig);
const storedKeys: string[] = [];

beforeEach(async () => {
  await resetDatabase(client);
});

afterEach(async () => {
  await Promise.all(
    storedKeys.splice(0).map(async (key) => {
      const versions = await s3.send(
        new ListObjectVersionsCommand({
          Bucket: storageConfig.bucketName,
          Prefix: key,
        }),
      );
      await Promise.all(
        [...(versions.Versions ?? []), ...(versions.DeleteMarkers ?? [])]
          .filter((version) => version.Key === key && version.VersionId)
          .map((version) =>
            s3.send(
              new DeleteObjectCommand({
                Bucket: storageConfig.bucketName,
                Key: key,
                VersionId: version.VersionId,
              }),
            ),
          ),
      );
    }),
  );
});

afterAll(async () => {
  s3.destroy();
  storage.destroy();
  await client.$disconnect();
});

describe("POST /api/documents integration", () => {
  it("stores the authenticated user's PDF and creates its uploaded row", async () => {
    const uploadId = crypto.randomUUID();
    const user = await client.user.create({
      data: { email: "uploader@example.com", name: "Uploader" },
    });
    const handler = createDocumentUploadHandler({
      authenticate: async () => ({ user: { id: user.id } }),
      maxFileSizeBytes: serverEnv().limits.maxFileSizeBytes,
      uploadDocument(input) {
        return documentUploadService().uploadDocument(input);
      },
    });
    const createRequest = () => {
      const formData = new FormData();
      formData.set(
        "file",
        new File(["%PDF-1.7\nintegration"], "integration.pdf", {
          type: "application/pdf",
        }),
      );
      return new Request("http://localhost/api/documents", {
        method: "POST",
        headers: { "Idempotency-Key": uploadId },
        body: formData,
      });
    };

    const response = await handler(createRequest());
    const body = (await response.json()) as {
      document: { id: string; status: string; progressPercentage: number };
    };
    expect(response.status).toBe(201);
    const document = await client.document.findUniqueOrThrow({
      where: { id: body.document.id },
    });
    storedKeys.push(document.s3Key);

    expect(body.document).toMatchObject({
      id: document.id,
      status: "uploaded",
      progressPercentage: 0,
    });
    expect(document.userId).toBe(user.id);
    await expect(
      s3.send(
        new HeadObjectCommand({
          Bucket: storageConfig.bucketName,
          Key: document.s3Key,
        }),
      ),
    ).resolves.toMatchObject({ ContentType: "application/pdf" });

    const retriedResponse = await handler(createRequest());
    const retriedBody = (await retriedResponse.json()) as {
      document: { id: string };
    };
    const versions = await s3.send(
      new ListObjectVersionsCommand({
        Bucket: storageConfig.bucketName,
        Prefix: document.s3Key,
      }),
    );

    expect(retriedResponse.status).toBe(201);
    expect(retriedBody.document.id).toBe(document.id);
    expect(await client.document.count()).toBe(1);
    expect(
      versions.Versions?.filter((version) => version.Key === document.s3Key),
    ).toHaveLength(1);
  });
});
