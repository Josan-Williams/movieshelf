import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "node:path";

config({ quiet: true });

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    globalSetup: ["./tests/setup/global-setup.ts"],
    fileParallelism: false, // test files share one database
    coverage: { provider: "v8", include: ["src/**"] },
  },
});
