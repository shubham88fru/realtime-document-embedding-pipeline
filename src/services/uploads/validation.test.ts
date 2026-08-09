import { describe, expect, it } from "vitest";

import { hasPdfSignature, validateUploadBatch } from "./validation";

describe("validateUploadBatch", () => {
  it("accepts PDF files within the configured batch limits", () => {
    expect(
      validateUploadBatch(
        [
          {
            name: "research.pdf",
            size: 1024,
            type: "application/pdf",
          },
        ],
        { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
      ),
    ).toEqual([]);
  });

  it("rejects a selection larger than the configured batch limit", () => {
    const files = Array.from({ length: 11 }, (_, index) => ({
      name: `document-${index}.pdf`,
      size: 1024,
      type: "application/pdf",
    }));

    expect(
      validateUploadBatch(files, {
        maxFiles: 10,
        maxFileSizeBytes: 5 * 1024 * 1024,
      }),
    ).toContainEqual({
      code: "too_many_files",
      message: "Choose no more than 10 files at once.",
    });
  });

  describe("hasPdfSignature", () => {
    it("distinguishes PDF bytes from a renamed non-PDF payload", () => {
      const encoder = new TextEncoder();

      expect(hasPdfSignature(encoder.encode("%PDF-1.7\n"))).toBe(true);
      expect(hasPdfSignature(encoder.encode("<html>"))).toBe(false);
    });
  });

  it("identifies a PDF that exceeds the configured file-size ceiling", () => {
    expect(
      validateUploadBatch(
        [
          {
            name: "oversized.pdf",
            size: 5 * 1024 * 1024 + 1,
            type: "application/pdf",
          },
        ],
        { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
      ),
    ).toContainEqual({
      code: "file_too_large",
      fileIndex: 0,
      message: "oversized.pdf is larger than 5 MB.",
    });
  });

  it("rejects a file whose name or MIME type is not PDF", () => {
    expect(
      validateUploadBatch(
        [{ name: "notes.txt", size: 1024, type: "text/plain" }],
        { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
      ),
    ).toContainEqual({
      code: "unsupported_type",
      fileIndex: 0,
      message: "notes.txt is not a PDF file.",
    });
  });

  it("rejects an empty PDF", () => {
    expect(
      validateUploadBatch(
        [{ name: "empty.pdf", size: 0, type: "application/pdf" }],
        { maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 },
      ),
    ).toContainEqual({
      code: "empty_file",
      fileIndex: 0,
      message: "empty.pdf is empty.",
    });
  });
});
