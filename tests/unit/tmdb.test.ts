// TMDB adapter: parsing and failure handling. fetch is stubbed; no real network calls.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as tmdb from "../../src/server/tmdb";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => { process.env.TMDB_API_READ_TOKEN = "test-token"; tmdb._resetGenreCacheForTests(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("tmdb adapter", () => {
  it("parses discover results and drops malformed items", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({
      page: 1, total_pages: 3, total_results: 60,
      results: [{ id: 1, title: "Good", genre_ids: [35] }, { id: "bad" }, { title: "no id" }],
    })));
    const page = await tmdb.moviesByGenre(35, 1);
    expect(page.results).toHaveLength(1);
    expect(page.results[0]).toMatchObject({ tmdbId: 1, title: "Good", posterPath: null, voteAverage: null });
  });

  it("keeps only movies the person DIRECTED, filtered by genre", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ crew: [
      { id: 1, title: "Directed drama", job: "Director", genre_ids: [18], release_date: "2020-01-01" },
      { id: 2, title: "Produced only", job: "Producer", genre_ids: [18] },
      { id: 3, title: "Directed comedy", job: "Director", genre_ids: [35] },
      { id: 1, title: "Directed drama", job: "Director", genre_ids: [18] },
    ] })));
    const page = await tmdb.moviesByDirector(525, 18, 1);
    expect(page.results.map((m) => m.tmdbId)).toEqual([1]);
  });

  it.each([
    [429, "rate_limited", 429],
    [500, "upstream_unavailable", 503],
    [404, "not_found", 404],
  ])("maps HTTP %i to %s", async (status, code, httpStatus) => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, status)));
    await expect(tmdb.getMovie(1)).rejects.toMatchObject({ code, status: httpStatus });
  });

  it("treats network errors, timeouts and malformed JSON as unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await expect(tmdb.getMovie(1)).rejects.toMatchObject({ code: "upstream_unavailable" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>oops", { status: 200 })));
    await expect(tmdb.getMovie(1)).rejects.toMatchObject({ code: "upstream_unavailable" });
  });

  it("finds directors who are known for acting (e.g. Jordan Peele)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ results: [
      { id: 291263, name: "Jordan Peele", known_for_department: "Acting" },
      { id: 7, name: "Someone Else", known_for_department: "Directing" },
    ] })));
    expect(await tmdb.findDirector("jordan peele")).toEqual({ tmdbPersonId: 291263, name: "Jordan Peele" });
  });

  it("returns null when TMDB finds nobody", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ results: [] })));
    expect(await tmdb.findDirector("zzzz")).toBeNull();
  });

  it("extracts directors from movie credits", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({
      id: 27205, title: "Inception", runtime: 148, genres: [{ id: 878, name: "Science Fiction" }],
      credits: { crew: [{ id: 525, name: "Christopher Nolan", job: "Director" }, { id: 9, name: "Someone", job: "Editor" }] },
    })));
    const m = await tmdb.getMovie(27205);
    expect(m.directors).toEqual([{ tmdbPersonId: 525, name: "Christopher Nolan" }]);
    expect(m.genres).toEqual([{ tmdbGenreId: 878, name: "Science Fiction" }]);
  });
});
