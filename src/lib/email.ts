/**
 * src/lib/email.ts
 *
 * Email sending utility for VWS FollowUp.
 *
 * Uses the Resend SDK for transactional email delivery.
 * All configuration is read from environment variables.
 *
 * If RESEND_API_KEY is not set, email sending will log to the console
 * instead of crashing. This allows the app to run without email support
 * during local development.
 *
 * Required environment variables:
 *   RESEND_API_KEY     — API key from https://resend.com/api-keys
 *   RESEND_FROM_EMAIL  — Verified "from" address, e.g. "noreply@yourdomain.com"
 *                        Must be a domain verified in your Resend account.
 *                        Defaults to "onboarding@resend.dev" for testing.
 *
 * @see https://resend.com/docs/introduction
 */

import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Resend client singleton
// ---------------------------------------------------------------------------

let _resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (_resend) return _resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Not an error — email is optional (graceful degradation)
    return null;
  }

  _resend = new Resend(apiKey);
  return _resend;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SendEmailOptions {
  to: string;
  subject: string;
  /** Plain text fallback (always provide this for accessibility) */
  text: string;
  /** HTML body (optional but recommended) */
  html?: string;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
  /** In development/no-API-key mode, the email content is returned here for debugging */
  preview?: { to: string; subject: string; text: string };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sends a transactional email via Resend.
 *
 * If RESEND_API_KEY is not configured, logs the email to the console
 * (development mode) and returns success so dependent flows don't break.
 *
 * @example
 *   const result = await sendEmail({
 *     to: "user@example.com",
 *     subject: "Reset your password",
 *     text: "Click this link: ...",
 *     html: "<p>Click this link: ...</p>",
 *   });
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const client = getResendClient();

  // If no API key is configured, log the email (useful for local dev)
  if (!client) {
    console.log("\n📧 [EMAIL — RESEND_API_KEY not configured, logging to console]");
    console.log(`   To:      ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   Body:\n${options.text}\n`);

    return {
      success: true,
      preview: {
        to: options.to,
        subject: options.subject,
        text: options.text,
      },
    };
  }

  const from =
    process.env.RESEND_FROM_EMAIL ??
    "VWS FollowUp <onboarding@resend.dev>";

  try {
    const { error } = await client.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (error) {
      console.error("[Email] Resend API error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

/**
 * Builds the password reset email content.
 *
 * @param resetUrl — The full URL the user should click to reset their password.
 *                   Example: https://your-app.com/reset-password?token=abc123
 */
export function buildPasswordResetEmail(resetUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "VWS FollowUp";
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const subject = `Reset your ${appName} password`;

  const text = [
    `Hi there,`,
    ``,
    `You requested a password reset for your ${appName} account.`,
    ``,
    `Click the link below to choose a new password. This link expires in 1 hour.`,
    ``,
    resetUrl,
    ``,
    `If you did not request a password reset, you can safely ignore this email.`,
    `Your password will not change until you click the link above.`,
    ``,
    `— ${appName}`,
    appUrl,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 32px;">

    <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">
      Reset your password
    </h1>
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 24px;">
      You requested a password reset for your <strong>${appName}</strong> account.
    </p>
    <p style="font-size: 14px; color: #374151; margin: 0 0 24px;">
      Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
    </p>

    <a href="${resetUrl}"
       style="display: inline-block; background: #2563eb; color: white; font-size: 14px; font-weight: 500;
              text-decoration: none; padding: 10px 20px; border-radius: 6px; margin: 0 0 24px;">
      Reset my password
    </a>

    <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 16px; margin: 0;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color: #6b7280; word-break: break-all;">${resetUrl}</a>
    </p>
    <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;">
      If you didn't request this, ignore this email. Your password won't change.
    </p>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

/**
 * Builds the user invitation email content.
 *
 * @param inviteUrl    — The URL the invited user should visit to accept the invite.
 * @param inviterName  — The name of the person who sent the invite.
 */
export function buildInviteEmail(
  inviteUrl: string,
  inviterName: string
): { subject: string; text: string; html: string } {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "VWS FollowUp";

  const subject = `You've been invited to ${appName}`;

  const text = [
    `Hi there,`,
    ``,
    `${inviterName} has invited you to join their ${appName} workspace.`,
    ``,
    `Click the link below to accept the invitation and create your account.`,
    `This invitation expires in 48 hours.`,
    ``,
    inviteUrl,
    ``,
    `— ${appName}`,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; border: 1px solid #e5e7eb; padding: 32px;">
    <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">
      You've been invited
    </h1>
    <p style="font-size: 14px; color: #374151; margin: 0 0 24px;">
      <strong>${inviterName}</strong> has invited you to join their <strong>${appName}</strong> workspace.
    </p>

    <a href="${inviteUrl}"
       style="display: inline-block; background: #2563eb; color: white; font-size: 14px; font-weight: 500;
              text-decoration: none; padding: 10px 20px; border-radius: 6px; margin: 0 0 24px;">
      Accept invitation
    </a>

    <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 16px; margin: 0;">
      This invitation expires in 48 hours. If you didn't expect this, ignore this email.
    </p>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}
