import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ quiet: true }); // load .env for local use; CI provides real env vars

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    // drizzle-kit (generate/migrate) targets the DEVELOPMENT database only.
    // Tests migrate their own database in tests/setup/global-setup.ts.
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
