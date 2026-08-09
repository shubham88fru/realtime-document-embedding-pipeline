// @vitest-environment jsdom

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UploadDeck } from "./upload-deck";

describe("UploadDeck", () => {
  it("shows multiple selected PDFs before starting a network upload", async () => {
    const user = userEvent.setup();
    const uploadFile = vi.fn();
    render(
      <UploadDeck
        limits={{ maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 }}
        uploadFile={uploadFile}
      />,
    );

    await user.upload(screen.getByLabelText("Choose PDF files"), [
      new File(["%PDF-1.7\none"], "one.pdf", { type: "application/pdf" }),
      new File(["%PDF-1.7\ntwo"], "two.pdf", { type: "application/pdf" }),
    ]);

    expect(screen.getByText("one.pdf")).toBeInTheDocument();
    expect(screen.getByText("two.pdf")).toBeInTheDocument();
    expect(screen.getAllByText("Selected")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Upload 2 files" }),
    ).toBeEnabled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("returns focus to file browsing after removing a selected row", async () => {
    const user = userEvent.setup();
    render(
      <UploadDeck
        limits={{ maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 }}
        uploadFile={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Choose PDF files"),
      new File(["%PDF-1.7"], "one.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Remove one.pdf" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Browse PDF files" }),
      ).toHaveFocus(),
    );
  });

  it("rejects a selection above the configured file count", async () => {
    const user = userEvent.setup();
    render(
      <UploadDeck
        limits={{ maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 }}
        uploadFile={vi.fn()}
      />,
    );
    const files = Array.from(
      { length: 11 },
      (_, index) =>
        new File(["%PDF-1.7"], `document-${index}.pdf`, {
          type: "application/pdf",
        }),
    );

    await user.upload(screen.getByLabelText("Choose PDF files"), files);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose no more than 10 files at once.",
    );
    expect(
      screen.queryByRole("button", { name: /Upload \d+ files/ }),
    ).not.toBeInTheDocument();
  });

  it("shows real transfer progress before the persisted uploaded state", async () => {
    const user = userEvent.setup();
    let reportProgress: ((percentage?: number) => void) | undefined;
    let finishUpload:
      | ((document: {
          id: string;
          fileName: string;
          status: "uploaded";
          progressPercentage: number;
          errorMessage: null;
        }) => void)
      | undefined;
    const uploadFile = vi.fn(
      (_file: File, onProgress: (percentage?: number) => void) => {
        reportProgress = onProgress;
        return new Promise<{
          id: string;
          fileName: string;
          status: "uploaded";
          progressPercentage: number;
          errorMessage: null;
        }>((resolve) => {
          finishUpload = resolve;
        });
      },
    );
    render(
      <UploadDeck
        limits={{ maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 }}
        uploadFile={uploadFile}
      />,
    );

    await user.upload(
      screen.getByLabelText("Choose PDF files"),
      new File(["%PDF-1.7\none"], "one.pdf", { type: "application/pdf" }),
    );
    const uploadButton = screen.getByRole("button", {
      name: "Upload 1 file",
    });
    await user.click(uploadButton);
    await waitFor(() => expect(uploadFile).toHaveBeenCalledOnce());
    expect(
      screen.getByRole("button", { name: "Remove one.pdf" }),
    ).toBeDisabled();

    act(() => reportProgress?.(undefined));
    expect(
      screen.getByRole("progressbar", { name: "Uploading one.pdf" }),
    ).not.toHaveAttribute("aria-valuenow");

    act(() => reportProgress?.(37));
    expect(screen.getByText("Uploading")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Uploading one.pdf" }),
    ).toHaveAttribute("aria-valuenow", "37");

    act(() => reportProgress?.(100));
    expect(screen.getByText("Finalizing")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Finalizing one.pdf" }),
    ).not.toHaveAttribute("aria-valuenow");

    await act(async () => {
      finishUpload?.({
        id: "document-id",
        fileName: "one.pdf",
        status: "uploaded",
        progressPercentage: 0,
        errorMessage: null,
      });
    });

    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "one.pdf status: Uploaded" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1 file uploaded successfully."),
    ).toBeInTheDocument();
    const completedButton = screen.getByRole("button", {
      name: "All files uploaded",
    });
    expect(completedButton).toHaveAttribute("aria-disabled", "true");
    expect(completedButton).toHaveFocus();
    expect(
      screen.queryByRole("progressbar", { name: "Uploading one.pdf" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a failed upload visible with an accessible retry state", async () => {
    const user = userEvent.setup();
    render(
      <UploadDeck
        limits={{ maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 }}
        uploadFile={vi.fn().mockRejectedValue(new Error("Storage unavailable."))}
      />,
    );

    await user.upload(
      screen.getByLabelText("Choose PDF files"),
      new File(["%PDF-1.7\none"], "one.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Upload 1 file" }));

    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Storage unavailable.");
    expect(
      screen.getByRole("button", { name: "Upload 1 file" }),
    ).toBeEnabled();
  });

  it("attaches file-size validation feedback to the rejected PDF", async () => {
    const user = userEvent.setup();
    render(
      <UploadDeck
        limits={{ maxFiles: 10, maxFileSizeBytes: 5 }}
        uploadFile={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Choose PDF files"),
      new File(["%PDF-1.7"], "oversized.pdf", { type: "application/pdf" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "oversized.pdf is larger than",
    );
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resolve file issues" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps focus on the action when valid files finish beside an invalid file", async () => {
    const user = userEvent.setup();
    render(
      <UploadDeck
        limits={{ maxFiles: 10, maxFileSizeBytes: 10 }}
        uploadFile={vi.fn().mockResolvedValue({
          id: "document-id",
          fileName: "valid.pdf",
          status: "uploaded",
          progressPercentage: 0,
          errorMessage: null,
        })}
      />,
    );

    await user.upload(screen.getByLabelText("Choose PDF files"), [
      new File(["%PDF-"], "valid.pdf", { type: "application/pdf" }),
      new File(["%PDF-123456"], "oversized.pdf", {
        type: "application/pdf",
      }),
    ]);
    await user.click(screen.getByRole("button", { name: "Upload 1 file" }));

    const resolveIssues = await screen.findByRole("button", {
      name: "Resolve file issues",
    });
    expect(resolveIssues).toHaveAttribute("aria-disabled", "true");
    expect(resolveIssues).toHaveFocus();
  });

  it("validates the PDF signature before starting the request", async () => {
    const user = userEvent.setup();
    const uploadFile = vi.fn();
    render(
      <UploadDeck
        limits={{ maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 }}
        uploadFile={uploadFile}
      />,
    );

    await user.upload(
      screen.getByLabelText("Choose PDF files"),
      new File(["not a PDF"], "renamed.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Upload 1 file" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "renamed.pdf does not contain PDF data.",
    );
    expect(uploadFile).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Browse PDF files" }),
      ).toHaveFocus(),
    );
  });

  it("announces the persisted status returned by an idempotent retry", async () => {
    const user = userEvent.setup();
    render(
      <UploadDeck
        limits={{ maxFiles: 10, maxFileSizeBytes: 5 * 1024 * 1024 }}
        uploadFile={vi.fn().mockResolvedValue({
          id: "document-id",
          fileName: "existing.pdf",
          status: "complete",
          progressPercentage: 100,
          errorMessage: null,
        })}
      />,
    );

    await user.upload(
      screen.getByLabelText("Choose PDF files"),
      new File(["%PDF-1.7"], "existing.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Upload 1 file" }));

    expect(
      await screen.findByRole("status", {
        name: "existing.pdf status: Complete",
      }),
    ).toBeInTheDocument();
  });
});
