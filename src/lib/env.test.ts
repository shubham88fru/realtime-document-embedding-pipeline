import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clientEnv,
  parseClientEnv,
  parseServerEnv,
  readServerEnv,
  serverEnv,
} from "./env";

const validEnv = {
  APP_ENV: "development",
  NODE_ENV: "development",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  AUTH_SECRET: "test-auth-secret-with-at-least-32-characters",
  AUTH_GOOGLE_ID: "google-client-id",
  AUTH_GOOGLE_SECRET: "google-client-secret",
  AWS_REGION: "us-east-1",
  S3_BUCKET_NAME: "document-embedding-pipeline",
  DATABASE_URL: "postgresql://dep:secret@localhost:5432/dep?schema=public",
};

describe("parseServerEnv", () => {
  it("returns the parsed configuration for a valid environment", () => {
    const result = parseServerEnv(validEnv);

    expect(result.appEnv).toBe("development");
    expect(result.publicAppUrl).toBe("http://localhost:3000");
  });

  it("names every missing required variable, not just the first", () => {
    let message = "";
    try {
      parseServerEnv({ NODE_ENV: "development" });
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(/APP_ENV/);
    expect(message).toMatch(/NEXT_PUBLIC_APP_URL/);
    expect(message).toMatch(/DATABASE_URL/);
    expect(message).toMatch(/AUTH_SECRET/);
    expect(message).toMatch(/AUTH_GOOGLE_ID/);
    expect(message).toMatch(/AUTH_GOOGLE_SECRET/);
  });

  it("rejects an unrecognised APP_ENV rather than falling back silently", () => {
    expect(() => parseServerEnv({ ...validEnv, APP_ENV: "prod" })).toThrowError(
      /APP_ENV/,
    );
  });

  it("rejects a malformed app URL", () => {
    expect(() =>
      parseServerEnv({ ...validEnv, NEXT_PUBLIC_APP_URL: "localhost:3000" }),
    ).toThrowError(/NEXT_PUBLIC_APP_URL/);
  });

  describe("database", () => {
    it("exposes the connection string", () => {
      expect(parseServerEnv(validEnv).databaseUrl).toBe(
        "postgresql://dep:secret@localhost:5432/dep?schema=public",
      );
    });

    describe("object storage", () => {
      it("exposes the configured AWS region and S3 bucket", () => {
        expect(parseServerEnv(validEnv).storage).toEqual({
          region: "us-east-1",
          bucketName: "document-embedding-pipeline",
          forcePathStyle: false,
        });
      });

      it("supports a local endpoint without overriding the SDK credential chain", () => {
        expect(
          parseServerEnv({
            ...validEnv,
            S3_ENDPOINT: "http://localhost:9000",
            S3_FORCE_PATH_STYLE: "true",
            AWS_ACCESS_KEY_ID: "minioadmin",
            AWS_SECRET_ACCESS_KEY: "minio-secret",
          }).storage,
        ).toEqual({
          region: "us-east-1",
          bucketName: "document-embedding-pipeline",
          endpoint: "http://localhost:9000",
          forcePathStyle: true,
        });
      });
    });

    it("accepts both postgres:// and postgresql:// schemes", () => {
      const short = parseServerEnv({
        ...validEnv,
        DATABASE_URL: "postgres://dep:secret@localhost:5432/dep",
      });

      expect(short.databaseUrl).toBe(
        "postgres://dep:secret@localhost:5432/dep",
      );
    });

    it("rejects a connection string for a different database engine", () => {
      expect(() =>
        parseServerEnv({
          ...validEnv,
          DATABASE_URL: "mysql://dep:secret@localhost:3306/dep",
        }),
      ).toThrowError(/DATABASE_URL/);
    });

    it("rejects a value that is not a connection string at all", () => {
      expect(() =>
        parseServerEnv({ ...validEnv, DATABASE_URL: "localhost:5432" }),
      ).toThrowError(/DATABASE_URL/);
    });

    it("keeps the connection string out of the client configuration", () => {
      expect(parseClientEnv(validEnv)).not.toHaveProperty("databaseUrl");
    });
  });

  describe("deployment environment", () => {
    it("distinguishes development, staging and production", () => {
      const development = parseServerEnv({ ...validEnv, APP_ENV: "development" });
      expect(development.isDevelopment).toBe(true);
      expect(development.isStaging).toBe(false);
      expect(development.isProduction).toBe(false);

      const staging = parseServerEnv({ ...validEnv, APP_ENV: "staging" });
      expect(staging.isDevelopment).toBe(false);
      expect(staging.isStaging).toBe(true);
      expect(staging.isProduction).toBe(false);

      const production = parseServerEnv({ ...validEnv, APP_ENV: "production" });
      expect(production.isDevelopment).toBe(false);
      expect(production.isStaging).toBe(false);
      expect(production.isProduction).toBe(true);
    });
  });

  describe("pipeline limits", () => {
    it("applies the documented defaults when unset", () => {
      const result = parseServerEnv(validEnv);

      expect(result.limits.maxUploadFiles).toBe(10);
      expect(result.limits.maxFileSizeBytes).toBe(5 * 1024 * 1024);
      expect(result.limits.maxProcessingConcurrency).toBe(10);
    });

    it("coerces overrides from their string form", () => {
      const result = parseServerEnv({
        ...validEnv,
        MAX_UPLOAD_FILES: "3",
        MAX_FILE_SIZE_MB: "2",
        MAX_PROCESSING_CONCURRENCY: "4",
      });

      expect(result.limits.maxUploadFiles).toBe(3);
      expect(result.limits.maxFileSizeBytes).toBe(2 * 1024 * 1024);
      expect(result.limits.maxProcessingConcurrency).toBe(4);
    });

    it("rejects a non-numeric limit", () => {
      expect(() =>
        parseServerEnv({ ...validEnv, MAX_UPLOAD_FILES: "lots" }),
      ).toThrowError(/MAX_UPLOAD_FILES/);
    });

    it("rejects a limit that would stall the pipeline", () => {
      expect(() =>
        parseServerEnv({ ...validEnv, MAX_PROCESSING_CONCURRENCY: "0" }),
      ).toThrowError(/MAX_PROCESSING_CONCURRENCY/);
    });
  });
});

describe("server/client boundary", () => {
  const envWithSecret = {
    ...validEnv,
    INTERNAL_API_SECRET: "super-secret-value",
  };

  it("refuses to read server configuration in the browser", () => {
    expect(() =>
      readServerEnv({ source: envWithSecret, isBrowser: true }),
    ).toThrowError(/must not reach the client bundle/);
  });

  it("reads server configuration on the server", () => {
    const result = readServerEnv({ source: envWithSecret, isBrowser: false });

    expect(result.appEnv).toBe("development");
  });

  it("exposes only NEXT_PUBLIC_ values to the client", () => {
    expect(parseClientEnv(envWithSecret)).toEqual({
      publicAppUrl: "http://localhost:3000",
    });
  });
});

describe("serverEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads process.env and memoises the validated result", () => {
    vi.stubEnv("APP_ENV", "staging");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.example.com");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://dep:secret@db.internal:5432/dep?schema=public",
    );

    vi.stubEnv("AUTH_SECRET", "test-auth-secret-with-at-least-32-characters");
    vi.stubEnv("AUTH_GOOGLE_ID", "google-client-id");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "google-client-secret");
    vi.stubEnv("AWS_REGION", "us-east-1");
    vi.stubEnv("S3_BUCKET_NAME", "document-embedding-pipeline");

    const first = serverEnv();

    expect(first.appEnv).toBe("staging");
    expect(first.isStaging).toBe(true);
    expect(serverEnv()).toBe(first);
  });
});

describe("clientEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the public app URL from process.env", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");

    expect(clientEnv()).toEqual({ publicAppUrl: "https://app.example.com" });
  });

  it("rejects a missing public app URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(() => clientEnv()).toThrowError(/NEXT_PUBLIC_APP_URL/);
  });
});
