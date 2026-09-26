import { notFound } from "next/navigation";
import { db } from "@/db";
import { getCurrentUser } from "@/server/session";
import { getMovieWithUserState } from "@/server/movies";
import { TmdbIdParam } from "@/server/validation";
import { AppError } from "@/server/errors";
import { MovieActions } from "@/components/movie-actions";
import { Alert, Poster, year } from "@/components/ui";

export default async function MoviePage({ params }: PageProps<"/movies/[tmdbId]">) {
  const id = TmdbIdParam.safeParse((await params).tmdbId);
  if (!id.success) notFound();
  const user = (await getCurrentUser())!; // guaranteed by (app)/layout
  let movie;
  try {
    movie = await getMovieWithUserState(db, user.id, id.data);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    return <Alert>{e instanceof AppError ? e.message : "Could not load this movie."}</Alert>;
  }
  return (
    <article className="flex flex-col gap-6 sm:flex-row">
      <Poster path={movie.posterPath} title={movie.title} size="w342" />
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">{movie.title} <span className="font-normal text-zinc-500">({year(movie.releaseDate)})</span></h1>
          <p className="text-sm text-zinc-500">
            {movie.directors.length ? `Directed by ${movie.directors.map((d) => d.name).join(", ")}` : "Director unknown"}
            {movie.runtime ? ` - ${movie.runtime} min` : ""}
          </p>
          <p className="text-sm">{movie.genres.map((g) => g.name).join(", ")}</p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div><dt className="text-zinc-500">TMDB rating</dt><dd className="text-lg font-semibold">{movie.voteAverage && movie.voteCount ? `${movie.voteAverage.toFixed(1)}/10` : "No rating yet"}</dd></div>
          <div><dt className="text-zinc-500">Your rating</dt><dd className="text-lg font-semibold">{movie.myRating ? `${movie.myRating.value}/10` : "Not rated"}</dd></div>
        </dl>
        {movie.overview && <p className="max-w-prose">{movie.overview}</p>}
        <MovieActions tmdbId={movie.tmdbId} inCollection={movie.inCollection} myRating={movie.myRating} />
        <p className="text-xs text-zinc-500">Movie data from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </div>
    </article>
  );
}
