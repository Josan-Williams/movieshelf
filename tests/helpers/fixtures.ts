import type { MovieDetails } from "../../src/server/tmdb";

export const GENRES = [
  { tmdbGenreId: 28, name: "Action" }, { tmdbGenreId: 35, name: "Comedy" },
  { tmdbGenreId: 18, name: "Drama" }, { tmdbGenreId: 27, name: "Horror" },
  { tmdbGenreId: 878, name: "Science Fiction" }, { tmdbGenreId: 10749, name: "Romance" },
];

export function movieDetails(tmdbId = 27205, title = "Inception"): MovieDetails {
  return {
    tmdbId, title, releaseDate: "2010-07-15", posterPath: "/poster.jpg", overview: "Dreams.",
    voteAverage: 8.4, voteCount: 35000, genreIds: [28, 878], runtime: 148,
    genres: [{ tmdbGenreId: 28, name: "Action" }, { tmdbGenreId: 878, name: "Science Fiction" }],
    directors: [{ tmdbPersonId: 525, name: "Christopher Nolan" }],
  };
}
