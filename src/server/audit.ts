// Audit log writer (DEC-005). The ONLY place that inserts into audit_logs.
import { auditLogs, type AuditAction } from "@/db/schema";
import type { Db } from "@/db/client";

// Accepts the db or an open transaction, so domain events can be written
// in the same transaction as the change they describe.
type Executor = Pick<Db, "insert">;

export interface AuditEntry {
  userId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
}

// Keys that must never be written to the audit log (DEC-005 #5).
const FORBIDDEN_KEYS = /pass(word)?|hash|token|secret|cookie|api[-_]?key|email/i;

export function sanitizeDetails(details: Record<string, unknown> | null | undefined) {
  if (!details) return null;
  return Object.fromEntries(Object.entries(details).filter(([k]) => !FORBIDDEN_KEYS.test(k)));
}

export async function writeAudit(executor: Executor, entry: AuditEntry) {
  await executor.insert(auditLogs).values({
    userId: entry.userId,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    details: sanitizeDetails(entry.details),
  });
}

/** Best-effort write for auth events: never blocks authentication, never silent. */
export async function writeAuditBestEffort(executor: Executor, entry: AuditEntry) {
  try {
    await writeAudit(executor, entry);
  } catch (err) {
    console.error("[audit] failed to write auth audit event", entry.action, err);
  }
}

/** Request metadata for auth events. x-forwarded-for is only trustworthy behind a proxy
 *  that overwrites it (e.g. Vercel); locally it can be spoofed – see docs. */
export function requestMeta(headers: Headers | undefined | null) {
  const forwarded = headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || headers?.get("x-real-ip") || null,
    userAgent: headers?.get("user-agent")?.slice(0, 300) ?? null,
  };
}
