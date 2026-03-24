/**
 * src/app/(auth)/login/page.tsx
 *
 * Login page.
 *
 * Renders the login form inside the auth layout shell.
 * The actual form logic lives in the LoginForm feature component so that
 * it can be a client component (React Hook Form requires the client) while
 * keeping this file a server component.
 *
 * URL: /login
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign In",
};

interface LoginPageProps {
  searchParams: {
    registered?: string;
    error?: string;
  };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const justRegistered = searchParams.registered === "1";
  // Auth.js passes error codes via ?error= when redirecting to the custom signIn page
  const authError = searchParams.error;

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your workspace
        </p>
      </div>

      {/* Show a success notice when redirected here after registration */}
      {justRegistered && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Account created! Sign in to get started.
        </div>
      )}

      {/* Show Auth.js error codes in a user-friendly way */}
      {authError && authError !== "CredentialsSignin" && (
        <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          Something went wrong. Please try again.
        </div>
      )}

      {/* LoginForm is a client component — see features/auth/components/login-form.tsx */}
      <LoginForm />

      <div className="mt-6 text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Forgot your password?
        </Link>
      </div>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </div>
    </div>
  );
}
