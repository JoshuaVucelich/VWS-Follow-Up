/**
 * src/app/(auth)/reset-password/page.tsx
 *
 * Password reset page — accessed via the link in the reset email.
 *
 * The URL contains: /reset-password?token=RAW_TOKEN&email=user@example.com
 * Both params are required. If missing, the user is shown an error message
 * and redirected to request a new reset link.
 *
 * URL: /reset-password?token=...&email=...
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Set New Password",
};

interface ResetPasswordPageProps {
  searchParams: {
    token?: string;
    email?: string;
  };
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token, email } = searchParams;

  // If the URL is missing required params, show a helpful error
  if (!token || !email) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold tracking-tight">Invalid reset link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This password reset link is missing required information.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a strong password for{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
      </div>

      {/* Pass token and email to the form — it sends them to the server action */}
      <ResetPasswordForm token={token} email={email} />

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
