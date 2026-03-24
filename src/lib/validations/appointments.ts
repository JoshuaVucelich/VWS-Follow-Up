/**
 * src/lib/validations/appointments.ts
 *
 * Zod schemas for appointment-related forms and server actions.
 *
 * Shared between client (React Hook Form) and server (actions) so the same
 * validation rules run on both sides.
 */

import { z } from "zod";
import { AppointmentType, AppointmentStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Appointment form schema (create / edit)
// ---------------------------------------------------------------------------

export const appointmentFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title is too long")
    .trim(),

  type: z.nativeEnum(AppointmentType).default("SERVICE_APPOINTMENT"),

  // startAt is required — datetime-local input sends a string like "2025-01-15T14:00"
  startAt: z
    .string()
    .min(1, "Start date/time is required")
    .transform((v) => {
      const d = new Date(v);
      if (isNaN(d.getTime())) throw new Error("Invalid date");
      return d;
    }),

  endAt: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      if (!v) return undefined;
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    }),

  location: z
    .string()
    .max(300, "Location is too long")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),

  status: z.nativeEnum(AppointmentStatus).default("SCHEDULED"),

  assignedUserId: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),

  notes: z
    .string()
    .max(5000, "Notes are too long")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),

  // Required — every appointment must belong to a contact.
  contactId: z
    .string()
    .min(1, "Contact is required")
    .trim(),
});

/** Output type (after Zod transforms) — used for server action args. */
export type AppointmentFormInput = z.infer<typeof appointmentFormSchema>;
/** Input type (before transforms) — used for React Hook Form defaultValues. */
export type AppointmentFormValues = z.input<typeof appointmentFormSchema>;

// ---------------------------------------------------------------------------
// Appointment status update
// ---------------------------------------------------------------------------

export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;

// ---------------------------------------------------------------------------
// Appointment list filters (URL search params)
// ---------------------------------------------------------------------------

export const appointmentFiltersSchema = z.object({
  type: z.nativeEnum(AppointmentType).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  assignedUserId: z.string().optional(),
  // "upcoming" — only show appointments in the future
  upcoming: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export type AppointmentFiltersInput = z.infer<typeof appointmentFiltersSchema>;
