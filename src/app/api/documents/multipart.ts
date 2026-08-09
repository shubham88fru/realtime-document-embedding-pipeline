import Busboy from "busboy";
import { pipeline, Readable, Transform } from "node:stream";

const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024;

export type ParsedUploadFile = {
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
};

export class MultipartUploadError extends Error {
  constructor(
    readonly code:
      | "invalid_request"
      | "file_too_large"
      | "too_many_files",
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MultipartUploadError";
  }
}

export async function parseSingleFileUpload(
  request: Request,
  maxFileSizeBytes: number,
): Promise<ParsedUploadFile> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) {
    throw new MultipartUploadError(
      "invalid_request",
      "Send the PDF as multipart form data.",
      400,
    );
  }
  if (!request.body) {
    throw new MultipartUploadError(
      "invalid_request",
      "Choose a PDF file to upload.",
      400,
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > maxFileSizeBytes + MAX_MULTIPART_OVERHEAD_BYTES
  ) {
    throw new MultipartUploadError(
      "file_too_large",
      "The PDF is larger than the configured upload limit.",
      413,
    );
  }

  return new Promise<ParsedUploadFile>((resolve, reject) => {
    let settled = false;
    let parsedFile: ParsedUploadFile | undefined;
    let parsingError: MultipartUploadError | undefined;
    let parser: ReturnType<typeof Busboy>;
    const fail = (error: MultipartUploadError) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    const succeed = (file: ParsedUploadFile) => {
      if (!settled) {
        settled = true;
        resolve(file);
      }
    };

    try {
      parser = Busboy({
        headers: { "content-type": contentType },
        defParamCharset: "utf8",
        limits: {
          // Busboy marks a stream truncated when it reaches (not exceeds) the
          // configured value. One extra byte preserves an exact-limit PDF.
          fileSize: maxFileSizeBytes + 1,
          files: 1,
          fields: 0,
          fieldSize: 0,
          // Busboy emits partsLimit when the limit is reached, so allow one
          // extra part to distinguish a valid single file from an overflow.
          parts: 2,
          headerPairs: 20,
        },
      });
    } catch {
      fail(
        new MultipartUploadError(
          "invalid_request",
          "Send the PDF as multipart form data.",
          400,
        ),
      );
      return;
    }

    parser.on("file", (fieldName, stream, info) => {
      if (fieldName !== "file") {
        const error = new MultipartUploadError(
          "invalid_request",
          "Choose a PDF file to upload.",
          400,
        );
        parsingError = error;
        stream.on("error", () => undefined);
        fail(error);
        parser.destroy(error);
        return;
      }

      const chunks: Buffer[] = [];
      let size = 0;
      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        size += chunk.byteLength;
      });
      stream.on("limit", () => {
        const error = new MultipartUploadError(
          "file_too_large",
          `${info.filename} is larger than the configured upload limit.`,
          413,
        );
        parsingError = error;
        fail(error);
        parser.destroy(error);
      });
      stream.on("error", () => {
        parsingError = new MultipartUploadError(
          "invalid_request",
          "The PDF upload could not be read.",
          400,
        );
      });
      stream.on("end", () => {
        if (stream.truncated || parsingError) {
          return;
        }
        parsedFile = {
          name: info.filename,
          type: info.mimeType,
          size,
          bytes: new Uint8Array(Buffer.concat(chunks, size)),
        };
      });
    });
    parser.on("filesLimit", () => {
      const error = new MultipartUploadError(
        "too_many_files",
        "Send one PDF per upload request.",
        400,
      );
      parsingError = error;
      fail(error);
      parser.destroy(error);
    });
    parser.on("fieldsLimit", () => {
      const error = new MultipartUploadError(
        "invalid_request",
        "Unexpected form fields were included.",
        400,
      );
      parsingError = error;
      fail(error);
      parser.destroy(error);
    });
    parser.on("partsLimit", () => {
      const error = new MultipartUploadError(
        "too_many_files",
        "Send one PDF per upload request.",
        400,
      );
      parsingError = error;
      fail(error);
      parser.destroy(error);
    });
    parser.on("error", (error) => {
      fail(
        error instanceof MultipartUploadError
          ? error
          : new MultipartUploadError(
              "invalid_request",
              "The multipart upload could not be read.",
              400,
            ),
      );
    });
    parser.on("finish", () => {
      if (parsingError) {
        fail(parsingError);
        return;
      }
      if (!parsedFile) {
        fail(
          new MultipartUploadError(
            "invalid_request",
            "Choose a PDF file to upload.",
            400,
          ),
        );
        return;
      }
      succeed(parsedFile);
    });

    const source = Readable.from(
      request.body as unknown as AsyncIterable<Uint8Array>,
    );
    let totalBytes = 0;
    const totalLimit = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        totalBytes += chunk.byteLength;
        if (
          totalBytes >
          maxFileSizeBytes + MAX_MULTIPART_OVERHEAD_BYTES
        ) {
          callback(
            new MultipartUploadError(
              "file_too_large",
              "The multipart request is larger than the configured upload limit.",
              413,
            ),
          );
          return;
        }
        callback(null, chunk);
      },
    });
    pipeline(source, totalLimit, parser, (error) => {
      if (!error || settled) {
        return;
      }
      fail(
        error instanceof MultipartUploadError
          ? error
          : new MultipartUploadError(
              "invalid_request",
              "The upload stream could not be read.",
              400,
            ),
      );
    });
  });
}
