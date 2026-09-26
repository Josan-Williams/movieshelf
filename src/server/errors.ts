// Application errors with safe, user-facing messages (watchlist S9: no internals leaked).
export type ErrorCode =
  | "unauthorized" | "forbidden" | "not_found" | "validation_error"
  | "rate_limited" | "upstream_unavailable" | "internal_error";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const unauthorized = () => new AppError("unauthorized", 401, "You need to sign in.");
export const notFound = (what = "Resource") => new AppError("not_found", 404, `${what} not found.`);
