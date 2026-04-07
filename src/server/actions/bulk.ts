/**
 * src/server/actions/bulk.ts
 *
 * Bulk operations on contacts — archive, stage change, assign.
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/session";
import type { ActionResult } from "@/types";
import type { ContactStage } from "@prisma/client";

export async function bulkArchiveContacts(
  ids: string[],
): Promise<ActionResult<{ count: number }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (ids.length === 0) return { success: false, error: "No contacts selected." };

  try {
    const result = await db.contact.updateMany({
      where: { id: { in: ids } },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });

    revalidatePath("/contacts");
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");

    return { success: true, data: { count: result.count } };
  } catch (error) {
    console.error("[bulkArchiveContacts]", error);
    return { success: false, error: "Failed to archive contacts." };
  }
}

export async function bulkUpdateStage(
  ids: string[],
  stage: ContactStage,
): Promise<ActionResult<{ count: number }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (ids.length === 0) return { success: false, error: "No contacts selected." };

  try {
    const result = await db.contact.updateMany({
      where: { id: { in: ids } },
      data: { stage },
    });

    revalidatePath("/contacts");
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");

    return { success: true, data: { count: result.count } };
  } catch (error) {
    console.error("[bulkUpdateStage]", error);
    return { success: false, error: "Failed to update stage." };
  }
}

export async function bulkAssignContacts(
  ids: string[],
  assignedUserId: string | null,
): Promise<ActionResult<{ count: number }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (ids.length === 0) return { success: false, error: "No contacts selected." };

  try {
    const result = await db.contact.updateMany({
      where: { id: { in: ids } },
      data: { assignedUserId },
    });

    revalidatePath("/contacts");
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");

    return { success: true, data: { count: result.count } };
  } catch (error) {
    console.error("[bulkAssignContacts]", error);
    return { success: false, error: "Failed to assign contacts." };
  }
}
