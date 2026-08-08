import { serverEnv } from "@/lib/env";

export function validateNodeServerEnv() {
  try {
    serverEnv();
  } catch (error) {
    // Next.js catches errors thrown from register() and carries on serving. Exit
    // instead so a misconfigured rollout fails its process health check.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
