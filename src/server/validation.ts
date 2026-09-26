// Request validation schemas (watchlist S4 mass assignment: only these fields are ever read).
import { z } from "zod";
import { AI_QUERY_MAX } from "./ai-search";

export const TmdbIdParam = z.coerce.number().int().positive().max(100_000_000);

export const SearchQuery = z.object({
  director: z.string().trim().max(100).optional().transform((v) => v || undefined),
  genre: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export const RatingBody = z.object({
  rating: z.number().int().min(1).max(10),
  review: z.string().trim().max(2000).nullish().transform((v) => v || null),
}).strict();

export const PageQuery = z.object({ page: z.coerce.number().int().min(1).max(10_000).default(1) });

export const AiSearchBody = z.object({
  query: z.string().trim().min(2).max(AI_QUERY_MAX),
  page: z.number().int().min(1).max(500).optional(),
}).strict();
