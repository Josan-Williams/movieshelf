import { NextResponse } from "next/server";
import { db } from "@/db";
import { withUser } from "@/server/http";
import { listCollection } from "@/server/collection";

export const GET = withUser(async (_req, user) => NextResponse.json({ items: await listCollection(db, user.id) }));
