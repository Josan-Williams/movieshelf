import { NextResponse } from "next/server";
import { db } from "@/db";
import { withUser } from "@/server/http";
import { PageQuery } from "@/server/validation";
import { listActivity } from "@/server/activity";

// Read-only: no POST/PUT/PATCH/DELETE exported, so Next.js answers 405 for them.
export const GET = withUser(async (req, user) => {
  const { page } = PageQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  return NextResponse.json(await listActivity(db, user.id, page));
});
