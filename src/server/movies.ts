// Movie search + details, and storing a TMDB movie locally when a user acts on it.
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { movies, directors, genres, movieDirectors, movieGenres, collectionItems, ratings } from "@/db/schema";
import * as tmdb from "./tmdb";
import { AppError } from "./errors";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Exec = Db | Tx;

export type SearchInput = { director?: string; genreId?: number; page: number };

export async function searchMovies(input: SearchInput): Promise<tmdb.SearchPage & { director: tmdb.Person | null }> {
  if (!input.director && !input.genreId) {
    throw new AppError("validation_error", 422, "Enter a director, choose a genre, or both.");
  }
  if (input.director) {
    const person = await tmdb.findDirector(input.director);
    if (!person) return { page: 1, totalPages: 1, totalResults: 0, results: [], director: null };
    return { ...(await tmdb.moviesByDirector(person.tmdbPersonId, input.genreId, input.page)), director: person };
  }
  return { ...(await tmdb.moviesByGenre(input.genreId!, input.page)), director: null };
}

/** Upsert a movie plus its directors and genres. Returns the local movie_id. */
export async function ensureMovie(ex: Exec, d: tmdb.MovieDetails): Promise<number> {
  const [m] = await ex.insert(movies)
    .values({ tmdbId: d.tmdbId, title: d.title.slice(0, 300), releaseDate: d.releaseDate, posterPath: d.posterPath })
    .onConflictDoUpdate({
      target: movies.tmdbId,
      set: { title: d.title.slice(0, 300), releaseDate: d.releaseDate, posterPath: d.posterPath, updatedAt: sql`now()` },
    })
    .returning({ movieId: movies.movieId });

  for (const p of d.directors) {
    const [dir] = await ex.insert(directors).values({ tmdbPersonId: p.tmdbPersonId, name: p.name.slice(0, 200) })
      .onConflictDoUpdate({ target: directors.tmdbPersonId, set: { name: p.name.slice(0, 200) } })
      .returning({ id: directors.directorId });
    await ex.insert(movieDirectors).values({ movieId: m.movieId, directorId: dir.id }).onConflictDoNothing();
  }
  for (const g of d.genres) {
    const [gen] = await ex.insert(genres).values({ tmdbGenreId: g.tmdbGenreId, name: g.name.slice(0, 50) })
      .onConflictDoUpdate({ target: genres.tmdbGenreId, set: { name: g.name.slice(0, 50) } })
      .returning({ id: genres.genreId });
    await ex.insert(movieGenres).values({ movieId: m.movieId, genreId: gen.id }).onConflictDoNothing();
  }
  return m.movieId;
}

export async function getMovieWithUserState(ex: Exec, userId: string, tmdbId: number) {
  const details = await tmdb.getMovie(tmdbId);
  const [row] = await ex.select({
    inCollection: sql<boolean>`${collectionItems.userId} IS NOT NULL`,
    ratingValue: ratings.ratingValue,
    review: ratings.review,
  })
    .from(movies)
    .leftJoin(collectionItems, and(eq(collectionItems.movieId, movies.movieId), eq(collectionItems.userId, userId)))
    .leftJoin(ratings, and(eq(ratings.movieId, movies.movieId), eq(ratings.userId, userId)))
    .where(eq(movies.tmdbId, tmdbId));
  return {
    ...details,
    inCollection: row?.inCollection ?? false,
    myRating: row?.ratingValue ? { value: row.ratingValue, review: row.review } : null,
  };
}
