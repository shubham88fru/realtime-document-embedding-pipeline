import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { objectStorage } from "@/lib/object-storage";
import {
  createDocumentUploadService,
  type DocumentRepository,
} from "./upload-document";

function createPrismaDocumentRepository(): DocumentRepository {
  return {
    findByS3Key(s3Key) {
      return db().document.findUnique({
        where: { s3Key },
        select: {
          id: true,
          fileName: true,
          status: true,
          progressPercentage: true,
          errorMessage: true,
        },
      });
    },
    createUploaded(input) {
      return db().document.create({
        data: input,
        select: {
          id: true,
          fileName: true,
          status: true,
          progressPercentage: true,
          errorMessage: true,
        },
      });
    },
  };
}

let service: ReturnType<typeof createDocumentUploadService> | undefined;

export function documentUploadService() {
  if (service) {
    return service;
  }

  const env = serverEnv();
  service = createDocumentUploadService({
    storage: objectStorage(),
    documents: createPrismaDocumentRepository(),
    limits: {
      maxFiles: env.limits.maxUploadFiles,
      maxFileSizeBytes: env.limits.maxFileSizeBytes,
    },
  });
  return service;
}
