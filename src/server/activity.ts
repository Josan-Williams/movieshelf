// Read-only view of the signed-in user's own audit trail. There is no update/delete path.
import { count, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { auditLogs } from "@/db/schema";

export const ACTIVITY_PAGE_SIZE = 25;

export async function listActivity(db: Db, userId: string, page: number) {
  const where = eq(auditLogs.userId, userId);
  const [rows, [{ total }]] = await Promise.all([
    db.select({
      id: auditLogs.auditId, action: auditLogs.action, resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId, details: auditLogs.details, timestampUtc: auditLogs.timestampUtc,
    }).from(auditLogs).where(where).orderBy(desc(auditLogs.timestampUtc), desc(auditLogs.auditId))
      .limit(ACTIVITY_PAGE_SIZE).offset((page - 1) * ACTIVITY_PAGE_SIZE),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);
  return { page, totalPages: Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE)), total, items: rows };
}
