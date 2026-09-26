import { NextResponse } from "next/server";
import { db } from "@/db";
import { withUser } from "@/server/http";
import { TmdbIdParam } from "@/server/validation";
import { getMovieWithUserState } from "@/server/movies";

type Ctx = { params: Promise<{ tmdbId: string }> };

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const tmdbId = TmdbIdParam.parse((await params).tmdbId);
  return NextResponse.json(await getMovieWithUserState(db, user.id, tmdbId));
});
