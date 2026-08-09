"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentStatusPill } from "@/components/ui/document-status-pill";
import { Notice } from "@/components/ui/notice";
import { PipelineProgress } from "@/components/ui/pipeline-progress";
import { formatFileSize, formatMegabytes } from "@/lib/format";
import { uploadDocumentFile } from "@/services/uploads/browser";
import type { UploadedDocument } from "@/services/uploads/upload-document";
import {
  hasPdfSignature,
  validateUploadBatch,
  type UploadLimits,
} from "@/services/uploads/validation";

export type UploadFile = (
  file: File,
  onProgress: (percentage?: number) => void,
  uploadId: string,
) => Promise<UploadedDocument>;

type UploadDeckProps = {
  limits: UploadLimits;
  uploadFile?: UploadFile;
};

type UploadItem = {
  id: string;
  file: File;
  state:
    | "selected"
    | "validating"
    | "invalid"
    | "uploading"
    | "finalizing"
    | "uploaded"
    | "upload-failed";
  progress?: number;
  error?: string;
  document?: UploadedDocument;
};

const STATE_LABELS: Record<UploadItem["state"], string> = {
  selected: "Selected",
  validating: "Validating",
  invalid: "Needs attention",
  uploading: "Uploading",
  finalizing: "Finalizing",
  uploaded: "Uploaded",
  "upload-failed": "Upload failed",
};

const DOCUMENT_STATUS_LABELS: Record<UploadedDocument["status"], string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  complete: "Complete",
  error: "Error",
};

function readBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
        return;
      }
      reject(new Error("The selected file could not be read."));
    });
    reader.addEventListener("error", () => {
      reject(new Error("The selected file could not be read."));
    });
    reader.readAsArrayBuffer(blob);
  });
}

