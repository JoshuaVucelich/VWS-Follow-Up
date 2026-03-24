/**
 * src/lib/validations/auth.ts
 *
 * Zod validation schemas for all authentication-related forms and actions.
 *
 * These schemas live in a shared location so they can be imported by both:
 *   - Client components (for React Hook Form validation)
 *   - Server actions (for input validation before touching the database)
 *
 * This ensures the exact same validation rules apply on both sides, preventing
 * situations where the client accepts input that the server rejects.
 *
 * Schemas exported:
 *   - loginSchema          — email + password for sign-in
 *   - registerSchema       — name + email + password + confirmPassword
 *   - forgotPasswordSchema — email only (to request a reset link)
 *   - resetPasswordSchema  — token + new password + confirm
 *   - changePasswordSchema — current password + new password (for settings page)
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Reusable field validators
// Defined once here so they stay consistent across all schemas below.
// ---------------------------------------------------------------------------

const emailField = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .toLowerCase()
  .trim();

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be under 100 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must include an uppercase letter, a lowercase letter, and a number"
  );

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Used by LoginForm and the Auth.js credentials provider's authorize callback.
 */
export const loginSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Used by RegisterForm and the createUser server action.
 * confirmPassword is validated client-side only; the server action only
 * receives name/email/password after the client confirms they match.
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be under 100 characters")
      .trim(),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * The shape passed to the createUser server action (no confirmPassword needed server-side).
 */
export const createUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: emailField,
  password: passwordField,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

/**
 * Used by ForgotPasswordForm and the requestPasswordReset server action.
 */
export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ---------------------------------------------------------------------------
// Reset password (via email token link)
// ---------------------------------------------------------------------------

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordField,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------
// Change password (from settings page — requires current password)
// ---------------------------------------------------------------------------

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordField,
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
