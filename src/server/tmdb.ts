// TMDB adapter: the only module that talks to api.themoviedb.org.
// Returns internal, validated shapes; never passes raw TMDB JSON to the rest of the app.
import { z } from "zod";
import { AppError } from "./errors";

const BASE = "https://api.themoviedb.org/3";
const TIMEOUT_MS = 6000;

export class TmdbError extends AppError {}

const upstreamDown = () =>
  new TmdbError("upstream_unavailable", 503, "The movie database is unavailable right now. Please try again shortly.");

async function tmdbGet(path: string, params: Record<string, string | number | undefined> = {}) {
  const token = process.env.TMDB_API_READ_TOKEN;
  if (!token) throw upstreamDown();
  const url = new URL((process.env.TMDB_BASE_URL ?? BASE) + path); // override only for local mock testing
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 3600 },
    } as RequestInit);
  } catch {
    throw upstreamDown(); // network error or timeout
  }
  if (res.status === 404) throw new TmdbError("not_found", 404, "Movie not found.");
  if (res.status === 429) throw new TmdbError("rate_limited", 429, "Too many requests to the movie database. Please wait a moment.");
  if (!res.ok) throw upstreamDown();
  try {
    return (await res.json()) as unknown;
  } catch {
    throw upstreamDown(); // malformed JSON
  }
}

// ---------- schemas (lenient: missing optional fields become null) ----------
const nullableStr = z.string().nullish().transform((v) => v || null);
const MovieSummarySchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  release_date: nullableStr,
  poster_path: nullableStr,
  overview: nullableStr,
  vote_average: z.number().nullish().transform((v) => v ?? null),
  vote_count: z.number().nullish().transform((v) => v ?? null),
  genre_ids: z.array(z.number()).nullish().transform((v) => v ?? []),
});
export type MovieSummary = {
  tmdbId: number; title: string; releaseDate: string | null; posterPath: string | null;
  overview: string | null; voteAverage: number | null; voteCount: number | null; genreIds: number[];
};
const toSummary = (m: z.infer<typeof MovieSummarySchema>): MovieSummary => ({
  tmdbId: m.id, title: m.title, releaseDate: m.release_date, posterPath: m.poster_path,
  overview: m.overview, voteAverage: m.vote_average, voteCount: m.vote_count, genreIds: m.genre_ids,
});

/** Keep valid items, silently drop malformed ones (one bad record must not break a page). */
function parseItems<T extends z.ZodTypeAny>(schema: T, items: unknown): z.infer<T>[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((i) => {
    const r = schema.safeParse(i);
    return r.success ? [r.data] : [];
  });
}

export type Genre = { tmdbGenreId: number; name: string };
let genreCache: { at: number; data: Genre[] } | null = null;

export async function getGenres(): Promise<Genre[]> {
  if (genreCache && Date.now() - genreCache.at < 3_600_000) return genreCache.data;
  const json = (await tmdbGet("/genre/movie/list", { language: "en-US" })) as { genres?: unknown };
  const data = parseItems(z.object({ id: z.number(), name: z.string() }), json?.genres)
    .map((g) => ({ tmdbGenreId: g.id, name: g.name }));
  if (data.length === 0) throw upstreamDown();
  genreCache = { at: Date.now(), data };
  return data;
}
export function _resetGenreCacheForTests() { genreCache = null; }

export type Person = { tmdbPersonId: number; name: string };

export async function findDirector(name: string): Promise<Person | null> {
  const json = (await tmdbGet("/search/person", { query: name, include_adult: "false" })) as { results?: unknown };
  const people = parseItems(
    z.object({ id: z.number(), name: z.string(), known_for_department: nullableStr }), json?.results);
  // Many directors are "known for" Acting or Writing (e.g. Jordan Peele), so do not require Directing.
  // Prefer: known for Directing > exact name match > TMDB's top (most popular) result.
  // moviesByDirector() still keeps only credits with job === "Director".
  const exact = (p: { name: string }) => p.name.toLowerCase() === name.trim().toLowerCase();
  const director =
    people.find((p) => p.known_for_department === "Directing" && exact(p)) ??
    people.find(exact) ??
    people.find((p) => p.known_for_department === "Directing") ??
    people[0] ?? null;
  return director ? { tmdbPersonId: director.id, name: director.name } : null;
}

export type SearchPage = { page: number; totalPages: number; totalResults: number; results: MovieSummary[] };
const PAGE_SIZE = 20;

/** Movies a person DIRECTED (job === "Director"), optionally filtered by genre. */
export async function moviesByDirector(personId: number, genreId: number | undefined, page: number): Promise<SearchPage> {
  const json = (await tmdbGet(`/person/${personId}/movie_credits`)) as { crew?: unknown };
  const crew = parseItems(MovieSummarySchema.extend({ job: z.string().nullish() }), json?.crew);
  const seen = new Set<number>();
  const directed = crew
    .filter((c) => c.job === "Director" && !seen.has(c.id) && seen.add(c.id))
    .filter((c) => (genreId ? c.genre_ids.includes(genreId) : true))
    .sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""))
    .map(toSummary);
  const totalPages = Math.max(1, Math.ceil(directed.length / PAGE_SIZE));
  return {
    page, totalPages, totalResults: directed.length,
    results: directed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

export async function moviesByGenre(genreId: number, page: number): Promise<SearchPage> {
  const json = (await tmdbGet("/discover/movie", {
    with_genres: genreId, page, sort_by: "popularity.desc", include_adult: "false", "vote_count.gte": 50,
  })) as { page?: number; total_pages?: number; total_results?: number; results?: unknown };
  return {
    page: json?.page ?? page,
    totalPages: Math.min(json?.total_pages ?? 1, 500), // TMDB caps discover at 500 pages
    totalResults: json?.total_results ?? 0,
    results: parseItems(MovieSummarySchema, json?.results).map(toSummary),
  };
}

export type MovieDetails = MovieSummary & {
  runtime: number | null;
  genres: Genre[];
  directors: Person[];
};

export async function getMovie(tmdbId: number): Promise<MovieDetails> {
  const json = await tmdbGet(`/movie/${tmdbId}`, { append_to_response: "credits", language: "en-US" });
  const parsed = MovieSummarySchema.omit({ genre_ids: true }).extend({
    runtime: z.number().nullish().transform((v) => v ?? null),
    genres: z.array(z.object({ id: z.number(), name: z.string() })).nullish().transform((v) => v ?? []),
    credits: z.object({ crew: z.array(z.unknown()).nullish() }).nullish(),
  }).safeParse(json);
  if (!parsed.success) throw upstreamDown();
  const m = parsed.data;
  const crew = parseItems(z.object({ id: z.number(), name: z.string(), job: z.string().nullish() }), m.credits?.crew);
  const directors = [...new Map(crew.filter((c) => c.job === "Director").map((c) => [c.id, c])).values()]
    .map((c) => ({ tmdbPersonId: c.id, name: c.name }));
  return {
    ...toSummary({ ...m, genre_ids: m.genres.map((g) => g.id) }),
    runtime: m.runtime,
    genres: m.genres.map((g) => ({ tmdbGenreId: g.id, name: g.name })),
    directors,
  };
}

export const posterUrl = (path: string | null, size: "w185" | "w342" = "w342") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
