/**
 * src/lib/validations/contacts.ts
 *
 * Zod schemas for contact-related forms and server actions.
 *
 * Shared between client (React Hook Form) and server (actions) so the same
 * rules run on both sides. Optional string fields use .or(z.literal("")) so
 * React Hook Form's default empty string doesn't fail validation.
 */

import { z } from "zod";
import { ContactSource, ContactStage, ContactType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Optional string — trims whitespace and treats empty string as undefined. */
const optStr = (max = 255) =>
  z.string().max(max).trim().optional().or(z.literal("")).transform((v) => v || undefined);

/** Optional URL — accepts empty string or a valid-ish URL. */
const optUrl = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (v) => !v || /^https?:\/\/.+/.test(v),
    "Must be a valid URL starting with http:// or https://"
  )
  .transform((v) => v || undefined);

// ---------------------------------------------------------------------------
// Contact form schema
// ---------------------------------------------------------------------------

/**
 * Used by the create/edit contact form and the createContact/updateContact actions.
 */
export const contactFormSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name is too long")
    .trim(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name is too long")
    .trim(),
  businessName: optStr(200),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email address")
    .transform((v) => v || undefined),
  phone: optStr(30),
  altPhone: optStr(30),
  addressLine1: optStr(200),
  addressLine2: optStr(200),
  city: optStr(100),
  state: optStr(100),
  zip: optStr(20),
  website: optUrl,
  source: z.nativeEnum(ContactSource).default("OTHER"),
  stage: z.nativeEnum(ContactStage).default("NEW_LEAD"),
  type: z.nativeEnum(ContactType).default("LEAD"),
  assignedUserId: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  notes: z.string().max(2000, "Note is too long").optional().or(z.literal("")).transform((v) => v || undefined),
  nextFollowUpAt: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      if (!v) return undefined;
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    }),
});

/** Output type (after Zod transforms) — used for server action args. */
export type ContactFormInput = z.infer<typeof contactFormSchema>;
/** Input type (before transforms) — used for React Hook Form defaultValues. */
export type ContactFormValues = z.input<typeof contactFormSchema>;

// ---------------------------------------------------------------------------
// Stage update (quick update from pipeline board or detail page)
// ---------------------------------------------------------------------------

export const updateStageSchema = z.object({
  stage: z.nativeEnum(ContactStage),
});

export type UpdateStageInput = z.infer<typeof updateStageSchema>;

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------

export const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50, "Tag name is too long").trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

// ---------------------------------------------------------------------------
// Note
// ---------------------------------------------------------------------------

export const addNoteSchema = z.object({
  content: z.string().min(1, "Note cannot be empty").max(5000, "Note is too long").trim(),
  type: z.enum(["GENERAL", "CALL_LOG", "MEETING_NOTE", "QUOTE_NOTE", "APPOINTMENT_NOTE", "STATUS_CHANGE"]).default("GENERAL"),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;

// ---------------------------------------------------------------------------
// Contact filters (URL search params parsing)
// ---------------------------------------------------------------------------

export const contactFiltersSchema = z.object({
  search: z.string().optional(),
  stage: z.nativeEnum(ContactStage).optional(),
  type: z.nativeEnum(ContactType).optional(),
  source: z.nativeEnum(ContactSource).optional(),
  assignedUserId: z.string().optional(),
  archived: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(["name", "createdAt", "nextFollowUpAt", "stage"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ContactFiltersInput = z.infer<typeof contactFiltersSchema>;
