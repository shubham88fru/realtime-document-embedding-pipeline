import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "./env";

/**
 * Spare connections above the processing concurrency. The pipeline can hold one
 * connection per document it is processing; without headroom a full pipeline
 * would starve page loads and API routes of connections entirely.
 */
export const POOL_HEADROOM = 5;

/** Floor for the pool, so a serial pipeline still has room to serve requests. */
export function poolSizeFor(maxProcessingConcurrency: number): number {
  return maxProcessingConcurrency + POOL_HEADROOM;
}

export type DatabaseClient = PrismaClient;

/**
 * Width of the vectors stored in `embeddings.vector`, fixed by the embedding
 * model named in the spec (OpenAI text-embedding-3-small). The column type in
 * prisma/schema.prisma declares the same number; changing one without the other
 * needs a migration, so keep this constant as the reference the code reads.
 */
export const EMBEDDING_DIMENSIONS = 1536;

export interface CreateDatabaseClientOptions {
  connectionString: string;
  maxConnections: number;
  logQueries?: boolean;
}

export function createDatabaseClient({
  connectionString,
  maxConnections,
  logQueries = false,
}: CreateDatabaseClientOptions): DatabaseClient {
  const adapter = new PrismaPg({
    connectionString,
    max: maxConnections,
    // A connection idle this long is almost certainly a burst that has passed.
    idleTimeoutMillis: 30_000,
    // Fail fast rather than letting a request hang on an exhausted pool.
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({
    adapter,
    log: logQueries ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

/**
 * Next.js re-evaluates modules on every edit in development. Without a cache
 * that outlives the module, each save would open a new pool and the old one
 * would linger, until Postgres refuses further connections. Production runs a
 * fresh process, so caching there would only mask leaks.
 */
const globalForDatabase = globalThis as typeof globalThis & {
  __documentPipelinePrisma?: DatabaseClient;
};

let client: DatabaseClient | undefined;

export function db(): DatabaseClient {
  const cached = client ?? globalForDatabase.__documentPipelinePrisma;
  if (cached) {
    client = cached;
    return cached;
  }

  const env = serverEnv();

  const created = createDatabaseClient({
    connectionString: env.databaseUrl,
    maxConnections: poolSizeFor(env.limits.maxProcessingConcurrency),
    logQueries: env.isDevelopment,
  });

  client = created;
  if (!env.isProduction) {
    globalForDatabase.__documentPipelinePrisma = created;
  }

  return created;
}
