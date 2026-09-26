// Personal collection (DEC-001: one collection per user). Every query is scoped by userId from the session.
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { collectionItems, movies, ratings } from "@/db/schema";
import * as tmdb from "./tmdb";
import { ensureMovie } from "./movies";
import { writeAudit } from "./audit";
import { notFound } from "./errors";

export async function listCollection(db: Db, userId: string) {
  return db.select({
    tmdbId: movies.tmdbId, title: movies.title, releaseDate: movies.releaseDate,
    posterPath: movies.posterPath, addedAt: collectionItems.addedAt, myRating: ratings.ratingValue,
  })
    .from(collectionItems)
    .innerJoin(movies, eq(movies.movieId, collectionItems.movieId))
    .leftJoin(ratings, and(eq(ratings.movieId, movies.movieId), eq(ratings.userId, userId)))
    .where(eq(collectionItems.userId, userId))
    .orderBy(desc(collectionItems.addedAt));
}

/** Idempotent add: adding twice is not an error and does not create a duplicate or a second audit row. */
export async function addToCollection(db: Db, userId: string, tmdbId: number) {
  const details = await tmdb.getMovie(tmdbId); // validates the id exists upstream (outside the transaction)
  return db.transaction(async (tx) => {
    const movieId = await ensureMovie(tx, details);
    const inserted = await tx.insert(collectionItems).values({ userId, movieId })
      .onConflictDoNothing().returning({ movieId: collectionItems.movieId });
    if (inserted.length > 0) {
      await writeAudit(tx, {
        userId, action: "collection.add", resourceType: "movie", resourceId: String(tmdbId),
        details: { title: details.title },
      });
    }
    return { added: inserted.length > 0 };
  });
}

export async function removeFromCollection(db: Db, userId: string, tmdbId: number) {
  return db.transaction(async (tx) => {
    const [movie] = await tx.select({ movieId: movies.movieId, title: movies.title })
      .from(movies).where(eq(movies.tmdbId, tmdbId));
    if (!movie) throw notFound("Movie in your collection");
    const deleted = await tx.delete(collectionItems)
      .where(and(eq(collectionItems.userId, userId), eq(collectionItems.movieId, movie.movieId)))
      .returning({ movieId: collectionItems.movieId });
    if (deleted.length === 0) throw notFound("Movie in your collection");
    await writeAudit(tx, {
      userId, action: "collection.remove", resourceType: "movie", resourceId: String(tmdbId),
      details: { title: movie.title },
    });
  });
}
