/**
 * src/lib/validations/shared.ts
 *
 * Shared Zod validators reused across multiple validation schemas.
 */

import { z } from "zod";

/** Required email field — uses Zod's built-in email validator. */
export const emailField = z.string().email("Invalid email address").trim();

/**
 * Optional email field — accepts empty string or a valid email.
 * Transforms empty values to undefined.
 */
export const optionalEmailField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email address")
  .transform((v) => v || undefined);
