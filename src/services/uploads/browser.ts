import type { UploadedDocument } from "./upload-document";

type UploadResponse = {
  document?: UploadedDocument;
  error?: {
    message?: string;
  };
};

export class UploadRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "UploadRequestError";
  }
}

export function uploadDocumentFile(
  file: File,
  onProgress: (percentage?: number) => void,
  uploadId: string,
): Promise<UploadedDocument> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/documents");
    request.setRequestHeader("Idempotency-Key", uploadId);
    request.responseType = "json";

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total === 0) {
        onProgress(undefined);
        return;
      }
      onProgress(
        event.loaded >= event.total
          ? 99
          : Math.min(
              99,
              Math.floor((event.loaded / event.total) * 100),
            ),
      );
    });
    request.upload.addEventListener("load", () => {
      onProgress(100);
    });

    request.addEventListener("load", () => {
      const response = request.response as UploadResponse | null;
      if (request.status === 201 && response?.document) {
        resolve(response.document);
        return;
      }

      reject(
        new UploadRequestError(
          response?.error?.message ??
            "The document could not be uploaded. Try again.",
          request.status,
        ),
      );
    });
    request.addEventListener("error", () => {
      reject(
        new UploadRequestError(
          "The upload could not reach the server. Check your connection and try again.",
        ),
      );
    });
    request.addEventListener("abort", () => {
      reject(new UploadRequestError("The upload was cancelled."));
    });

    const formData = new FormData();
    formData.set("file", file);
    request.send(formData);
  });
}
