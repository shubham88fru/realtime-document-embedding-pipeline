import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CONNECTION_STRING =
  "postgresql://dep:dep_local_dev@localhost:5432/document_embedding_pipeline?schema=public";

/**
 * The singleton caches on `globalThis` in development. Each test needs a clean
 * slate, otherwise the first test to construct a client would satisfy every
 * assertion that follows.
 */
function clearGlobalCache() {
  delete (globalThis as { __documentPipelinePrisma?: unknown })
    .__documentPipelinePrisma;
}

beforeEach(() => {
  vi.resetModules();
  clearGlobalCache();
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", CONNECTION_STRING);
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-with-at-least-32-characters");
  vi.stubEnv("AUTH_GOOGLE_ID", "google-client-id");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "google-client-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  clearGlobalCache();
});

describe("poolSizeFor", () => {
  it("leaves headroom above the processing concurrency", async () => {
    const { poolSizeFor, POOL_HEADROOM } = await import("./db");

    expect(poolSizeFor(10)).toBe(10 + POOL_HEADROOM);
    expect(POOL_HEADROOM).toBeGreaterThan(0);
  });

  it("always exceeds the concurrency, so a saturated pipeline still serves requests", async () => {
    const { poolSizeFor } = await import("./db");

    for (const concurrency of [1, 10, 50]) {
      expect(poolSizeFor(concurrency)).toBeGreaterThan(concurrency);
    }
  });
});

describe("db", () => {
  it("returns the same client on repeated calls", async () => {
    const { db } = await import("./db");

    expect(db()).toBe(db());
  });

  it("survives module re-evaluation in development", async () => {
    const first = (await import("./db")).db();

    vi.resetModules();
    const second = (await import("./db")).db();

    expect(second).toBe(first);
  });

  it("does not leak a client onto globalThis in production", async () => {
    vi.stubEnv("APP_ENV", "production");

    const { db } = await import("./db");
    db();

    expect(
      (globalThis as { __documentPipelinePrisma?: unknown })
        .__documentPipelinePrisma,
    ).toBeUndefined();
  });

  it("fails with the aggregate config error when DATABASE_URL is absent", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const { db } = await import("./db");

    expect(() => db()).toThrowError(/DATABASE_URL/);
  });
});
