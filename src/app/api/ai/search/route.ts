import { NextResponse } from "next/server";
import { db } from "@/db";
import { readJson, withUser } from "@/server/http";
import { AiSearchBody } from "@/server/validation";
import { getGenres } from "@/server/tmdb";
import { aiSearchCriteria } from "@/server/ai-search";
import { searchMovies } from "@/server/movies";
import { writeAudit } from "@/server/audit";

export const POST = withUser(async (req, user) => {
  const { query, page } = AiSearchBody.parse(await readJson(req));
  const genres = await getGenres();
  const ai = await aiSearchCriteria(query, genres);

  // Audit every AI request. Store criteria + outcome, not the raw text (it may contain personal data).
  await writeAudit(db, {
    userId: user.id, action: "ai.search", resourceType: "search",
    details: {
      source: ai.source, fallbackReason: ai.fallbackReason ?? null, queryLength: query.length,
      director: ai.criteria.director, genre: ai.criteria.genre?.name ?? null,
    },
  });

  if (!ai.criteria.director && !ai.criteria.genre) {
    return NextResponse.json({ ...ai, results: [], page: 1, totalPages: 1, totalResults: 0,
      message: "Couldn't find a director or genre in that request. Try e.g. \"sci-fi by Denis Villeneuve\"." });
  }
  const results = await searchMovies({
    director: ai.criteria.director ?? undefined, genreId: ai.criteria.genre?.tmdbGenreId, page: page ?? 1,
  });
  return NextResponse.json({ ...ai, ...results });
});
