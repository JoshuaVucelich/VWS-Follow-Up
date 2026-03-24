/**
 * src/lib/validations/tasks.ts
 *
 * Zod schemas for task-related forms and server actions.
 *
 * Shared between client (React Hook Form) and server (actions) so the same
 * validation rules run on both sides.
 */

import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

function coerceOptionalDate(value: string | Date | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

// ---------------------------------------------------------------------------
// Task form schema (create / edit)
// ---------------------------------------------------------------------------

export const taskFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title is too long")
    .trim(),
  description: z
    .string()
    .max(2000, "Description is too long")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  priority: z.nativeEnum(TaskPriority).default("MEDIUM"),
  assignedUserId: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  contactId: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  dueAt: z
    .union([z.string(), z.date()])
    .optional()
    .or(z.literal(""))
    .transform((v) => coerceOptionalDate(v)),
});

/** Output type (after Zod transforms) — used for server action args. */
export type TaskFormInput = z.infer<typeof taskFormSchema>;
/** Input type (before transforms) — used for React Hook Form defaultValues. */
export type TaskFormValues = z.input<typeof taskFormSchema>;

// ---------------------------------------------------------------------------
// Complete / status update
// ---------------------------------------------------------------------------

export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

// ---------------------------------------------------------------------------
// Task list filters (URL search params)
// ---------------------------------------------------------------------------

export const taskFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedUserId: z.string().optional(),
  // "overdue" flag — only show tasks with dueAt in the past
  overdue: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export type TaskFiltersInput = z.infer<typeof taskFiltersSchema>;
