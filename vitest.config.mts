import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

/** Unit tests: pure code, no database. */
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "src/**/*.integration.test.ts"],
  },
});
