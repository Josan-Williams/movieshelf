// Shared route-handler plumbing: auth guard, origin check, uniform error shape.
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, unauthorized } from "./errors";
import { getCurrentUser, type SessionUser } from "./session";

type ErrorBody = { error: { code: string; message: string; fields?: Record<string, string[]> } };

export function errorResponse(err: unknown): NextResponse<ErrorBody> {
  if (err instanceof AppError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, fields: err.fields } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const i of err.issues) (fields[i.path.join(".") || "_"] ??= []).push(i.message);
    return NextResponse.json({ error: { code: "validation_error", message: "Some fields are invalid.", fields } }, { status: 422 });
  }
  console.error("[api] unexpected error", err); // details stay in server logs only (S9)
  return NextResponse.json({ error: { code: "internal_error", message: "Something went wrong. Please try again." } }, { status: 500 });
}

/** Defence in depth against CSRF on top of SameSite=Lax cookies (S7). */
function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients; still need a valid session cookie
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host || new URL(origin).host !== host) throw new AppError("forbidden", 403, "Cross-site request blocked.");
}

export async function readJson(req: Request): Promise<unknown> {
  try { return await req.json(); } catch { throw new AppError("validation_error", 400, "Request body must be valid JSON."); }
}

export function withUser<C>(handler: (req: Request, user: SessionUser, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      assertSameOrigin(req);
      const user = await getCurrentUser();
      if (!user) throw unauthorized();
      return await handler(req, user, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
