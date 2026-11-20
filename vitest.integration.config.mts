import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Integration tests: services against a real Postgres (DATABASE_URL).
 * Each test makes its own users and groups, so they don't depend on the
 * seed or on each other. Files run one at a time to keep the database calm.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Next's guard against importing server code in the browser; not
      // needed (and it would throw) outside React Server Components.
      "server-only": fileURLToPath(
        new URL("./src/test/empty.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["dotenv/config"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
