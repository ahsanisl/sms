import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AuthSession } from "@/lib/tenancy";

/** Fire-and-forget audit trail write — never blocks or fails the calling mutation (spec §26). */
export async function logAudit(
  session: AuthSession | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await db.insert(auditLogs).values({
      userId: session?.userId ?? null,
      schoolId: session?.schoolId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      metadata: metadata ?? null,
    });
  } catch (error) {
    console.error("Failed to write audit log", { action, entity, entityId, error });
  }
}
