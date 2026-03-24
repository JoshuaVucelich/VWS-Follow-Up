/**
 * src/server/actions/auth.ts
 *
 * Server actions for authentication-related operations.
 *
 * These actions run exclusively on the server. They handle operations that
 * require database access or secret environment variables and therefore cannot
 * run on the client.
 *
 * Actions exported:
 *   - createUser           — Register a new user account
 *   - requestPasswordReset — Send a password reset email
 *   - resetPassword        — Apply a new password using a valid reset token
 *   - changePassword       — Change password from the settings page (requires current password)
 *   - inviteUser           — Send an invitation email for a new staff member
 *   - acceptInvite         — Complete registration from an invite link
 *
 * All actions return ActionResult<T> — never throw. Components check
 * `result.success` before using `result.data`.
 *
 * @see src/types/index.ts for ActionResult type definition
 */

"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEmail, buildPasswordResetEmail, buildInviteEmail } from "@/lib/email";
import {
  createUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@/lib/validations/auth";
import type { ActionResult } from "@/types";
import type { User } from "@prisma/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** bcrypt cost factor. 12 is a solid balance of security and performance. */
const BCRYPT_ROUNDS = 12;

/** How long a password reset token is valid (in seconds). */
const RESET_TOKEN_EXPIRY_SECONDS = 60 * 60; // 1 hour

/** How long an invite token is valid (in seconds). */
const INVITE_TOKEN_EXPIRY_SECONDS = 48 * 60 * 60; // 48 hours

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------

/**
 * Creates a new user account.
 *
 * Business rules:
 *   - Email must be unique
 *   - If this is the very first user in the database, they become OWNER
 *   - All subsequent users are created as STAFF (they need to be invited)
 *   - Password is hashed with bcrypt before storage
 *
 * Called by: RegisterForm, acceptInvite
 */
export async function createUser(
  input: unknown
): Promise<ActionResult<Pick<User, "id" | "name" | "email" | "role">>> {
  // Validate input
  const validated = createUserSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, password } = validated.data;

  try {
    // Check if email is already registered
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: "An account with this email address already exists.",
        fieldErrors: { email: ["This email is already registered."] },
      };
    }

    // Determine role: the first user in the system becomes the owner.
    // This makes self-hosted setup frictionless — just register and go.
    const userCount = await db.user.count();
    const role = userCount === 0 ? "OWNER" : "STAFF";

    // Hash the password before storing. Never store plaintext.
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create the user record
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return { success: true, data: user };
  } catch (error) {
    console.error("[createUser] Unexpected error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// requestPasswordReset
// ---------------------------------------------------------------------------

/**
 * Generates a password reset token and sends a reset email.
 *
 * Security note: We always return a success response, even if the email
 * is not found. This prevents user enumeration attacks — an attacker
 * cannot tell if an email exists by the response.
 *
 * Called by: ForgotPasswordForm
 */
export async function requestPasswordReset(
  input: unknown
): Promise<ActionResult<{ emailSent: boolean }>> {
  const validated = forgotPasswordSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const { email } = validated.data;

  try {
    // Look up the user — but don't reveal whether they exist
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true },
    });

    // If no user or inactive, return success anyway to prevent enumeration
    if (!user || !user.isActive) {
      return { success: true, data: { emailSent: true } };
    }

    // Generate a cryptographically secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_SECONDS * 1000);

    // Delete any existing reset tokens for this user to prevent token accumulation
    await db.verificationToken.deleteMany({
      where: { identifier: `password-reset:${email}` },
    });

    // Store the hashed token (we send the raw token to the user, store the hash)
    await db.verificationToken.create({
      data: {
        identifier: `password-reset:${email}`,
        token: hashedToken,
        expires,
      },
    });

    // Build the reset URL with the raw (unhashed) token
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Send the email
    const emailContent = buildPasswordResetEmail(resetUrl);
    await sendEmail({
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    return { success: true, data: { emailSent: true } };
  } catch (error) {
    console.error("[requestPasswordReset] Error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// resetPassword
// ---------------------------------------------------------------------------

/**
 * Applies a new password using a valid reset token from an email link.
 *
 * The token is stored as a SHA-256 hash in the database.
 * We hash the incoming token and compare hashes — the raw token never touches the DB.
 *
 * Called by: ResetPasswordForm
 */
export async function resetPassword(input: unknown): Promise<ActionResult<undefined>> {
  const validated = resetPasswordSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { token, password } = validated.data;

  // The form also sends the email (from URL params) to construct the identifier
  const inputWithEmail = input as { email?: string };
  const email = inputWithEmail.email;

  if (!email) {
    return { success: false, error: "Invalid reset link. Please request a new one." };
  }

  try {
    // Hash the incoming raw token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Look up the token record
    const tokenRecord = await db.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: `password-reset:${email}`,
          token: hashedToken,
        },
      },
    });

    if (!tokenRecord) {
      return {
        success: false,
        error: "Invalid or expired reset link. Please request a new password reset.",
      };
    }

    // Check expiry
    if (tokenRecord.expires < new Date()) {
      // Clean up the expired token
      await db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: `password-reset:${email}`,
            token: hashedToken,
          },
        },
      });
      return {
        success: false,
        error: "This reset link has expired. Please request a new one.",
      };
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return { success: false, error: "Account not found." };
    }

    // Hash and apply the new password
    const newPasswordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Delete the used token so it can't be reused
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: `password-reset:${email}`,
          token: hashedToken,
        },
      },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[resetPassword] Error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// changePassword
