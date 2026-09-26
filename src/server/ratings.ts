// One rating per user per movie, enforced by uq_ratings_user_movie. Atomic upsert (no check-then-insert race).
import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { ratings } from "@/db/schema";
import * as tmdb from "./tmdb";
import { ensureMovie } from "./movies";
import { writeAudit } from "./audit";

export async function rateMovie(db: Db, userId: string, tmdbId: number, value: number, review: string | null) {
  const details = await tmdb.getMovie(tmdbId);
  return db.transaction(async (tx) => {
    const movieId = await ensureMovie(tx, details);
    const [row] = await tx.insert(ratings)
      .values({ userId, movieId, ratingValue: value, review })
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.movieId],
        set: { ratingValue: value, review, updatedAt: sql`now()` },
      })
      // xmax = 0 means the row was freshly inserted, otherwise it was updated.
      .returning({ ratingId: ratings.ratingId, created: sql<boolean>`(xmax = 0)` });
    const created = row.created;
    await writeAudit(tx, {
      userId, action: created ? "rating.create" : "rating.update",
      resourceType: "rating", resourceId: String(row.ratingId),
      details: { tmdbId, value, hasReview: review !== null },
    });
    return { created, ratingId: row.ratingId, value, review };
  });
}
