import { z } from "zod";

/**
 * Deployment environment. Kept separate from NODE_ENV because Next.js only
 * recognises development/test/production, and this system also deploys to
 * staging.
 */
export const APP_ENVS = ["development", "staging", "production"] as const;

export type AppEnv = (typeof APP_ENVS)[number];

const BYTES_PER_MB = 1024 * 1024;

const DEFAULT_MAX_UPLOAD_FILES = 10;
const DEFAULT_MAX_FILE_SIZE_MB = 5;
const DEFAULT_MAX_PROCESSING_CONCURRENCY = 10;

/**
 * `z.url()` accepts "localhost:3000" because the WHATWG parser reads it as the
 * "localhost:" protocol, so the scheme has to be checked explicitly.
 */
function hasScheme(value: string, schemes: readonly string[]): boolean {
  try {
    return schemes.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isAbsoluteHttpUrl(value: string): boolean {
  return hasScheme(value, ["http:", "https:"]);
}

/**
 * Environment variables arrive as strings, so `z.coerce.number()` would quietly
 * turn "lots" into NaN and "" into 0. Digits are matched before converting.
 */
function positiveInteger(defaultValue: number) {
  return z
    .string()
    .default(String(defaultValue))
    .refine((value) => /^\d+$/.test(value), {
      message: "must be a whole number",
    })
    .transform(Number)
    .refine((value) => value > 0, { message: "must be greater than zero" });
}

/**
 * Postgres connection strings use either scheme interchangeably; anything else
 * means the wrong engine, which Prisma would only complain about at connect
 * time.
 */
function isPostgresConnectionString(value: string): boolean {
  return hasScheme(value, ["postgres:", "postgresql:"]);
}

const serverEnvSchema = z.object({
  APP_ENV: z.enum(APP_ENVS),
  NEXT_PUBLIC_APP_URL: z.string().refine(isAbsoluteHttpUrl, {
    message: "must be an absolute http(s) URL, e.g. http://localhost:3000",
  }),
  DATABASE_URL: z.string().refine(isPostgresConnectionString, {
    message:
      "must be a postgres:// or postgresql:// connection string, " +
      "e.g. postgresql://user:password@localhost:5432/dbname?schema=public",
  }),
  AUTH_SECRET: z.string().min(32, {
    message: "must be at least 32 characters; generate one with `npx auth secret`",
  }),
  AUTH_GOOGLE_ID: z.string().min(1, { message: "is required" }),
  AUTH_GOOGLE_SECRET: z.string().min(1, { message: "is required" }),
  MAX_UPLOAD_FILES: positiveInteger(DEFAULT_MAX_UPLOAD_FILES),
  MAX_FILE_SIZE_MB: positiveInteger(DEFAULT_MAX_FILE_SIZE_MB),
  MAX_PROCESSING_CONCURRENCY: positiveInteger(
    DEFAULT_MAX_PROCESSING_CONCURRENCY,
  ),
});

export type PipelineLimits = {
  maxUploadFiles: number;
  maxFileSizeBytes: number;
  maxProcessingConcurrency: number;
};

/**
 * The subset that is safe to ship to the browser. Only NEXT_PUBLIC_ variables
 * are inlined by Next.js at build time, so nothing else may appear here.
 */
const clientEnvSchema = serverEnvSchema.pick({ NEXT_PUBLIC_APP_URL: true });

export type ClientEnv = {
  publicAppUrl: string;
};

export type ServerEnv = {
  appEnv: AppEnv;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  publicAppUrl: string;
  databaseUrl: string;
  auth: {
    secret: string;
    googleClientId: string;
    googleClientSecret: string;
  };
  limits: PipelineLimits;
};

export class EnvValidationError extends Error {
  constructor(issues: string[]) {
    super(
      `Invalid environment configuration:\n${issues
        .map((issue) => `  - ${issue}`)
        .join("\n")}\n\nSee .env.example for the expected variables.`,
    );
    this.name = "EnvValidationError";
  }
}

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);

  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
  }

  const parsed = result.data;

  return {
    appEnv: parsed.APP_ENV,
    isDevelopment: parsed.APP_ENV === "development",
    isStaging: parsed.APP_ENV === "staging",
    isProduction: parsed.APP_ENV === "production",
    publicAppUrl: parsed.NEXT_PUBLIC_APP_URL,
    databaseUrl: parsed.DATABASE_URL,
    auth: {
      secret: parsed.AUTH_SECRET,
      googleClientId: parsed.AUTH_GOOGLE_ID,
      googleClientSecret: parsed.AUTH_GOOGLE_SECRET,
    },
    limits: {
      maxUploadFiles: parsed.MAX_UPLOAD_FILES,
      maxFileSizeBytes: parsed.MAX_FILE_SIZE_MB * BYTES_PER_MB,
      maxProcessingConcurrency: parsed.MAX_PROCESSING_CONCURRENCY,
    },
  };
}

export function parseClientEnv(
  source: Record<string, string | undefined>,
): ClientEnv {
  const result = clientEnvSchema.safeParse(source);

  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
  }

  return { publicAppUrl: result.data.NEXT_PUBLIC_APP_URL };
}

type ReadServerEnvOptions = {
  source?: Record<string, string | undefined>;
  isBrowser?: boolean;
};

/**
 * Reads and validates the server configuration. Guarded so a stray import from
 * a client component fails loudly in development instead of bundling secrets
 * into the browser payload.
 */
export function readServerEnv({
  source = process.env,
  isBrowser = typeof window !== "undefined",
}: ReadServerEnvOptions = {}): ServerEnv {
  if (isBrowser) {
    throw new Error(
      "readServerEnv() was called in the browser. Server configuration must " +
        "not reach the client bundle — use clientEnv() instead.",
    );
  }

  return parseServerEnv(source);
}

let cachedServerEnv: ServerEnv | undefined;

/**
 * Memoised accessor for application code. Validation runs once per process.
 */
export function serverEnv(): ServerEnv {
  cachedServerEnv ??= readServerEnv();
  return cachedServerEnv;
}

export function clientEnv(): ClientEnv {
  // Next.js inlines NEXT_PUBLIC_ variables at build time, so this property must
  // be referenced statically rather than looked up dynamically.
  return parseClientEnv({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}
