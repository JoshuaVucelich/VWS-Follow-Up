/**
 * src/server/actions/settings.ts
 *
 * Server actions for workspace and user settings mutations.
 *
 * Actions:
 *   - updateBusinessSettings — Update workspace name and timezone (owner only)
 *   - updateUserProfile      — Update the signed-in user's display name
 *   - changeUserRole         — Change another user's role (owner only)
 *   - deactivateUser         — Disable a user's access (owner only)
 *   - reactivateUser         — Re-enable a user's access (owner only)
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/session";
import {
  businessSettingsSchema,
  userProfileSchema,
} from "@/lib/validations/settings";
import type { ActionResult } from "@/types";

// ---------------------------------------------------------------------------
// updateBusinessSettings
// ---------------------------------------------------------------------------

export async function updateBusinessSettings(
  input: unknown
): Promise<ActionResult<{ businessName: string; timezone: string }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only workspace owners can update business settings." };
  }

  const validated = businessSettingsSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { businessName, timezone } = validated.data;

  // Singleton pattern: find-then-update-or-create
  const existing = await db.businessSettings.findFirst({ select: { id: true } });

  const settings = existing
    ? await db.businessSettings.update({
        where: { id: existing.id },
        data: { businessName, timezone },
        select: { businessName: true, timezone: true },
      })
    : await db.businessSettings.create({
        data: { businessName, timezone },
        select: { businessName: true, timezone: true },
      });

  revalidatePath("/settings");

  return { success: true, data: settings };
}

// ---------------------------------------------------------------------------
// updateUserProfile
// ---------------------------------------------------------------------------

export async function updateUserProfile(
  input: unknown
): Promise<ActionResult<{ name: string }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = userProfileSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const user = await db.user.update({
    where: { id: auth.user.id },
    data: { name: validated.data.name },
    select: { name: true },
  });

  revalidatePath("/settings");

  return { success: true, data: user };
}

// ---------------------------------------------------------------------------
// changeUserRole
// ---------------------------------------------------------------------------

export async function changeUserRole(
  targetUserId: string,
  role: "OWNER" | "STAFF"
): Promise<ActionResult<{ id: string; role: string }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only owners can change user roles." };
  }

  if (targetUserId === auth.user.id) {
    return { success: false, error: "You cannot change your own role." };
  }

  const user = await db.user.update({
    where: { id: targetUserId },
    data: { role },
    select: { id: true, role: true },
  });

  revalidatePath("/settings");

  return { success: true, data: user };
}

// ---------------------------------------------------------------------------
// deactivateUser
// ---------------------------------------------------------------------------

export async function deactivateUser(
  targetUserId: string
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only owners can deactivate users." };
  }

  if (targetUserId === auth.user.id) {
    return { success: false, error: "You cannot deactivate your own account." };
  }

  await db.user.update({
    where: { id: targetUserId },
    data: { isActive: false },
  });

  revalidatePath("/settings");

  return { success: true, data: { id: targetUserId } };
}

// ---------------------------------------------------------------------------
// reactivateUser
// ---------------------------------------------------------------------------

export async function reactivateUser(
  targetUserId: string
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only owners can reactivate users." };
  }

  await db.user.update({
    where: { id: targetUserId },
    data: { isActive: true },
  });

  revalidatePath("/settings");

  return { success: true, data: { id: targetUserId } };
}
