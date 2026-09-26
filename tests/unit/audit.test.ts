import { describe, expect, it } from "vitest";
import { requestMeta, sanitizeDetails } from "../../src/server/audit";

describe("audit helpers", () => {
  it("never lets secrets or emails into details", () => {
    expect(sanitizeDetails({
      ip: "1.2.3.4", password: "x", passwordHash: "x", token: "x", sessionToken: "x",
      apiKey: "x", cookie: "x", email: "a@b.c", reason: "invalid_credentials",
    })).toEqual({ ip: "1.2.3.4", reason: "invalid_credentials" });
  });
  it("reads the first forwarded IP and truncates the user agent", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "a".repeat(500) });
    const m = requestMeta(h);
    expect(m.ip).toBe("203.0.113.7");
    expect(m.userAgent).toHaveLength(300);
  });
});
