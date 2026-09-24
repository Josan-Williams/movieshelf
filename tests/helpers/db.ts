import { sql } from "drizzle-orm";
import { createDb } from "../../src/db/client";

export const { db, pool } = createDb(process.env.TEST_DATABASE_URL!);

// TRUNCATE does not fire row-level triggers, so it can clear audit_logs between tests.
export async function resetDb() {
  await db.execute(sql`TRUNCATE audit_logs, ratings, collection_items, movie_genres,
    movie_directors, genres, directors, movies, session, account, verification, "user"
    RESTART IDENTITY CASCADE`);
}

// Drizzle 0.45 wraps driver errors; the Postgres error (code, constraint) is on .cause.
export function pgError(e: unknown): { code?: string; constraint?: string } {
  const err = e as { cause?: unknown };
  return (err?.cause ?? e) as { code?: string; constraint?: string };
}

export async function expectPgError(p: Promise<unknown>, code: string, constraint?: string) {
  try { await p; } catch (e) {
    const pe = pgError(e);
    if (pe.code !== code) throw new Error(`Expected code ${code}, got ${pe.code}: ${String(e)}`);
    if (constraint && pe.constraint !== constraint)
      throw new Error(`Expected constraint ${constraint}, got ${pe.constraint}`);
    return;
  }
  throw new Error(`Expected Postgres error ${code}, but the query succeeded`);
}
