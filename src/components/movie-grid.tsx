import Link from "next/link";
import type { MovieSummary } from "@/server/tmdb";
import { Poster, year } from "./ui";

export function MovieGrid({ movies }: { movies: MovieSummary[] }) {
  if (movies.length === 0) return <p className="text-sm text-zinc-500">No movies found. Try a different director or genre.</p>;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {movies.map((m) => (
        <li key={m.tmdbId}>
          <Link href={`/movies/${m.tmdbId}`} className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-3 hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900">
            <Poster path={m.posterPath} title={m.title} />
            <div className="min-w-0">
              <p className="font-semibold">{m.title}</p>
              <p className="text-sm text-zinc-500">{year(m.releaseDate)}</p>
              {m.voteAverage !== null && m.voteCount ? (
                <p className="text-sm">TMDB {m.voteAverage.toFixed(1)}/10 <span className="text-zinc-500">({m.voteCount.toLocaleString()} votes)</span></p>
              ) : <p className="text-sm text-zinc-500">No TMDB rating yet</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
