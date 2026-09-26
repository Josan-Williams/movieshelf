// Server-side authentication guard. The acting user ALWAYS comes from the session,
// never from the request body or URL (watchlist S1-S3).
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type SessionUser = { id: string; name: string; email: string };

export async function getCurrentUser(): Promise<SessionUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  return s ? { id: s.user.id, name: s.user.name, email: s.user.email } : null;
}
