// Shared database connection for the running app (server-side only).
import { createDb } from "./client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { movieshelfDb?: ReturnType<typeof createDb> };
export const { db } = (globalForDb.movieshelfDb ??= createDb(url));
