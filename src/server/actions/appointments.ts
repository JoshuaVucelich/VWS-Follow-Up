/**
 * src/server/actions/appointments.ts
 *
 * Server actions for appointment mutations (create, update, update status, delete).
 *
 * All actions:
 *   1. Verify the user is authenticated
 *   2. Validate input with Zod
 *   3. Perform the database operation
 *   4. Log an activity entry on the linked contact
 *   5. Revalidate affected Next.js cache paths
 *   6. Return ActionResult<T>
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/session";
import {
  appointmentFormSchema,
  updateAppointmentStatusSchema,
} from "@/lib/validations/appointments";
import { logActivity } from "@/server/lib/activity-logger";
import type { ActionResult } from "@/types";
import type { Appointment } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function logAppointmentActivity(
  contactId: string | null | undefined,
  userId: string | undefined,
  action: string,
  metadata?: Record<string, unknown>,
) {
  void logActivity({ contactId, userId, entityType: "appointment", action, metadata });
}

function revalidateAppointmentPaths(contactId?: string) {
  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

// ---------------------------------------------------------------------------
// createAppointment
// ---------------------------------------------------------------------------

export async function createAppointment(
  input: unknown
): Promise<ActionResult<Appointment>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = appointmentFormSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { contactId, ...rest } = validated.data;

  try {
    const appointment = await db.appointment.create({
      data: {
        ...rest,
        contactId,
      },
    });

    logAppointmentActivity(contactId, auth.user.id, "appointment.created", {
      appointmentId: appointment.id,
      title: appointment.title,
      type: appointment.type,
      startAt: appointment.startAt.toISOString(),
    });

    revalidateAppointmentPaths(contactId);

    return { success: true, data: appointment };
  } catch (error) {
    console.error("[createAppointment]", error);
    return { success: false, error: "Failed to create appointment. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// updateAppointment
// ---------------------------------------------------------------------------

export async function updateAppointment(
  id: string,
  input: unknown
): Promise<ActionResult<Appointment>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = appointmentFormSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { contactId, ...rest } = validated.data;

  try {
    const appointment = await db.appointment.update({
      where: { id },
      data: { ...rest },
    });

    revalidateAppointmentPaths(appointment.contactId);

    return { success: true, data: appointment };
  } catch (error) {
    console.error("[updateAppointment]", error);
    return { success: false, error: "Failed to update appointment. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// updateAppointmentStatus
// ---------------------------------------------------------------------------

export async function updateAppointmentStatus(
  id: string,
  input: unknown
): Promise<ActionResult<Appointment>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = updateAppointmentStatusSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: "Invalid status" };
  }

  try {
    const appointment = await db.appointment.update({
      where: { id },
      data: { status: validated.data.status },
    });

    logAppointmentActivity(
      appointment.contactId,
      auth.user.id,
      "appointment.status_changed",
      { appointmentId: appointment.id, title: appointment.title, status: validated.data.status },
    );

    revalidateAppointmentPaths(appointment.contactId);

    return { success: true, data: appointment };
  } catch (error) {
    console.error("[updateAppointmentStatus]", error);
    return { success: false, error: "Failed to update appointment status." };
  }
}

// ---------------------------------------------------------------------------
// deleteAppointment
// ---------------------------------------------------------------------------

export async function deleteAppointment(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only owners can delete appointments." };
  }

  try {
    const appointment = await db.appointment.delete({ where: { id } });

    revalidateAppointmentPaths(appointment.contactId);

    return { success: true, data: { id: appointment.id } };
  } catch (error) {
    console.error("[deleteAppointment]", error);
    return { success: false, error: "Failed to delete appointment." };
  }
}
