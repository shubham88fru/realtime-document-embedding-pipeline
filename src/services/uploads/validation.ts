export type UploadCandidate = {
  name: string;
  size: number;
  type: string;
};

export type UploadLimits = {
  maxFiles: number;
  maxFileSizeBytes: number;
};

export type UploadIssue = {
  code:
    | "too_many_files"
    | "empty_file"
    | "file_too_large"
    | "unsupported_type";
  message: string;
  fileIndex?: number;
};

const BYTES_PER_MEGABYTE = 1024 * 1024;
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;

export function hasPdfSignature(bytes: Uint8Array): boolean {
  return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

export function validateUploadBatch(
  files: readonly UploadCandidate[],
  limits: UploadLimits,
): UploadIssue[] {
  if (files.length > limits.maxFiles) {
    return [
      {
        code: "too_many_files",
        message: `Choose no more than ${limits.maxFiles} files at once.`,
      },
    ];
  }

  return files.flatMap((file, fileIndex): UploadIssue[] => {
    if (file.size === 0) {
      return [
        {
          code: "empty_file",
          fileIndex,
          message: `${file.name} is empty.`,
        },
      ];
    }

    if (
      file.type.toLowerCase() !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return [
        {
          code: "unsupported_type",
          fileIndex,
          message: `${file.name} is not a PDF file.`,
        },
      ];
    }

    if (file.size > limits.maxFileSizeBytes) {
      return [
        {
          code: "file_too_large",
          fileIndex,
          message:
            `${file.name} is larger than ` +
            `${limits.maxFileSizeBytes / BYTES_PER_MEGABYTE} MB.`,
        },
      ];
    }

    return [];
  });
}
