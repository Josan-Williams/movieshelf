// Business rules against the real test database. TMDB is mocked (brief: mock external services).
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool, resetDb } from "../helpers/db";
import { movieDetails } from "../helpers/fixtures";
import { user, auditLogs, ratings, collectionItems } from "../../src/db/schema";

vi.mock("../../src/server/tmdb", async (orig) => ({
  ...(await orig<typeof import("../../src/server/tmdb")>()),
  getMovie: vi.fn(),
}));
import * as tmdb from "../../src/server/tmdb";
import { addToCollection, listCollection, removeFromCollection } from "../../src/server/collection";
import { rateMovie } from "../../src/server/ratings";
import { listActivity } from "../../src/server/activity";
import { AppError } from "../../src/server/errors";

const getMovie = vi.mocked(tmdb.getMovie);

beforeEach(async () => {
  await resetDb();
  getMovie.mockReset();
  getMovie.mockImplementation(async (id: number) => movieDetails(id, `Movie ${id}`));
  await db.insert(user).values([
    { id: "alice", name: "Alice", email: "alice@example.com" },
    { id: "bob", name: "Bob", email: "bob@example.com" },
  ]);
});
afterAll(() => pool.end());

const auditActions = async (userId: string) =>
  (await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(auditLogs.auditId)).map((a) => a.action);

describe("collection", () => {
  it("adds a movie once, even when added twice, with one audit row", async () => {
    expect(await addToCollection(db, "alice", 27205)).toEqual({ added: true });
    expect(await addToCollection(db, "alice", 27205)).toEqual({ added: false });
    expect(await db.select().from(collectionItems)).toHaveLength(1);
    expect(await auditActions("alice")).toEqual(["collection.add"]);
  });

  it("removes a movie and audits it; removing again is 404", async () => {
    await addToCollection(db, "alice", 27205);
    await removeFromCollection(db, "alice", 27205);
    expect(await listCollection(db, "alice")).toEqual([]);
    expect(await auditActions("alice")).toEqual(["collection.add", "collection.remove"]);
    await expect(removeFromCollection(db, "alice", 27205)).rejects.toMatchObject({ status: 404 });
  });

  it("isolates users: Bob cannot see or remove Alice's movie", async () => {
    await addToCollection(db, "alice", 27205);
    expect(await listCollection(db, "bob")).toEqual([]);
    await expect(removeFromCollection(db, "bob", 27205)).rejects.toMatchObject({ status: 404 });
    expect(await listCollection(db, "alice")).toHaveLength(1);
  });

  it("writes nothing when TMDB is unavailable", async () => {
    getMovie.mockRejectedValue(new AppError("upstream_unavailable", 503, "down"));
    await expect(addToCollection(db, "alice", 27205)).rejects.toMatchObject({ status: 503 });
    expect(await db.select().from(collectionItems)).toHaveLength(0);
    expect(await auditActions("alice")).toEqual([]);
  });
});

describe("ratings", () => {
  it("creates then updates one rating, auditing create then update", async () => {
    const first = await rateMovie(db, "alice", 27205, 7, null);
    const second = await rateMovie(db, "alice", 27205, 9, "Even better the second time.");
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    const rows = await db.select().from(ratings);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ratingValue: 9, review: "Even better the second time." });
    expect(await auditActions("alice")).toEqual(["rating.create", "rating.update"]);
  });

  it("concurrent first ratings still produce exactly one row (no race)", async () => {
    await Promise.all([rateMovie(db, "alice", 603, 5, null), rateMovie(db, "alice", 603, 6, null)]);
    expect(await db.select().from(ratings)).toHaveLength(1);
  });

  it("rolls back the audit row when the rating is invalid", async () => {
    await expect(rateMovie(db, "alice", 27205, 11, null)).rejects.toBeTruthy();
    expect(await db.select().from(ratings)).toHaveLength(0);
    expect(await auditActions("alice")).toEqual([]);
  });

  it("keeps ratings independent per user", async () => {
    await rateMovie(db, "alice", 27205, 8, null);
    await rateMovie(db, "bob", 27205, 3, null);
    expect(await db.select().from(ratings)).toHaveLength(2);
  });
});

describe("activity", () => {
  it("never returns IP address or user agent to the user", async () => {
    await db.insert(auditLogs).values({
      userId: "alice", action: "auth.sign_in", resourceType: "session",
      details: { ip: "203.0.113.9", userAgent: "Mozilla/5.0" },
    });
    const a = await listActivity(db, "alice", 1);
    expect(a.items[0].details).toEqual({});
    expect(JSON.stringify(a)).not.toContain("203.0.113.9");
    const [stored] = await db.select().from(auditLogs);
    expect(stored.details).toMatchObject({ ip: "203.0.113.9" }); // still kept for investigation
  });

  it("returns only the signed-in user's own events, newest first", async () => {
    await addToCollection(db, "alice", 1);
    await rateMovie(db, "alice", 1, 8, null);
    await addToCollection(db, "bob", 2);
    const a = await listActivity(db, "alice", 1);
    expect(a.total).toBe(2);
    expect(a.items.map((i) => i.action)).toEqual(["rating.create", "collection.add"]);
    expect(a.items[0].timestampUtc).toBeInstanceOf(Date);
  });
});
