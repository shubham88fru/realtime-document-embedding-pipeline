import type {
  UploadedDocument,
  UploadDocumentInput,
} from "@/services/uploads/upload-document";
import { UploadValidationError } from "@/services/uploads/upload-document";
import { isUploadId } from "@/services/uploads/upload-document";
import { UploadInProgressError } from "@/services/uploads/upload-document";
import {
  MultipartUploadError,
  parseSingleFileUpload,
} from "./multipart";

type UploadSession = {
  user?: {
    id?: string;
  };
} | null;

type DocumentUploadHandlerDependencies = {
  authenticate(): Promise<UploadSession>;
  maxFileSizeBytes: number;
  uploadDocument(input: UploadDocumentInput): Promise<UploadedDocument>;
};

export function createDocumentUploadHandler({
  authenticate,
  maxFileSizeBytes,
  uploadDocument,
}: DocumentUploadHandlerDependencies) {
  return async function post(request: Request): Promise<Response> {
    const session = await authenticate();
    if (!session?.user?.id) {
      return Response.json(
        {
          error: {
            code: "unauthorized",
            message: "Sign in to upload documents.",
          },
        },
        { status: 401 },
      );
    }

    const uploadId = request.headers.get("Idempotency-Key");
    if (!uploadId || !isUploadId(uploadId)) {
      return Response.json(
        {
          error: {
            code: "invalid_request",
            message: "A valid upload ID is required.",
          },
        },
        { status: 400 },
      );
    }

    let file: Awaited<ReturnType<typeof parseSingleFileUpload>>;
    try {
      file = await parseSingleFileUpload(request, maxFileSizeBytes);
    } catch (error) {
      if (error instanceof MultipartUploadError) {
        return Response.json(
          {
            error: {
              code: error.code,
              message: error.message,
            },
          },
          { status: error.status },
        );
      }
      console.error("Could not parse document upload form data.", error);
      return Response.json(
        {
          error: {
            code: "invalid_request",
            message: "Send the PDF as multipart form data.",
          },
        },
        { status: 400 },
      );
    }

    let document: UploadedDocument;
    try {
      document = await uploadDocument({
        userId: session.user.id,
        uploadId,
        file,
      });
    } catch (error) {
      if (error instanceof UploadValidationError) {
        return Response.json(
          {
            error: {
              code: "invalid_upload",
              message: error.message,
              issues: error.issues,
            },
          },
          { status: 422 },
        );
      }
      if (error instanceof UploadInProgressError) {
        return Response.json(
          {
            error: {
              code: "upload_in_progress",
              message: error.message,
            },
          },
          { status: 409 },
        );
      }

      console.error("Document upload failed.", error);
      return Response.json(
        {
          error: {
            code: "upload_failed",
            message: "The document could not be uploaded. Try again.",
          },
        },
        { status: 500 },
      );
    }

    return Response.json({ document }, { status: 201 });
  };
}
