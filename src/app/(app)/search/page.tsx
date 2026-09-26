import Link from "next/link";
import { SearchQuery } from "@/server/validation";
import { searchMovies } from "@/server/movies";
import { getGenres, type Genre } from "@/server/tmdb";
import { AppError } from "@/server/errors";
import { MovieGrid } from "@/components/movie-grid";
import { AiSearch } from "@/components/ai-search";
import { Alert, Button, inputCls } from "@/components/ui";

export const metadata = { title: "Search - MovieShelf" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const parsed = SearchQuery.safeParse(await searchParams);
  const q = parsed.success ? parsed.data : { director: undefined, genre: undefined, page: 1 };

  let genres: Genre[] = [];
  let error: string | null = null;
  let results: Awaited<ReturnType<typeof searchMovies>> | null = null;
  try {
    genres = await getGenres();
    if (q.director || q.genre) results = await searchMovies({ director: q.director, genreId: q.genre, page: q.page });
  } catch (e) {
    error = e instanceof AppError ? e.message : "Search failed. Please try again.";
    if (!(e instanceof AppError)) console.error(e);
  }

  const pageLink = (page: number) => {
    const p = new URLSearchParams();
    if (q.director) p.set("director", q.director);
    if (q.genre) p.set("genre", String(q.genre));
    p.set("page", String(page));
    return `/search?${p}`;
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Find movies</h1>
      <section aria-labelledby="filter-h" className="flex flex-col gap-3">
        <h2 id="filter-h" className="text-lg font-semibold">Search by director and genre</h2>
        <form method="get" action="/search" className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
          <label className="flex flex-col gap-1 text-sm">Director
            <input name="director" defaultValue={q.director ?? ""} maxLength={100} placeholder="e.g. Christopher Nolan" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm">Genre
            <select name="genre" defaultValue={q.genre ?? ""} className={inputCls}>
              <option value="">Any genre</option>
              {genres.map((g) => <option key={g.tmdbGenreId} value={g.tmdbGenreId}>{g.name}</option>)}
            </select>
          </label>
          <Button type="submit">Search</Button>
        </form>
        {!parsed.success && <Alert>Invalid search parameters.</Alert>}
        {error && <Alert>{error}</Alert>}
        {results && (
          <>
            <p className="text-sm text-zinc-500" aria-live="polite">
              {results.totalResults} result(s){results.director ? ` directed by ${results.director.name}` : ""}.
              {q.director && !results.director && " No director found with that name."}
            </p>
            <MovieGrid movies={results.results} />
            {results.totalPages > 1 && (
              <nav aria-label="Pagination" className="flex items-center gap-4 text-sm">
                {results.page > 1 && <Link className="underline" href={pageLink(results.page - 1)}>Previous</Link>}
                <span>Page {results.page} of {results.totalPages}</span>
                {results.page < results.totalPages && <Link className="underline" href={pageLink(results.page + 1)}>Next</Link>}
              </nav>
            )}
          </>
        )}
      </section>
      <AiSearch />
    </div>
  );
}
