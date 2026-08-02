import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Node by default: jsdom defines a global `window`, which trips the browser
    // guard in serverEnv() and would make every service-layer test fail for the
    // wrong reason. Component tests opt in with a `// @vitest-environment jsdom`
    // docblock at the top of the file.
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
  },
});
