import { NextResponse } from "next/server";
import { db } from "@/db";
import { readJson, withUser } from "@/server/http";
import { RatingBody, TmdbIdParam } from "@/server/validation";
import { rateMovie } from "@/server/ratings";

type Ctx = { params: Promise<{ tmdbId: string }> };

// 201 on first rating, 200 when updating the existing one.
export const PUT = withUser<Ctx>(async (req, user, { params }) => {
  const tmdbId = TmdbIdParam.parse((await params).tmdbId);
  const body = RatingBody.parse(await readJson(req));
  const result = await rateMovie(db, user.id, tmdbId, body.rating, body.review);
  return NextResponse.json(result, { status: result.created ? 201 : 200 });
});
