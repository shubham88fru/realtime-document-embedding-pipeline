import { existsSync } from "node:fs";

/**
 * Next.js loads .env files for the application, but tooling that runs outside
 * it — the Prisma CLI, Vitest — does not. Both need the same view of the
 * environment as the app, or migrations get applied to a different database
 * than the one the application talks to.
 *
 * `process.loadEnvFile` does not overwrite variables that are already set, so
 * the first file listed wins and a real environment variable beats them all.
 * That matches the precedence Next.js applies.
 */
export function loadEnvFiles(files: string[] = [".env.local", ".env"]): void {
  for (const file of files) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
    }
  }
}
