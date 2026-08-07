import { describe, expect, it } from "vitest";

import { isAuthorized } from "./auth.config";

describe("isAuthorized", () => {
  it("keeps auth routes public and protects application routes", () => {
    expect(isAuthorized(null, "/sign-in")).toBe(true);
    expect(isAuthorized(null, "/api/auth/callback/google")).toBe(true);
    expect(isAuthorized(null, "/")).toBe(false);

    expect(
      isAuthorized(
        {
          user: { id: "user-id", email: "reader@example.com" },
          expires: "2099-01-01T00:00:00.000Z",
        },
        "/",
      ),
    ).toBe(true);
  });
});
