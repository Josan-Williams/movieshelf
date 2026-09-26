import { NextResponse } from "next/server";
import { withUser } from "@/server/http";
import { getGenres } from "@/server/tmdb";

export const GET = withUser(async () => NextResponse.json({ genres: await getGenres() }));
