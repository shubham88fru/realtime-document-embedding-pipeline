// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Notice } from "./notice";

describe("Notice", () => {
  it("announces an error without relying on color alone", () => {
    render(
      <Notice
        title="Upload failed"
        description="The PDF could not be stored."
        variant="error"
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Upload failed");
    expect(alert).toHaveTextContent("The PDF could not be stored.");
  });
});
