import { NextResponse } from "next/server";
import { db } from "@/db";
import { withUser } from "@/server/http";
import { TmdbIdParam } from "@/server/validation";
import { addToCollection, removeFromCollection } from "@/server/collection";

type Ctx = { params: Promise<{ tmdbId: string }> };

// PUT is idempotent: 201 when added, 200 when it was already there.
export const PUT = withUser<Ctx>(async (_req, user, { params }) => {
  const tmdbId = TmdbIdParam.parse((await params).tmdbId);
  const { added } = await addToCollection(db, user.id, tmdbId);
  return NextResponse.json({ tmdbId, inCollection: true, added }, { status: added ? 201 : 200 });
});

export const DELETE = withUser<Ctx>(async (_req, user, { params }) => {
  const tmdbId = TmdbIdParam.parse((await params).tmdbId);
  await removeFromCollection(db, user.id, tmdbId);
  return new NextResponse(null, { status: 204 });
});
