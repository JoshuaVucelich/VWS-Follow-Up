/**
 * src/lib/validations/settings.ts
 *
 * Zod schemas for settings-related forms and server actions.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Business settings
// ---------------------------------------------------------------------------

export const businessSettingsSchema = z.object({
  businessName: z
    .string()
    .min(1, "Business name is required")
    .max(100, "Business name is too long")
    .trim(),
  timezone: z.string().min(1, "Timezone is required"),
});

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export const userProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .trim(),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;

// ---------------------------------------------------------------------------
// Invite team member
// ---------------------------------------------------------------------------

export const inviteUserSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
