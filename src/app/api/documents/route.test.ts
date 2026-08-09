import { describe, expect, it, vi } from "vitest";

import { UploadValidationError } from "@/services/uploads/upload-document";
import { createDocumentUploadHandler } from "./handler";

describe("POST /api/documents", () => {
  it("rejects an unauthenticated upload before invoking the service", async () => {
    const handler = createDocumentUploadHandler({
      authenticate: async () => null,
      maxFileSizeBytes: 5 * 1024 * 1024,
      uploadDocument: async () => {
        throw new Error("upload service must not be called");
      },
    });

    const response = await handler(
      new Request("http://localhost/api/documents", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "unauthorized",
        message: "Sign in to upload documents.",
      },
    });
  });

  it("uploads a multipart PDF for the authenticated user", async () => {
    const uploadId = crypto.randomUUID();
    const formData = new FormData();
    formData.set(
      "file",
      new File(["%PDF-1.7\nhello"], "résumé.pdf", {
        type: "application/pdf",
      }),
    );
    const handler = createDocumentUploadHandler({
      authenticate: async () => ({ user: { id: "session-user-id" } }),
      maxFileSizeBytes: 5 * 1024 * 1024,
      async uploadDocument(input) {
        expect(input.userId).toBe("session-user-id");
        expect(input.uploadId).toBe(uploadId);
        expect(input.file.name).toBe("résumé.pdf");
        expect(new TextDecoder().decode(input.file.bytes)).toBe(
          "%PDF-1.7\nhello",
        );
        return {
          id: "document-id",
          fileName: "résumé.pdf",
          status: "uploaded",
          progressPercentage: 0,
          errorMessage: null,
        };
      },
    });

    const response = await handler(
      new Request("http://localhost/api/documents", {
        method: "POST",
        headers: { "Idempotency-Key": uploadId },
        body: formData,
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      document: {
        id: "document-id",
        fileName: "résumé.pdf",
        status: "uploaded",
        progressPercentage: 0,
        errorMessage: null,
      },
    });
  });

  it("requires a stable upload ID before reading the multipart body", async () => {
    const uploadDocument = vi.fn();
    const handler = createDocumentUploadHandler({
      authenticate: async () => ({ user: { id: "session-user-id" } }),
      maxFileSizeBytes: 5 * 1024 * 1024,
      uploadDocument,
    });

    const response = await handler(
      new Request("http://localhost/api/documents", { method: "POST" }),
    );

    expect(response.status).toBe(400);
    expect(uploadDocument).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "A valid upload ID is required.",
      },
    });
  });

  it("returns structured feedback for a rejected PDF", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(["not a PDF"], "renamed.pdf", {
        type: "application/pdf",
      }),
    );
    const handler = createDocumentUploadHandler({
      authenticate: async () => ({ user: { id: "session-user-id" } }),
      maxFileSizeBytes: 5 * 1024 * 1024,
      async uploadDocument() {
        throw new UploadValidationError([
          {
            code: "unsupported_type",
            fileIndex: 0,
            message: "renamed.pdf does not contain PDF data.",
          },
        ]);
      },
    });

    const response = await handler(
      new Request("http://localhost/api/documents", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: formData,
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_upload",
        message: "renamed.pdf does not contain PDF data.",
        issues: [{ code: "unsupported_type" }],
      },
    });
  });

  it("stops an oversized multipart file before invoking the upload service", async () => {
    const boundary = "oversized-boundary";
    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="oversized.pdf"',
      "Content-Type: application/pdf",
      "",
      "%PDF-1.7\noversized",
      `--${boundary}--`,
      "",
    ].join("\r\n");
    const uploadDocument = vi.fn();
    const handler = createDocumentUploadHandler({
      authenticate: async () => ({ user: { id: "session-user-id" } }),
      maxFileSizeBytes: 5,
      uploadDocument,
    });

    const response = await handler(
      new Request("http://localhost/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: multipartBody,
      }),
    );

    expect(response.status).toBe(413);
    expect(uploadDocument).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "file_too_large",
      },
    });
  });

  it("accepts a PDF exactly at the configured size limit", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File(["%PDF-"], "exact.pdf", { type: "application/pdf" }),
    );
    const uploadDocument = vi.fn(async () => ({
      id: "document-id",
      fileName: "exact.pdf",
      status: "uploaded" as const,
      progressPercentage: 0,
      errorMessage: null,
    }));
    const handler = createDocumentUploadHandler({
      authenticate: async () => ({ user: { id: "session-user-id" } }),
      maxFileSizeBytes: 5,
      uploadDocument,
    });

    const response = await handler(
      new Request("http://localhost/api/documents", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: formData,
      }),
    );

    expect(response.status).toBe(201);
    expect(uploadDocument).toHaveBeenCalledOnce();
  });

  it("rejects an unexpected multipart file field without invoking the service", async () => {
    const boundary = "unexpected-field-boundary";
    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="attachment"; filename="wrong.pdf"',
      "Content-Type: application/pdf",
      "",
      "%PDF-",
      `--${boundary}--`,
      "",
    ].join("\r\n");
    const uploadDocument = vi.fn();
    const handler = createDocumentUploadHandler({
      authenticate: async () => ({ user: { id: "session-user-id" } }),
      maxFileSizeBytes: 5 * 1024 * 1024,
      uploadDocument,
    });

    const response = await handler(
      new Request("http://localhost/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: multipartBody,
      }),
    );

    expect(response.status).toBe(400);
    expect(uploadDocument).not.toHaveBeenCalled();
  });
});
