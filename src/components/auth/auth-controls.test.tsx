// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthControls } from "./auth-controls";

describe("AuthControls", () => {
  it("offers Google sign-in to an anonymous user", () => {
    render(
      <AuthControls
        user={null}
        signInAction={vi.fn()}
        signOutAction={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });

  it("shows the current user and a sign-out action", () => {
    render(
      <AuthControls
        user={{
          name: "Ada Lovelace",
          email: "ada@example.com",
          image: "https://example.com/ada.png",
        }}
        signInAction={vi.fn()}
        signOutAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).not.toBeInTheDocument();
  });
});
