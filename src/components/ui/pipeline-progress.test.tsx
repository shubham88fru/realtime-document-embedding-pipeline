// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PipelineProgress } from "./pipeline-progress";

describe("PipelineProgress", () => {
  it("uses an indeterminate label when no real percentage is available", () => {
    render(<PipelineProgress label="Processing document" />);

    expect(
      screen.getByRole("progressbar", { name: "Processing document" }),
    ).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("exposes a real determinate percentage", () => {
    render(<PipelineProgress label="Processing document" value={42} />);

    expect(
      screen.getByRole("progressbar", { name: "Processing document" }),
    ).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByText("42%")).toBeInTheDocument();
  });
});
