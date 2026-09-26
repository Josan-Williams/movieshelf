// Route handlers: authentication, validation, status codes and error shape.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db as testDb, pool, resetDb } from "../helpers/db";
import { movieDetails, GENRES } from "../helpers/fixtures";
import { user } from "../../src/db/schema";

const session = vi.hoisted(() => ({ current: null as null | { id: string; name: string; email: string } }));
vi.mock("../../src/db", () => ({ db: testDb }));
vi.mock("../../src/server/session", () => ({ getCurrentUser: async () => session.current }));
vi.mock("../../src/server/tmdb", async (orig) => ({
  ...(await orig<typeof import("../../src/server/tmdb")>()),
  getMovie: vi.fn(async (id: number) => movieDetails(id)),
  getGenres: vi.fn(async () => GENRES),
  findDirector: vi.fn(async () => ({ tmdbPersonId: 525, name: "Christopher Nolan" })),
  moviesByDirector: vi.fn(async () => ({ page: 1, totalPages: 1, totalResults: 1, results: [movieDetails()] })),
  moviesByGenre: vi.fn(async () => ({ page: 1, totalPages: 1, totalResults: 1, results: [movieDetails()] })),
}));

import * as collectionItem from "../../src/app/api/collection/[tmdbId]/route";
import * as collection from "../../src/app/api/collection/route";
import * as rating from "../../src/app/api/ratings/[tmdbId]/route";
import * as activity from "../../src/app/api/activity/route";
import * as search from "../../src/app/api/movies/search/route";
import * as aiSearch from "../../src/app/api/ai/search/route";

const BASE = "http://localhost:3000";
const req = (path: string, init: RequestInit = {}) =>
  new Request(BASE + path, { ...init, headers: { host: "localhost:3000", "content-type": "application/json", ...(init.headers ?? {}) } });
const ctx = (tmdbId: string) => ({ params: Promise.resolve({ tmdbId }) });

beforeEach(async () => {
  await resetDb();
  await testDb.insert(user).values({ id: "alice", name: "Alice", email: "alice@example.com" });
  session.current = { id: "alice", name: "Alice", email: "alice@example.com" };
});
afterAll(() => pool.end());

describe("authentication", () => {
  it("returns 401 with a safe error body on every protected route without a session", async () => {
    session.current = null;
    const responses = await Promise.all([
      collection.GET(req("/api/collection"), undefined as never),
      collectionItem.PUT(req("/api/collection/1", { method: "PUT" }), ctx("1")),
      rating.PUT(req("/api/ratings/1", { method: "PUT", body: '{"rating":5}' }), ctx("1")),
      activity.GET(req("/api/activity"), undefined as never),
      search.GET(req("/api/movies/search?genre=35"), undefined as never),
      aiSearch.POST(req("/api/ai/search", { method: "POST", body: '{"query":"comedy"}' }), undefined as never),
    ]);
    for (const r of responses) {
      expect(r.status).toBe(401);
      expect(await r.json()).toEqual({ error: { code: "unauthorized", message: "You need to sign in." } });
    }
  });

  it("blocks cross-site mutations (403) even with a valid session", async () => {
    const r = await collectionItem.PUT(req("/api/collection/1", { method: "PUT", headers: { origin: "https://evil.example" } }), ctx("1"));
    expect(r.status).toBe(403);
  });
});

describe("collection API", () => {
  it("PUT is idempotent: 201 then 200; DELETE 204 then 404", async () => {
    expect((await collectionItem.PUT(req("/api/collection/27205", { method: "PUT" }), ctx("27205"))).status).toBe(201);
    expect((await collectionItem.PUT(req("/api/collection/27205", { method: "PUT" }), ctx("27205"))).status).toBe(200);
    expect((await collectionItem.DELETE(req("/api/collection/27205", { method: "DELETE" }), ctx("27205"))).status).toBe(204);
    expect((await collectionItem.DELETE(req("/api/collection/27205", { method: "DELETE" }), ctx("27205"))).status).toBe(404);
  });

  it.each(["abc", "-1", "0", "1.5"])("rejects invalid movie id %s with 422", async (id) => {
    const r = await collectionItem.PUT(req(`/api/collection/${id}`, { method: "PUT" }), ctx(id));
    expect(r.status).toBe(422);
  });
});

describe("ratings API", () => {
  it("201 on create, 200 on update", async () => {
    const put = (body: object) => rating.PUT(req("/api/ratings/27205", { method: "PUT", body: JSON.stringify(body) }), ctx("27205"));
    expect((await put({ rating: 6 })).status).toBe(201);
    const r = await put({ rating: 8, review: "Great" });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ created: false, value: 8, review: "Great" });
  });

  it.each([
    [{ rating: 0 }], [{ rating: 11 }], [{ rating: 7.5 }], [{ rating: "7" }], [{}],
    [{ rating: 5, review: "x".repeat(2001) }],
    [{ rating: 5, userId: "bob" }], // mass assignment: unknown fields rejected
  ])("rejects invalid body %j with 422 and field errors", async (body) => {
    const r = await rating.PUT(req("/api/ratings/27205", { method: "PUT", body: JSON.stringify(body) }), ctx("27205"));
    expect(r.status).toBe(422);
    expect((await r.json()).error.code).toBe("validation_error");
  });

  it("rejects malformed JSON with 400", async () => {
    const r = await rating.PUT(req("/api/ratings/27205", { method: "PUT", body: "{not json" }), ctx("27205"));
    expect(r.status).toBe(400);
  });
});

describe("activity API", () => {
  it("is read-only: only GET is exported", () => {
    expect(Object.keys(activity).filter((k) => /^(POST|PUT|PATCH|DELETE)$/.test(k))).toEqual([]);
  });
});

describe("search API", () => {
  it("requires a director or genre (422)", async () => {
    const r = await search.GET(req("/api/movies/search"), undefined as never);
    expect(r.status).toBe(422);
  });
  it("returns results for a genre", async () => {
    const r = await search.GET(req("/api/movies/search?genre=878"), undefined as never);
    expect(r.status).toBe(200);
    expect((await r.json()).results).toHaveLength(1);
  });
});

describe("AI search API", () => {
  it("uses the fallback when AI is not configured and audits the request", async () => {
    delete process.env.AI_API_KEY;
    const r = await aiSearch.POST(req("/api/ai/search", { method: "POST", body: '{"query":"sci-fi by Christopher Nolan"}' }), undefined as never);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ source: "fallback", fallbackReason: "ai_not_configured" });
    expect(body.criteria).toEqual({ director: "Christopher Nolan", genre: { tmdbGenreId: 878, name: "Science Fiction" } });
    const log = await activity.GET(req("/api/activity"), undefined as never);
    expect((await log.json()).items[0]).toMatchObject({ action: "ai.search" });
  });
  it("rejects over-long queries (422)", async () => {
    const r = await aiSearch.POST(req("/api/ai/search", { method: "POST", body: JSON.stringify({ query: "x".repeat(201) }) }), undefined as never);
    expect(r.status).toBe(422);
  });
});
