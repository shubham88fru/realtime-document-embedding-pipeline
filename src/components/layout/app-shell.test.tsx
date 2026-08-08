// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("provides product identity, status, account controls, and main content", () => {
    render(
      <AppShell
        status={<span>Protected workspace</span>}
        userControls={<button type="button">Account</button>}
      >
        <h1>Your documents</h1>
      </AppShell>,
    );

    const banner = screen.getByRole("banner");
    expect(
      within(banner).getByRole("link", {
        name: "Document Embedding Pipeline",
      }),
    ).toHaveAttribute("href", "/");
    expect(within(banner).getByText("Protected workspace")).toBeInTheDocument();
    expect(
      within(banner).getByRole("button", { name: "Account" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Your documents");
  });
});
