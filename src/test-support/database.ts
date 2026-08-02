import type { DatabaseClient } from "@/lib/db";

/**
 * Tables in dependency order. Truncating the parents cascades, but naming every
 * table means a test that leaves rows behind in a table added later still gets
 * a clean slate rather than a mystifying constraint failure.
 */
const TABLES = ["embeddings", "documents", "users"] as const;

/**
 * Empty the database between test cases.
 *
 * TRUNCATE rather than DELETE: it is a single statement regardless of row
 * count, and RESTART IDENTITY resets any sequences a future table might add.
 */
export async function resetDatabase(client: DatabaseClient): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await client.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

/** A vector of the dimension the schema declares, filled with `value`. */
export function vectorOfDimension(dimension: number, value = 0.1): number[] {
  return Array.from({ length: dimension }, () => value);
}

/** Render a vector in the text form pgvector accepts. */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
