// MovieShelf application tables. Mirrors docs/schema-v1-reference.sql and docs/erd.png.
import { sql } from "drizzle-orm";
import {
  pgTable, integer, bigint, smallint, text, varchar, date, timestamp, jsonb,
  primaryKey, unique, check, index,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export { user } from "./auth-schema";

// Allowed audit actions: one list shared by the DB CHECK constraint and TypeScript.
export const AUDIT_ACTIONS = [
  "auth.sign_up", "auth.sign_in", "auth.sign_in_failed", "auth.sign_out",
  "collection.add", "collection.remove",
  "rating.create", "rating.update",
  "ai.search",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
    .$onUpdate(() => new Date()),
};

export const movies = pgTable("movies", {
  movieId: integer("movie_id").primaryKey().generatedAlwaysAsIdentity(),
  tmdbId: integer("tmdb_id").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  releaseDate: date("release_date"),
  posterPath: varchar("poster_path", { length: 200 }),
  ...timestamps,
}, (t) => [
  unique("uq_movies_tmdb_id").on(t.tmdbId),
  check("ck_movies_tmdb_id", sql`${t.tmdbId} > 0`),
]);

export const directors = pgTable("directors", {
  directorId: integer("director_id").primaryKey().generatedAlwaysAsIdentity(),
  tmdbPersonId: integer("tmdb_person_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
}, (t) => [unique("uq_directors_tmdb_person_id").on(t.tmdbPersonId)]);

export const genres = pgTable("genres", {
  genreId: integer("genre_id").primaryKey().generatedAlwaysAsIdentity(),
  tmdbGenreId: integer("tmdb_genre_id").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
}, (t) => [
  unique("uq_genres_tmdb_genre_id").on(t.tmdbGenreId),
  unique("uq_genres_name").on(t.name),
]);

export const movieDirectors = pgTable("movie_directors", {
  movieId: integer("movie_id").notNull().references(() => movies.movieId, { onDelete: "cascade" }),
  directorId: integer("director_id").notNull().references(() => directors.directorId, { onDelete: "restrict" }),
}, (t) => [
  primaryKey({ name: "pk_movie_directors", columns: [t.movieId, t.directorId] }),
  index("ix_movie_directors_director").on(t.directorId),
]);

export const movieGenres = pgTable("movie_genres", {
  movieId: integer("movie_id").notNull().references(() => movies.movieId, { onDelete: "cascade" }),
  genreId: integer("genre_id").notNull().references(() => genres.genreId, { onDelete: "restrict" }),
}, (t) => [
  primaryKey({ name: "pk_movie_genres", columns: [t.movieId, t.genreId] }),
  index("ix_movie_genres_genre").on(t.genreId),
]);

export const collectionItems = pgTable("collection_items", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  movieId: integer("movie_id").notNull().references(() => movies.movieId, { onDelete: "restrict" }),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ name: "pk_collection_items", columns: [t.userId, t.movieId] })]);

export const ratings = pgTable("ratings", {
  ratingId: integer("rating_id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  movieId: integer("movie_id").notNull().references(() => movies.movieId, { onDelete: "restrict" }),
  ratingValue: smallint("rating_value").notNull(),
  review: text("review"),
  ...timestamps,
}, (t) => [
  unique("uq_ratings_user_movie").on(t.userId, t.movieId),
  check("ck_ratings_value", sql`${t.ratingValue} BETWEEN 1 AND 10`),
  check("ck_ratings_review_length", sql`${t.review} IS NULL OR char_length(${t.review}) <= 2000`),
]);

export const auditLogs = pgTable("audit_logs", {
  auditId: bigint("audit_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").references(() => user.id, { onDelete: "restrict" }), // nullable: failed sign-in
  action: varchar("action", { length: 50 }).$type<AuditAction>().notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: varchar("resource_id", { length: 100 }),
  details: jsonb("details"),
  timestampUtc: timestamp("timestamp_utc", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("ck_audit_logs_action",
    sql.raw(`action IN (${AUDIT_ACTIONS.map((a) => `'${a}'`).join(", ")})`)),
  index("ix_audit_logs_user_time").on(t.userId, t.timestampUtc.desc()),
]);
