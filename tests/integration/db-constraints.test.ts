// Integration tests: prove the DATABASE enforces MovieShelf's data rules,
// independent of any application code (see docs/evaluator-watchlist.md D-items).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db, pool, resetDb, expectPgError } from "../helpers/db";
import { user, movies, ratings, collectionItems, auditLogs } from "../../src/db/schema";

async function seedUserAndMovie() {
  await db.insert(user).values({ id: "u1", name: "Alice", email: "alice@example.com" });
  const [m] = await db.insert(movies)
    .values({ tmdbId: 27205, title: "Inception" }).returning();
  return { userId: "u1", movieId: m.movieId };
}

beforeEach(resetDb);
afterAll(() => pool.end());

describe("ratings", () => {
  it("rejects a second rating by the same user for the same movie", async () => {
    const { userId, movieId } = await seedUserAndMovie();
    await db.insert(ratings).values({ userId, movieId, ratingValue: 8 });
    await expectPgError(
      db.insert(ratings).values({ userId, movieId, ratingValue: 3 }),
      "23505", "uq_ratings_user_movie",
    );
    const rows = await db.select().from(ratings);
    expect(rows).toHaveLength(1);
    expect(rows[0].ratingValue).toBe(8);
  });

  it.each([0, 11, -1])("rejects rating value %i (must be 1-10)", async (value) => {
    const { userId, movieId } = await seedUserAndMovie();
    await expectPgError(
      db.insert(ratings).values({ userId, movieId, ratingValue: value }),
      "23514", "ck_ratings_value",
    );
  });

  it("upsert updates the existing rating instead of creating a second row", async () => {
    const { userId, movieId } = await seedUserAndMovie();
    const upsert = (value: number) => db.insert(ratings)
      .values({ userId, movieId, ratingValue: value })
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.movieId],
        set: { ratingValue: value, updatedAt: sql`now()` },
      })
      .returning({ createdAt: ratings.createdAt, updatedAt: ratings.updatedAt });

    const [first] = await upsert(7);
    const [second] = await upsert(9);

    expect(first.createdAt.getTime()).toBe(first.updatedAt.getTime());   // created
    expect(second.updatedAt.getTime()).toBeGreaterThan(second.createdAt.getTime()); // updated
    const rows = await db.select().from(ratings);
    expect(rows).toHaveLength(1);
    expect(rows[0].ratingValue).toBe(9);
  });
});

describe("collection_items", () => {
  it("rejects adding the same movie to a user's collection twice", async () => {
    const { userId, movieId } = await seedUserAndMovie();
    await db.insert(collectionItems).values({ userId, movieId });
    await expectPgError(
      db.insert(collectionItems).values({ userId, movieId }),
      "23505", "pk_collection_items",
    );
  });

  it("rejects a collection item for a movie that does not exist", async () => {
    const { userId } = await seedUserAndMovie();
    await expectPgError(db.insert(collectionItems).values({ userId, movieId: 99999 }), "23503");
  });
});

describe("movies", () => {
  it("rejects a duplicate tmdb_id", async () => {
    await seedUserAndMovie();
    await expectPgError(
      db.insert(movies).values({ tmdbId: 27205, title: "Inception (copy)" }),
      "23505", "uq_movies_tmdb_id",
    );
  });
});

describe("audit_logs", () => {
  it("rejects an action outside the allowed list", async () => {
    await expectPgError(
      // @ts-expect-error - deliberately invalid action to prove the DB check
      db.insert(auditLogs).values({ action: "rating.delete", resourceType: "rating" }),
      "23514", "ck_audit_logs_action",
    );
  });

  it("is append-only: UPDATE and DELETE are blocked", async () => {
    const { userId } = await seedUserAndMovie();
    await db.insert(auditLogs).values({ userId, action: "auth.sign_in", resourceType: "user" });
    await expectPgError(
      db.update(auditLogs).set({ action: "auth.sign_out" }).where(eq(auditLogs.userId, userId)),
      "42501",
    );
    await expectPgError(db.delete(auditLogs).where(eq(auditLogs.userId, userId)), "42501");
    expect(await db.select().from(auditLogs)).toHaveLength(1);
  });
});
