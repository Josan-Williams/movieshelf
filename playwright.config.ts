// End-to-end tests: real browser, real Next.js production build, real Postgres (the TEST database),
// fake TMDB (scripts/mock-tmdb.mjs) and no AI key, so results are deterministic and free.
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ quiet: true });
const PORT = 3100; // not 3000, so it never collides with `npm run dev`
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    { command: "node scripts/mock-tmdb.mjs", port: 4010, reuseExistingServer: false },
    {
      command: `npx next start -p ${PORT}`,
      url: `${BASE_URL}/sign-in`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
        BETTER_AUTH_URL: BASE_URL,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "e2e-only-secret-0123456789-0123456789",
        TMDB_BASE_URL: "http://localhost:4010/3",
        TMDB_API_READ_TOKEN: "e2e-fake-token",
        AI_API_KEY: "",
      },
    },
  ],
});
