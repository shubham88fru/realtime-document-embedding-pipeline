import { afterEach } from "vitest";

// The suite runs under the node environment by default, where the DOM helpers
// are neither available nor meaningful. Files that opt into jsdom with a
// `// @vitest-environment jsdom` docblock get the matchers and auto-cleanup.
if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");

  afterEach(() => {
    cleanup();
  });
}
