/**
 * Next.js calls this once per server process, before any request is handled.
 * Validating configuration here is what makes the promise in the README true:
 * a misconfigured deployment fails to boot rather than starting up healthy and
 * then failing every request, which would sail past a container health check.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { serverEnv } = await import("@/lib/env");

  try {
    serverEnv();
  } catch (error) {
    // Next.js catches errors thrown from this hook and carries on serving, so
    // an invalid configuration would leave the process up and returning 500s —
    // green to a health check while every request fails. Exit instead, so a bad
    // rollout fails visibly.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
