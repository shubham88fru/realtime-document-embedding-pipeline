// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DOCUMENT_STATUSES } from "@/types/document";
import { DocumentStatusPill } from "./document-status-pill";

describe("DocumentStatusPill", () => {
  it("renders a human-readable label for every persisted status", () => {
    for (const status of DOCUMENT_STATUSES) {
      const { unmount } = render(<DocumentStatusPill status={status} />);

      expect(screen.getByText(new RegExp(status, "i"))).toBeInTheDocument();
      unmount();
    }
  });
});
