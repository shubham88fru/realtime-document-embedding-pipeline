// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { describe, expect, it } from "vitest";

import { EmptyState, LoadingState } from "./empty-state";

describe("EmptyState", () => {
  it("describes an empty collection through a named region", () => {
    render(
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Uploaded PDFs will appear here."
      />,
    );

    expect(
      screen.getByRole("region", { name: "No documents yet" }),
    ).toHaveTextContent("Uploaded PDFs will appear here.");
  });
});

describe("LoadingState", () => {
  it("announces that content is loading", () => {
    render(<LoadingState label="Loading documents" />);

    expect(
      screen.getByRole("status", { name: "Loading documents" }),
    ).toHaveAttribute("aria-busy", "true");
  });
});
