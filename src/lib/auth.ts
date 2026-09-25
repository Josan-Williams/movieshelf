// Better Auth server configuration (DEC-004: email + password).
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/auth-schema";

export const auth = betterAuth({
  // Read from env: BETTER_AUTH_SECRET (signing) and BETTER_AUTH_URL (base URL).
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,            // signed in straight after sign-up
    requireEmailVerification: false, // out of scope (DEC-004)
  },
  rateLimit: {
    enabled: true,               // also on in development so it can be demonstrated
    window: 60,                  // seconds
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  plugins: [nextCookies()],      // must be last: lets server actions set auth cookies
});
