import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { SearchQuery } from "@/server/validation";
import { searchMovies } from "@/server/movies";

export const GET = withUser(async (req) => {
  const q = SearchQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  return NextResponse.json(await searchMovies({ director: q.director, genreId: q.genre, page: q.page }));
});
