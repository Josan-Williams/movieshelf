import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "node:path";

config({ quiet: true });

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"], // e2e runs in Playwright
    globalSetup: ["./tests/setup/global-setup.ts"],
    fileParallelism: false, // test files share one database
    env: {
      // Tests never use the dev database: route modules get the test DB via vi.mock.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "test-only-secret-not-used-anywhere-else-0123456789",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/app/**/page.tsx", "src/app/**/layout.tsx", "src/components/**", "src/lib/auth-client.ts"],
      reporter: ["text", "html", "json-summary"],
    },
  },
});
