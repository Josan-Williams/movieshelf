// Authentication events are written to the audit log (DEC-005), through Better Auth's real handler.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db as testDb, pool, resetDb } from "../helpers/db";
import { auditLogs } from "../../src/db/schema";

vi.mock("../../src/db", () => ({ db: testDb }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined, set: () => {} }) }));
import { auth } from "../../src/lib/auth";

const BASE = "http://localhost:3000/api/auth";
const post = (path: string, body: object, cookie?: string) =>
  auth.handler(new Request(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": "198.51.100.4", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  }));
const logs = () => testDb.select().from(auditLogs).orderBy(auditLogs.auditId);

beforeEach(resetDb);
afterAll(() => pool.end());

describe("auth audit events", () => {
  it("records sign-up, failed sign-in, sign-in and sign-out", async () => {
    const creds = { email: "carol@example.com", password: "long-enough-9" };
    expect((await post("/sign-up/email", { name: "Carol", ...creds })).status).toBe(200);
    expect((await post("/sign-in/email", { ...creds, password: "wrong-password-1" })).status).toBe(401);
    const signIn = await post("/sign-in/email", creds);
    expect(signIn.status).toBe(200);
    const cookie = signIn.headers.get("set-cookie")!.split(";")[0];
    expect((await post("/sign-out", {}, cookie)).status).toBe(200);

    const rows = await logs();
    expect(rows.map((r) => r.action)).toEqual(["auth.sign_up", "auth.sign_in_failed", "auth.sign_in", "auth.sign_out"]);
    const failed = rows[1];
    expect(failed.userId).toBeNull();
    expect(failed.details).toEqual({ ip: "198.51.100.4", userAgent: null, reason: "invalid_credentials" });
    expect(JSON.stringify(rows)).not.toContain("carol@example.com");
    expect(JSON.stringify(rows)).not.toContain("long-enough-9");
  });

  it("does not audit a sign-out without a session", async () => {
    await post("/sign-out", {});
    expect(await logs()).toHaveLength(0);
  });
});
