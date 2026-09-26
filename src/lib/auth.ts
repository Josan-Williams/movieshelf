// Better Auth server configuration (DEC-004: email + password; DEC-005: audit policy).
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { db } from "@/db";
import { user, session, account, verification } from "@/db/auth-schema";
import { requestMeta, writeAuditBestEffort } from "@/server/audit";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: false, // out of scope (DEC-004)
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  hooks: {
    // Sign-out: the session is deleted before "after" hooks run, so capture the user here.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-out") return;
      const current = await getSessionFromCtx(ctx);
      if (!current) return; // no session -> nothing to attribute, no audit row
      await writeAuditBestEffort(db, {
        userId: current.user.id,
        action: "auth.sign_out",
        resourceType: "session",
        details: requestMeta(ctx.headers),
      });
    }),
    after: createAuthMiddleware(async (ctx) => {
      const meta = requestMeta(ctx.headers);
      const returned = ctx.context.returned;
      const failed = returned instanceof APIError;

      if (ctx.path === "/sign-up/email" && !failed && ctx.context.newSession) {
        await writeAuditBestEffort(db, {
          userId: ctx.context.newSession.user.id,
          action: "auth.sign_up",
          resourceType: "user",
          resourceId: ctx.context.newSession.user.id,
          details: meta,
        });
      }

      if (ctx.path === "/sign-in/email") {
        if (failed) {
          // DEC-005: no tried email, generic reason code only.
          await writeAuditBestEffort(db, {
            userId: null,
            action: "auth.sign_in_failed",
            resourceType: "session",
            details: { ...meta, reason: "invalid_credentials" },
          });
        } else if (ctx.context.newSession) {
          await writeAuditBestEffort(db, {
            userId: ctx.context.newSession.user.id,
            action: "auth.sign_in",
            resourceType: "session",
            details: meta,
          });
        }
      }
    }),
  },
  plugins: [nextCookies()], // must stay last
});
