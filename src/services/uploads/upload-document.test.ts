import { describe, expect, it, vi } from "vitest";

import { ObjectAlreadyExistsError } from "@/lib/object-storage";
import {
  createDocumentUploadService,
  UploadInProgressError,
} from "./upload-document";

const UPLOAD_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("uploadDocument", () => {
  it("stores the private PDF before creating its uploaded document row", async () => {
    const events: string[] = [];
    const bytes = new TextEncoder().encode("%PDF-1.7\nhello");
    const service = createDocumentUploadService({
      storage: {
        async putPdf(input) {
          events.push("storage");
          expect(input).toEqual({
            key: `users/user-id/documents/${UPLOAD_ID}.pdf`,
            bytes,
          });
          return {
            fileUrl:
              `s3://document-embedding-pipeline/users/user-id/documents/${UPLOAD_ID}.pdf`,
            uploadedAt: 100,
            versionId: "version-id",
          };
        },
        async findPdf() {
          return null;
        },
        async deleteObject() {},
        destroy() {},
      },
      documents: {
        async findByS3Key() {
          return null;
        },
        async createUploaded(input) {
          events.push("database");
          expect(input).toMatchObject({
            userId: "user-id",
            fileName: "research.pdf",
            s3Key: `users/user-id/documents/${UPLOAD_ID}.pdf`,
            status: "uploaded",
            progressPercentage: 0,
          });
          return {
            id: "document-id",
            fileName: input.fileName,
            status: input.status,
            progressPercentage: input.progressPercentage,
            errorMessage: null,
          };
        },
      },
      limits: { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
    });

    const document = await service.uploadDocument({
      userId: "user-id",
      uploadId: UPLOAD_ID,
      file: {
        name: "research.pdf",
        type: "application/pdf",
        size: bytes.byteLength,
        bytes,
      },
    });

    expect(events).toEqual(["storage", "database"]);
    expect(document).toMatchObject({
      id: "document-id",
      status: "uploaded",
      progressPercentage: 0,
    });
  });

  it("preserves the stored object when document creation fails", async () => {
    const deleteObject = vi.fn();
    const bytes = new TextEncoder().encode("%PDF-1.7\nhello");
    const service = createDocumentUploadService({
      storage: {
        async putPdf() {
          return {
            fileUrl:
              `s3://document-embedding-pipeline/users/user-id/documents/${UPLOAD_ID}.pdf`,
            uploadedAt: 100,
            versionId: "orphan-version",
          };
        },
        async findPdf() {
          return null;
        },
        deleteObject,
        destroy() {},
      },
      documents: {
        async findByS3Key() {
          return null;
        },
        async createUploaded() {
          throw new Error("database unavailable");
        },
      },
      limits: { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
    });

    await expect(
      service.uploadDocument({
        userId: "user-id",
        uploadId: UPLOAD_ID,
        file: {
          name: "research.pdf",
          type: "application/pdf",
          size: bytes.byteLength,
          bytes,
        },
      }),
    ).rejects.toThrow("database unavailable");

    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("returns the existing document when a lost response is retried", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nhello");
    let storedDocument:
      | {
          id: string;
          fileName: string;
          status: "uploaded";
          progressPercentage: 0;
          errorMessage: null;
        }
      | undefined;
    const putPdf = vi.fn(async () => ({
      fileUrl: `s3://bucket/users/user-id/documents/${UPLOAD_ID}.pdf`,
      uploadedAt: 100,
      versionId: "version-id",
    }));
    const createUploaded = vi.fn(async () => {
      storedDocument = {
        id: "document-id",
        fileName: "research.pdf",
        status: "uploaded",
        progressPercentage: 0,
        errorMessage: null,
      };
      return storedDocument;
    });
    const service = createDocumentUploadService({
      storage: {
        putPdf,
        async findPdf() {
          return null;
        },
        async deleteObject() {},
        destroy() {},
      },
      documents: {
        async findByS3Key() {
          return storedDocument ?? null;
        },
        createUploaded,
      },
      limits: { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
    });
    const input = {
      userId: "user-id",
      uploadId: UPLOAD_ID,
      file: {
        name: "research.pdf",
        type: "application/pdf",
        size: bytes.byteLength,
        bytes,
      },
    };

    const first = await service.uploadDocument(input);
    const retried = await service.uploadDocument(input);

    expect(retried).toEqual(first);
    expect(putPdf).toHaveBeenCalledOnce();
    expect(createUploaded).toHaveBeenCalledOnce();
  });

  it("does not overwrite an in-flight upload with the same ID", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nhello");
    const createUploaded = vi.fn();
    const service = createDocumentUploadService({
      storage: {
        async putPdf() {
          throw new ObjectAlreadyExistsError(
            `users/user-id/documents/${UPLOAD_ID}.pdf`,
          );
        },
        async findPdf() {
          return null;
        },
        async deleteObject() {},
        destroy() {},
      },
      documents: {
        async findByS3Key() {
          return null;
        },
        createUploaded,
      },
      limits: { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
    });

    await expect(
      service.uploadDocument({
        userId: "user-id",
        uploadId: UPLOAD_ID,
        file: {
          name: "research.pdf",
          type: "application/pdf",
          size: bytes.byteLength,
          bytes,
        },
      }),
    ).rejects.toBeInstanceOf(UploadInProgressError);
    expect(createUploaded).not.toHaveBeenCalled();
  });

  it("continues when a lost S3 response can be verified by content", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nhello");
    const createUploaded = vi.fn(async (input) => ({
      id: "document-id",
      fileName: input.fileName,
      status: input.status,
      progressPercentage: input.progressPercentage,
      errorMessage: null,
    }));
    const service = createDocumentUploadService({
      storage: {
        async putPdf() {
          throw new Error("connection reset after write");
        },
        async findPdf() {
          return {
            fileUrl: `s3://bucket/users/user-id/documents/${UPLOAD_ID}.pdf`,
            uploadedAt: 100,
            versionId: "verified-version",
          };
        },
        async deleteObject() {},
        destroy() {},
      },
      documents: {
        async findByS3Key() {
          return null;
        },
        createUploaded,
      },
      limits: { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
    });

    await expect(
      service.uploadDocument({
        userId: "user-id",
        uploadId: UPLOAD_ID,
        file: {
          name: "research.pdf",
          type: "application/pdf",
          size: bytes.byteLength,
          bytes,
        },
      }),
    ).resolves.toMatchObject({ id: "document-id", status: "uploaded" });
    expect(createUploaded).toHaveBeenCalledOnce();
  });

  it("preserves a HEAD-recovered object when document creation fails", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nhello");
    const deleteObject = vi.fn();
    const service = createDocumentUploadService({
      storage: {
        async putPdf() {
          throw new Error("connection reset after write");
        },
        async findPdf() {
          return {
            fileUrl: `s3://bucket/users/user-id/documents/${UPLOAD_ID}.pdf`,
            uploadedAt: 100,
            versionId: "unknown-owner-version",
          };
        },
        deleteObject,
        destroy() {},
      },
      documents: {
        async findByS3Key() {
          return null;
        },
        async createUploaded() {
          throw new Error("database unavailable");
        },
      },
      limits: { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
    });

    await expect(
      service.uploadDocument({
        userId: "user-id",
        uploadId: UPLOAD_ID,
        file: {
          name: "research.pdf",
          type: "application/pdf",
          size: bytes.byteLength,
          bytes,
        },
      }),
    ).rejects.toThrow("database unavailable");
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("finalizes a verified stale object that has no document row", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nhello");
    const putPdf = vi.fn().mockRejectedValueOnce(
      new ObjectAlreadyExistsError(
        `users/user-id/documents/${UPLOAD_ID}.pdf`,
      ),
    );
    const deleteObject = vi.fn();
    const service = createDocumentUploadService({
      storage: {
        putPdf,
        async findPdf() {
          return {
            fileUrl: `s3://bucket/users/user-id/documents/${UPLOAD_ID}.pdf`,
            uploadedAt: 100,
            versionId: "stale-version",
          };
        },
        deleteObject,
        destroy() {},
      },
      documents: {
        async findByS3Key() {
          return null;
        },
        async createUploaded(input) {
          return {
            id: "document-id",
            fileName: input.fileName,
            status: input.status,
            progressPercentage: input.progressPercentage,
            errorMessage: null,
          };
        },
      },
      limits: { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
      staleObjectAgeMs: 500,
      now: () => 1_000,
    });

    await expect(
      service.uploadDocument({
        userId: "user-id",
        uploadId: UPLOAD_ID,
        file: {
          name: "research.pdf",
          type: "application/pdf",
          size: bytes.byteLength,
          bytes,
        },
      }),
    ).resolves.toMatchObject({ id: "document-id" });
    expect(deleteObject).not.toHaveBeenCalled();
    expect(putPdf).toHaveBeenCalledOnce();
  });

  it("preserves the object when the database commit outcome cannot be reconciled", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nhello");
    const deleteObject = vi.fn();
    let lookups = 0;
    const service = createDocumentUploadService({
      storage: {
        async putPdf() {
          return {
            fileUrl: `s3://bucket/users/user-id/documents/${UPLOAD_ID}.pdf`,
            uploadedAt: 100,
            versionId: "preserved-version",
          };
        },
        async findPdf() {
          return null;
        },
        deleteObject,
        destroy() {},
      },
      documents: {
        async findByS3Key() {
          lookups += 1;
          if (lookups === 1) {
            return null;
          }
          throw new Error("database unavailable");
        },
        async createUploaded() {
          throw new Error("ambiguous insert result");
        },
      },
      limits: { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
    });

    await expect(
      service.uploadDocument({
        userId: "user-id",
        uploadId: UPLOAD_ID,
        file: {
          name: "research.pdf",
          type: "application/pdf",
          size: bytes.byteLength,
          bytes,
        },
      }),
    ).rejects.toThrow("commit outcome could not be determined");
    expect(deleteObject).not.toHaveBeenCalled();
  });
});
