// Idempotent seed: TMDB's official movie genres. Safe to run repeatedly.
// Demo users are added in Milestone 2 (they need Better Auth to hash passwords).
import { config } from "dotenv";
import { createDb } from "../src/db/client";
import { genres } from "../src/db/schema";

config({ quiet: true });

const TMDB_GENRES: Array<[number, string]> = [
  [28, "Action"], [12, "Adventure"], [16, "Animation"], [35, "Comedy"], [80, "Crime"],
  [99, "Documentary"], [18, "Drama"], [10751, "Family"], [14, "Fantasy"], [36, "History"],
  [27, "Horror"], [10402, "Music"], [9648, "Mystery"], [10749, "Romance"],
  [878, "Science Fiction"], [10770, "TV Movie"], [53, "Thriller"], [10752, "War"], [37, "Western"],
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, pool } = createDb(url);
  const inserted = await db.insert(genres)
    .values(TMDB_GENRES.map(([tmdbGenreId, name]) => ({ tmdbGenreId, name })))
    .onConflictDoNothing()
    .returning();
  console.log(`Seed complete: ${inserted.length} new genres (${TMDB_GENRES.length} total defined).`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
