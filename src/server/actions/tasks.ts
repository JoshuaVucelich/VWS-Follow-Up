/**
 * src/server/actions/tasks.ts
 *
 * Server actions for task mutations (create, update, complete, cancel, delete).
 *
 * All actions:
 *   1. Verify the user is authenticated
 *   2. Validate input with Zod
 *   3. Perform the database operation
 *   4. Log an activity entry when a contact is linked
 *   5. Revalidate affected Next.js cache paths
 *   6. Return ActionResult<T>
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/session";
import { taskFormSchema, updateTaskStatusSchema } from "@/lib/validations/tasks";
import { logActivity } from "@/server/lib/activity-logger";
import type { ActionResult } from "@/types";
import type { Task } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function logTaskActivity(
  contactId: string | null | undefined,
  userId: string | undefined,
  action: string,
  metadata?: Record<string, unknown>,
) {
  void logActivity({ contactId, userId, entityType: "task", action, metadata });
}

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------

export async function createTask(input: unknown): Promise<ActionResult<Task>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = taskFormSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = validated.data;

  try {
    const task = await db.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueAt: data.dueAt,
        assignedUserId: data.assignedUserId,
        contactId: data.contactId,
        createdById: auth.user.id,
      },
    });

    logTaskActivity(data.contactId, auth.user.id, "task.created", {
      taskTitle: data.title,
      priority: data.priority,
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    if (data.contactId) revalidatePath(`/contacts/${data.contactId}`);

    return { success: true, data: task };
  } catch (error) {
    console.error("[createTask]", error);
    return { success: false, error: "Failed to create task. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// updateTask
// ---------------------------------------------------------------------------

export async function updateTask(
  id: string,
  input: unknown
): Promise<ActionResult<Task>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = taskFormSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = validated.data;

  try {
    const task = await db.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueAt: data.dueAt,
        assignedUserId: data.assignedUserId,
        contactId: data.contactId,
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);

    return { success: true, data: task };
  } catch (error) {
    console.error("[updateTask]", error);
    return { success: false, error: "Failed to update task. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// completeTask
// ---------------------------------------------------------------------------

export async function completeTask(id: string): Promise<ActionResult<undefined>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  try {
    const task = await db.task.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
      select: { contactId: true, title: true },
    });

    logTaskActivity(task.contactId, auth.user.id, "task.completed", {
      taskTitle: task.title,
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[completeTask]", error);
    return { success: false, error: "Failed to complete task." };
  }
}

// ---------------------------------------------------------------------------
// reopenTask
// ---------------------------------------------------------------------------

export async function reopenTask(id: string): Promise<ActionResult<undefined>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  try {
    const task = await db.task.update({
      where: { id },
      data: { status: "OPEN", completedAt: null },
      select: { contactId: true },
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[reopenTask]", error);
    return { success: false, error: "Failed to reopen task." };
  }
}

// ---------------------------------------------------------------------------
// cancelTask
// ---------------------------------------------------------------------------

export async function cancelTask(id: string): Promise<ActionResult<undefined>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  try {
    const task = await db.task.update({
      where: { id },
      data: { status: "CANCELED" },
      select: { contactId: true },
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[cancelTask]", error);
    return { success: false, error: "Failed to cancel task." };
  }
}

// ---------------------------------------------------------------------------
// deleteTask (hard delete — owner only)
// ---------------------------------------------------------------------------

export async function deleteTask(id: string): Promise<ActionResult<undefined>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only workspace owners can permanently delete tasks." };
  }

  try {
    const task = await db.task.delete({
      where: { id },
      select: { contactId: true },
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    if (task.contactId) revalidatePath(`/contacts/${task.contactId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[deleteTask]", error);
    return { success: false, error: "Failed to delete task." };
  }
}
