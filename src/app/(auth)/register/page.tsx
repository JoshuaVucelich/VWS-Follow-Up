/**
 * src/app/(auth)/register/page.tsx
 *
 * Registration / first-time setup page.
 *
 * Two flows are handled here:
 *
 *   1. First-time setup — the very first user to register becomes the OWNER.
 *      Visiting /register with no params shows the normal signup form.
 *
 *   2. Invite acceptance — staff invited by the owner visit this page with
 *      ?invite=TOKEN&email=user@example.com in the URL. The RegisterForm
 *      detects the invite params and calls the acceptInvite action instead.
 *
 * The createUser server action enforces the "first user = owner" rule on the
 * server side, so this cannot be bypassed via the client.
 *
 * URL: /register
 * URL: /register?invite=TOKEN&email=user@example.com
 */

import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create Account",
};

interface RegisterPageProps {
  searchParams: {
    invite?: string;
    email?: string;
  };
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const isInvite = !!searchParams.invite;

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isInvite ? "Accept your invitation" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isInvite
            ? "Complete your details to join the workspace."
            : "Set up your workspace and get started."}
        </p>
      </div>

      {/* RegisterForm reads invite params from the URL via useSearchParams() */}
      <RegisterForm />

      <div className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