// ---------------------------------------------------------------------------

/**
 * Changes the password for the currently authenticated user.
 * Requires the current password to be provided and verified.
 *
 * Called by: ChangePasswordForm in Settings
 */
export async function changePassword(
  userId: string,
  input: unknown
): Promise<ActionResult<undefined>> {
  const validated = changePasswordSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { currentPassword, newPassword } = validated.data;

  try {
    // Fetch current password hash
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return { success: false, error: "User not found." };
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      return {
        success: false,
        error: "Current password is incorrect.",
        fieldErrors: { currentPassword: ["Incorrect password."] },
      };
    }

    // Hash and update the new password
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[changePassword] Error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// inviteUser
// ---------------------------------------------------------------------------

/**
 * Sends an invitation email to a new staff member.
 * Only OWNER role can invite users.
 *
 * The invite token is stored in verification_tokens and the recipient
 * visits /register?invite=TOKEN to complete their registration.
 *
 * Called by: TeamMembersSection (settings page)
 */
export async function inviteUser(
  inviterId: string,
  email: string
): Promise<ActionResult<undefined>> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
    // Check inviter is an owner
    const inviter = await db.user.findUnique({
      where: { id: inviterId },
      select: { name: true, role: true },
    });

    if (!inviter || inviter.role !== "OWNER") {
      return { success: false, error: "Only workspace owners can invite users." };
    }

    // Check if this email is already registered
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: "A user with this email address is already in the workspace.",
      };
    }

    // Clean up any prior invite for this email
    await db.verificationToken.deleteMany({
      where: { identifier: `invite:${email}` },
    });

    // Generate invite token
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + INVITE_TOKEN_EXPIRY_SECONDS * 1000);

    await db.verificationToken.create({
      data: {
        identifier: `invite:${email}`,
        token: hashedToken,
        expires,
      },
    });

    // Build invite URL and send email
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/register?invite=${token}&email=${encodeURIComponent(email)}`;

    const emailContent = buildInviteEmail(inviteUrl, inviter.name);
    await sendEmail({
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[inviteUser] Error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// acceptInvite
// ---------------------------------------------------------------------------

/**
 * Validates an invite token and creates the new staff user account.
 *
 * Called by: RegisterForm when ?invite=TOKEN is present in the URL.
 */
export async function acceptInvite(
  token: string,
  email: string,
  input: unknown
): Promise<ActionResult<Pick<User, "id" | "name" | "email" | "role">>> {
  if (!token || !email) {
    return { success: false, error: "Invalid invitation link." };
  }

  try {
    // Verify the invite token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const tokenRecord = await db.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: `invite:${email}`,
          token: hashedToken,
        },
      },
    });

    if (!tokenRecord) {
      return {
        success: false,
        error: "Invalid or expired invitation. Please ask to be re-invited.",
      };
    }

    if (tokenRecord.expires < new Date()) {
      await db.verificationToken.delete({
        where: {
          identifier_token: { identifier: `invite:${email}`, token: hashedToken },
        },
      });
      return {
        success: false,
        error: "This invitation has expired. Please ask to be re-invited.",
      };
    }

    // Create the user as STAFF (invites always create staff, not owners)
    const validated = createUserSchema.safeParse({ ...( input as object), email });
    if (!validated.success) {
      return {
        success: false,
        error: "Invalid input",
        fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    const { name, password } = validated.data;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await db.user.create({
      data: { name, email, passwordHash, role: "STAFF", isActive: true },
      select: { id: true, name: true, email: true, role: true },
    });

    // Consume the invite token
    await db.verificationToken.delete({
      where: {
        identifier_token: { identifier: `invite:${email}`, token: hashedToken },
      },
    });

    return { success: true, data: user };
  } catch (error) {
    console.error("[acceptInvite] Error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
