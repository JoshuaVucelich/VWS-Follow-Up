/**
 * src/features/auth/components/login-form.tsx
 *
 * Login form component.
 *
 * Uses React Hook Form for form state management and Zod for validation.
 * This is a client component because of the form interaction requirements.
 *
 * On submit, calls the Auth.js signIn() function with email/password credentials.
 *
 * TODO: Wire up Auth.js signIn() once authentication is configured.
 *
 * @see src/lib/auth.ts for Auth.js configuration
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { requestPasswordReset } from "@/server/actions/auth";

type LoginFormValues = LoginInput;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function handleForgotPassword() {
    setResetError(null);
    setResetNotice(null);

    const isEmailValid = await trigger("email");
    if (!isEmailValid) {
      setResetError("Enter a valid email address first.");
      return;
    }

    const email = getValues("email")?.trim().toLowerCase();
    if (!email) {
      setResetError("Enter your email address first.");
      return;
    }

    setResetPending(true);
    try {
      const result = await requestPasswordReset({ email });
      if (!result.success) {
        setResetError(
          result.error ?? "Failed to send reset link. Please try again.",
        );
        return;
      }

      setResetNotice(
        `If an account exists for ${email}, we sent a password reset link.`,
      );
    } finally {
      setResetPending(false);
    }
  }

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      // Call the Auth.js credentials sign-in with redirect: false so we can
      // handle the response ourselves and show inline errors if needed.
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        // Auth.js returns "CredentialsSignin" for invalid credentials.
        // We show a user-friendly message instead of the raw error code.
        setServerError("Invalid email or password. Please try again.");
        return;
      }

      // Successful login — redirect to the page they were trying to visit,
      // or fall back to the dashboard.
      const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
      router.push(callbackUrl);
      router.refresh(); // Ensure server components re-render with new session
    } catch (error) {
      setServerError("Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Email field */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          aria-describedby={errors.email ? "email-error" : undefined}
          className={cn(
            errors.email && "border-destructive focus-visible:ring-destructive",
          )}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetPending || isSubmitting}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-60 disabled:no-underline"
          >
            {resetPending ? "Sending reset link…" : "Forgot password?"}
          </button>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-describedby={errors.password ? "password-error" : undefined}
            className={cn(
              "pr-10",
              errors.password &&
                "border-destructive focus-visible:ring-destructive",
            )}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p
            id="password-error"
            className="text-xs text-destructive"
            role="alert"
          >
            {errors.password.message}
          </p>
        )}
        {resetError && (
          <p className="text-xs text-destructive" role="alert">
            {resetError}
          </p>
        )}
        {resetNotice && (
          <p className="text-xs text-green-700" role="status">
            {resetNotice}
          </p>
        )}
      </div>

      {/* Server-side error message */}
      {serverError && (
        <div
          className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {serverError}
        </div>
      )}

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
