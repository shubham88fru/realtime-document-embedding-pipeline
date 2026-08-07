/**
 * Next.js calls this once per server process, before any request is handled.
 * Validating configuration here is what makes the promise in the README true:
 * a misconfigured deployment fails to boot rather than starting up healthy and
 * then failing every request, which would sail past a container health check.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateNodeServerEnv } = await import("./instrumentation.node");
  validateNodeServerEnv();
}
