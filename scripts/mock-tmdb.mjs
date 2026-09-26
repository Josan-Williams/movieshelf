// Minimal fake TMDB for offline local testing: TMDB_BASE_URL=http://localhost:4010/3
import http from "node:http";
const movie = (id, title, genres = [878]) => ({ id, title, release_date: "2010-07-15", poster_path: null, overview: "Offline mock movie.", vote_average: 8.1, vote_count: 1200, genre_ids: genres });
const routes = {
  "/3/genre/movie/list": () => ({ genres: [{ id: 28, name: "Action" }, { id: 27, name: "Horror" }, { id: 878, name: "Science Fiction" }] }),
  "/3/search/person": () => ({ results: [{ id: 525, name: "Christopher Nolan", known_for_department: "Directing" }] }),
  "/3/person/525/movie_credits": () => ({ crew: [{ ...movie(27205, "Inception"), job: "Director" }, { ...movie(157336, "Interstellar"), job: "Director" }] }),
  "/3/discover/movie": () => ({ page: 1, total_pages: 1, total_results: 2, results: [movie(27205, "Inception"), movie(603, "The Matrix")] }),
};
http.createServer((req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  const m = path.match(/^\/3\/movie\/(\d+)$/);
  const body = m ? { ...movie(Number(m[1]), `Movie ${m[1]}`), runtime: 120, genres: [{ id: 878, name: "Science Fiction" }], credits: { crew: [{ id: 525, name: "Christopher Nolan", job: "Director" }] } } : routes[path]?.();
  res.writeHead(body ? 200 : 404, { "content-type": "application/json" }).end(JSON.stringify(body ?? {}));
}).listen(4010, () => console.log("mock TMDB on :4010"));