export function UploadDeck({
  limits,
  uploadFile = uploadDocumentFile,
}: UploadDeckProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const browseButtonRef = useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [selectionError, setSelectionError] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);

  function selectFiles(files: FileList | File[]) {
    const selected = Array.from(files);
    const issues = validateUploadBatch(selected, limits);
    const batchIssue = issues.find((issue) => issue.fileIndex === undefined);
    if (batchIssue) {
      setSelectionError(batchIssue.message);
      return;
    }

    setSelectionError(undefined);
    setItems(
      selected.map((file, index) => {
        const issue = issues.find(
          (candidate) => candidate.fileIndex === index,
        );
        return {
          id: crypto.randomUUID(),
          file,
          state: issue ? ("invalid" as const) : ("selected" as const),
          ...(issue ? { error: issue.message } : {}),
        };
      }),
    );
  }

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function restoreBrowseFocus() {
    setTimeout(() => browseButtonRef.current?.focus(), 0);
  }

  async function startUploads() {
    const uploadable = items.filter(
      (item) => item.state === "selected" || item.state === "upload-failed",
    );
    setItems((current) =>
      current.map((item) =>
        uploadable.some((candidate) => candidate.id === item.id)
          ? { ...item, state: "validating", error: undefined }
          : item,
      ),
    );

    await Promise.all(
      uploadable.map(async (item) => {
        try {
          const signature = await readBytes(item.file.slice(0, 5));
          if (!hasPdfSignature(signature)) {
            updateItem(item.id, {
              state: "invalid",
              error: `${item.file.name} does not contain PDF data.`,
            });
            restoreBrowseFocus();
            return;
          }

          updateItem(item.id, {
            state: "uploading",
            progress: undefined,
          });
          const document = await uploadFile(
            item.file,
            (progress) => {
              updateItem(item.id, {
                state: progress === 100 ? "finalizing" : "uploading",
                progress,
              });
            },
            item.id,
          );
          updateItem(item.id, {
            state: "uploaded",
            progress: 100,
            document,
            error: undefined,
          });
        } catch (error) {
          updateItem(item.id, {
            state: "upload-failed",
            error:
              error instanceof Error
                ? error.message
                : "The document could not be uploaded. Try again.",
          });
        }
      }),
    );
  }

  const uploadableCount = items.filter(
    (item) => item.state === "selected" || item.state === "upload-failed",
  ).length;
  const uploadInProgress = items.some(
    (item) =>
      item.state === "validating" ||
      item.state === "uploading" ||
      item.state === "finalizing",
  );
  const allUploaded =
    items.length > 0 && items.every((item) => item.state === "uploaded");
  const hasBlockingIssues =
    items.length > 0 &&
    uploadableCount === 0 &&
    !uploadInProgress &&
    !allUploaded;
  const inProgressLabel = items.some((item) => item.state === "uploading")
    ? "Uploading…"
    : items.some((item) => item.state === "finalizing")
      ? "Finalizing…"
      : "Validating…";

  return (
    <section aria-labelledby="upload-title" className="space-y-5">
      <div
        className={`flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-dashed px-6 py-10 text-center shadow-cloudline backdrop-blur-sm transition-colors ${
          isDragging
            ? "border-action bg-cloud/80"
            : "border-action/35 bg-card/75"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!uploadInProgress) {
            setIsDragging(true);
          }
        }}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (uploadInProgress) {
            return;
          }
          selectFiles(event.dataTransfer.files);
        }}
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-cloud text-action">
          <UploadCloud aria-hidden="true" className="size-6" />
        </div>
        <h2
          className="mt-5 font-heading text-2xl font-medium tracking-tight"
          id="upload-title"
        >
          Add PDF documents
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Choose up to {limits.maxFiles} PDFs, {formatMegabytes(
            limits.maxFileSizeBytes,
          )} each. On desktop, you can also drag them here.
        </p>
        <input
          accept=".pdf,application/pdf"
          aria-label="Choose PDF files"
          className="sr-only"
          disabled={uploadInProgress}
          multiple
          onChange={(event) => {
            if (event.target.files) {
              selectFiles(event.target.files);
            }
            event.target.value = "";
          }}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />
        <Button
          className="mt-6"
          disabled={uploadInProgress}
          onClick={() => inputRef.current?.click()}
          ref={browseButtonRef}
          type="button"
        >
          Browse PDF files
        </Button>
      </div>

      {selectionError ? (
        <Notice
          description={selectionError}
          title="Files not selected"
          variant="error"
        />
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-3" role="list" aria-label="Selected files">
          {items.map((item) => (
            <div
              className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm"
              key={item.id}
              role="listitem"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cloud text-action">
                <FileText aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(item.file.size)}
                </p>
                {item.state === "validating" ? (
                  <PipelineProgress label={`Validating ${item.file.name}`} />
                ) : null}
                {item.state === "uploading" ? (
                  <PipelineProgress
                    label={`Uploading ${item.file.name}`}
                    value={item.progress}
                  />
                ) : null}
                {item.state === "finalizing" ? (
                  <PipelineProgress label={`Finalizing ${item.file.name}`} />
                ) : null}
                {item.error ? (
                  <p
                    className="mt-1 text-sm text-status-error-foreground"
                    role="alert"
                  >
                    {item.error}
                  </p>
                ) : null}
              </div>
              <div
                aria-label={`${item.file.name} status: ${
                  item.document
                    ? DOCUMENT_STATUS_LABELS[item.document.status]
                    : STATE_LABELS[item.state]
                }`}
                aria-live="polite"
                role="status"
              >
                {item.document ? (
                  <DocumentStatusPill status={item.document.status} />
                ) : (
                  <Badge
                    variant={
                      item.state === "invalid" ||
                      item.state === "upload-failed"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {STATE_LABELS[item.state]}
                  </Badge>
                )}
              </div>
              <Button
                aria-label={`Remove ${item.file.name}`}
                disabled={uploadInProgress}
                onClick={() => {
                  setItems((current) =>
                    current.filter((candidate) => candidate.id !== item.id),
                  );
                  restoreBrowseFocus();
                }}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          ))}

          {items.length > 0 ? (
            <div className="flex justify-end">
              <Button
                aria-disabled={
                  uploadInProgress || allUploaded || hasBlockingIssues
                }
                onClick={() => {
                  if (
                    !uploadInProgress &&
                    !allUploaded &&
                    !hasBlockingIssues
                  ) {
                    void startUploads();
                  }
                }}
                type="button"
              >
                {allUploaded
                  ? "All files uploaded"
                  : hasBlockingIssues
                    ? "Resolve file issues"
                  : uploadInProgress
                    ? inProgressLabel
                  : `Upload ${uploadableCount} ${
                      uploadableCount === 1 ? "file" : "files"
                    }`}
              </Button>
              <span
                aria-live="polite"
                className="sr-only"
                role="status"
              >
                {allUploaded
                  ? `${items.length} ${
                      items.length === 1 ? "file" : "files"
                    } uploaded successfully.`
                  : ""}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
