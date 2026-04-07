/**
 * src/server/lib/activity-logger.ts
 *
 * Shared activity logging utility. All entity actions (contacts, tasks, quotes,
 * appointments) use this to record activity entries on contacts.
 *
 * Activity logging is fire-and-forget — it should never block or break the
 * primary action. Callers should invoke with `void logActivity(...)`.
 */

import { db } from "@/lib/db";

/**
 * Logs an activity entry on a contact timeline.
 *
 * Silently swallows errors so it never breaks the caller's primary action.
 * Call with `void logActivity(...)` to avoid blocking.
 */
export async function logActivity(params: {
  contactId: string | null | undefined;
  userId?: string;
  entityType: string;
  entityId?: string;
  action: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!params.contactId) return;
  try {
    await db.activity.create({
      data: {
        contactId: params.contactId,
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null,
      },
    });
  } catch {
    // Silently ignore — activity logging should never break the primary action
  }
}
