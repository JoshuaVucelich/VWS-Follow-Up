/**
 * src/lib/validations/quotes.ts
 *
 * Zod schemas for quote-related forms and server actions.
 *
 * Shared between client (React Hook Form) and server (actions) so the same
 * validation rules run on both sides.
 */

import { z } from "zod";
import { QuoteStatus } from "@prisma/client";

function coerceOptionalDate(value: string | Date | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? undefined : value;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

// ---------------------------------------------------------------------------
// Quote form schema (create / edit)
// ---------------------------------------------------------------------------

export const quoteFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title is too long")
    .trim(),

  // Amount stored as a decimal. The form sends a string from <input type="number">.
  // We coerce it to a number; undefined/empty means no amount set.
  amount: z
    .union([z.string(), z.number()])
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      if (!v) return undefined;
      const n = typeof v === "number" ? v : parseFloat(v);
      return isNaN(n) ? undefined : n;
    }),

  description: z
    .string()
    .max(5000, "Description is too long")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),

  status: z.nativeEnum(QuoteStatus).default("DRAFT"),

  sentAt: z
    .union([z.string(), z.date()])
    .optional()
    .or(z.literal(""))
    .transform((v) => coerceOptionalDate(v)),

  followUpAt: z
    .union([z.string(), z.date()])
    .optional()
    .or(z.literal(""))
    .transform((v) => coerceOptionalDate(v)),

  // Required — every quote must belong to a contact.
  contactId: z
    .string()
    .min(1, "Contact is required")
    .trim(),
});

/** Output type (after Zod transforms) — used for server action args. */
export type QuoteFormInput = z.infer<typeof quoteFormSchema>;
/** Input type (before transforms) — used for React Hook Form defaultValues. */
export type QuoteFormValues = z.input<typeof quoteFormSchema>;

// ---------------------------------------------------------------------------
// Quote status update
// ---------------------------------------------------------------------------

export const updateQuoteStatusSchema = z.object({
  status: z.nativeEnum(QuoteStatus),
});

export type UpdateQuoteStatusInput = z.infer<typeof updateQuoteStatusSchema>;

// ---------------------------------------------------------------------------
// Quote list filters (URL search params)
// ---------------------------------------------------------------------------

export const quoteFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(QuoteStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export type QuoteFiltersInput = z.infer<typeof quoteFiltersSchema>;
