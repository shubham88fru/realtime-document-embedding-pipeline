import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { resetDatabase } from "@/test-support/database";
import { GoogleIdentityConflictError, syncGoogleProfile } from "./users";

const client = db();

beforeEach(async () => {
  await resetDatabase(client);
});

afterAll(async () => {
  await client.$disconnect();
});

describe("syncGoogleProfile", () => {
  it("creates one application user and refreshes it on later Google sign-ins", async () => {
    const first = await syncGoogleProfile({
      subject: "google-subject-123",
      email: "reader@example.com",
      name: "Original Name",
      photoUrl: "https://example.com/original.png",
    });

    const refreshed = await syncGoogleProfile({
      subject: "google-subject-123",
      email: "reader@example.com",
      name: "Updated Name",
      photoUrl: "https://example.com/updated.png",
    });

    expect(refreshed).toMatchObject({
      id: first.id,
      email: "reader@example.com",
      name: "Updated Name",
      photoUrl: "https://example.com/updated.png",
    });
    expect(await client.user.count()).toBe(1);
  });

  it("links a verified Google identity to an existing user with the same email", async () => {
    const existing = await client.user.create({
      data: {
        email: "reader@example.com",
        name: "Imported Reader",
      },
    });

    const linked = await syncGoogleProfile({
      subject: "google-subject-123",
      email: "reader@example.com",
      name: "Google Reader",
      photoUrl: "https://example.com/google.png",
    });

    expect(linked).toMatchObject({
      id: existing.id,
      googleSubject: "google-subject-123",
      name: "Google Reader",
    });
    expect(await client.user.count()).toBe(1);
  });

  it("never reassigns an email already linked to another Google identity", async () => {
    const original = await syncGoogleProfile({
      subject: "original-google-subject",
      email: "reader@example.com",
      name: "Original Reader",
      photoUrl: null,
    });

    await expect(
      syncGoogleProfile({
        subject: "attacker-google-subject",
        email: "reader@example.com",
        name: "Different Reader",
        photoUrl: null,
      }),
    ).rejects.toBeInstanceOf(GoogleIdentityConflictError);

    expect(await client.user.findUnique({ where: { id: original.id } })).toMatchObject({
      googleSubject: "original-google-subject",
      name: "Original Reader",
    });
  });

  it("converges concurrent first sign-ins on one user", async () => {
    const profile = {
      subject: "google-subject-123",
      email: "reader@example.com",
      name: "Concurrent Reader",
      photoUrl: null,
    };

    const users = await Promise.all([
      syncGoogleProfile(profile),
      syncGoogleProfile(profile),
    ]);

    expect(users[0].id).toBe(users[1].id);
    expect(await client.user.count()).toBe(1);
  });
});
