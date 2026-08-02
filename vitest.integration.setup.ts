import { execFileSync } from "node:child_process";

import { loadEnvFiles } from "./scripts/load-env-files";

/**
 * Rebuild the test database from the migration files before any test runs.
 *
 * Dropping the schema and replaying the migrations means each run proves the
 * migrations apply to an empty database — the thing that actually happens on a
 * fresh deploy. `migrate deploy` against an already-migrated database is a
 * no-op and would prove nothing. `migrate reset` would do both steps, but in
 * Prisma 7 it also runs the seed, which these tests neither need nor should
 * depend on.
 */
export default function setup() {
  loadEnvFiles();

  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. See the database section of README.md.",
    );
  }

  // This drops every table. Refusing to run against the development database is
  // the difference between a test run and an afternoon of lost work.
  if (databaseUrl === process.env.DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL and DATABASE_URL point at the same database. " +
        "Integration tests drop and recreate the schema, so they need their own.",
    );
  }

  const env = { ...process.env, DATABASE_URL: databaseUrl };

  execFileSync("npx", ["prisma", "db", "execute", "--stdin"], {
    env,
    input: "DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
    stdio: ["pipe", "inherit", "inherit"],
  });

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env,
    stdio: "inherit",
  });
}
