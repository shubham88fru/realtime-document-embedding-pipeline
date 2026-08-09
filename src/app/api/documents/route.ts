import { auth } from "@/auth";
import { serverEnv } from "@/lib/env";
import { documentUploadService } from "@/services/uploads/server";
import { createDocumentUploadHandler } from "./handler";

export const runtime = "nodejs";

export const POST = createDocumentUploadHandler({
  authenticate: auth,
  maxFileSizeBytes: serverEnv().limits.maxFileSizeBytes,
  uploadDocument(input) {
    return documentUploadService().uploadDocument(input);
  },
});
