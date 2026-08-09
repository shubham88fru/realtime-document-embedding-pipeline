import { defineConfig } from "vitest/config";

import { loadEnvFiles } from "./scripts/load-env-files";

loadEnvFiles();

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Integration tests truncate every table " +
      "between cases, so they refuse to run against an unnamed database. " +
      "See the database section of README.md.",
  );
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.integration.test.ts"],
    globalSetup: ["./vitest.integration.setup.ts"],
    env: {
      // Point the application's config at the test database rather than the one
      // `npm run dev` uses. Doing it here means no test has to remember to.
      DATABASE_URL: testDatabaseUrl,
      APP_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      AUTH_SECRET: "test-auth-secret-with-at-least-32-characters",
      AUTH_GOOGLE_ID: "google-client-id",
      AUTH_GOOGLE_SECRET: "google-client-secret",
      AWS_REGION: "us-east-1",
      S3_BUCKET_NAME: "document-embedding-pipeline-test",
      S3_ENDPOINT: "http://localhost:9000",
      S3_FORCE_PATH_STYLE: "true",
      AWS_ACCESS_KEY_ID: "depminio",
      AWS_SECRET_ACCESS_KEY: "dep_local_storage",
    },
    // Every file shares one database and truncates between cases, so running
    // files in parallel would have them deleting each other's rows.
    fileParallelism: false,
    // A hung connection should fail rather than sit at the default timeout.
    testTimeout: 20_000,
  },
});
