import { Auth } from "@auth/core";
import Credentials from "@auth/core/providers/credentials";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { authConfig } from "@/auth.config";
import {
  authSessionCallbacks,
  authorizeGoogleSignIn,
} from "@/auth.callbacks";
import { db } from "@/lib/db";
import { syncGoogleProfile } from "@/services/users";
import { resetDatabase } from "@/test-support/database";

const client = db();
const origin = "https://auth.test";
const secret = "integration-auth-secret-with-at-least-32-characters";

const testAuthConfig = {
  ...authConfig,
  basePath: "/api/auth",
  secret,
  providers: [
    Credentials({
      credentials: {},
      async authorize() {
        const user = await syncGoogleProfile({
          subject: "google-subject-123",
          email: "reader@example.com",
          name: "Test Reader",
          photoUrl: "https://example.com/reader.png",
        });

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: authSessionCallbacks,
};

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

beforeEach(async () => {
  await resetDatabase(client);
});

afterAll(async () => {
  await client.$disconnect();
});

describe("authentication flow", () => {
  it("accepts a verified Google profile and projects the application user ID", async () => {
    const providerUser = {
      id: "google-provider-id",
      email: "reader@example.com",
      name: "Test Reader",
      image: "https://example.com/reader.png",
    };

    const accepted = await authorizeGoogleSignIn({
      account: {
        provider: "google",
      },
      profile: {
        sub: "google-subject-123",
        email_verified: true,
      },
      user: providerUser,
    });
    const storedUser = await client.user.findUniqueOrThrow({
      where: { googleSubject: "google-subject-123" },
    });

    expect(accepted).toBe(true);
    expect(providerUser.id).toBe(storedUser.id);
  });

  it("persists a signed-in user and restores the application identity from the session cookie", async () => {
    const csrfResponse = await Auth(
      new Request(`${origin}/api/auth/csrf`),
      testAuthConfig,
    );
    const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
    const csrfCookie = cookieHeader(csrfResponse);

    const signInResponse = await Auth(
      new Request(`${origin}/api/auth/callback/credentials`, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: csrfCookie,
        },
        body: new URLSearchParams({ csrfToken }),
      }),
      testAuthConfig,
    );
    const sessionCookie = cookieHeader(signInResponse);

    const sessionResponse = await Auth(
      new Request(`${origin}/api/auth/session`, {
        headers: { cookie: sessionCookie },
      }),
      testAuthConfig,
    );
    const session = await sessionResponse.json();
    const storedUser = await client.user.findUniqueOrThrow({
      where: { googleSubject: "google-subject-123" },
    });

    expect(session).toMatchObject({
      user: {
        id: storedUser.id,
        email: "reader@example.com",
        name: "Test Reader",
      },
    });
    expect(sessionCookie).toMatch(/authjs\.session-token=/);
    expect(cookieHeader(sessionResponse)).toMatch(/authjs\.session-token=/);

    const signOutResponse = await Auth(
      new Request(`${origin}/api/auth/signout`, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: `${csrfCookie}; ${sessionCookie}`,
        },
        body: new URLSearchParams({ csrfToken }),
      }),
      testAuthConfig,
    );

    expect(signOutResponse.headers.getSetCookie().join("\n")).toMatch(
      /authjs\.session-token=;.*Max-Age=0/i,
    );
  });
});
