/**
 * src/features/auth/components/forgot-password-form.tsx
 *
 * Forgot password form component.
 *
 * Collects the user's email and calls the requestPasswordReset server action.
 * On success, shows a confirmation message instead of the form.
 *
 * Security: Always shows the same success message regardless of whether the
 * email is registered — this prevents user enumeration attacks.
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { requestPasswordReset } from "@/server/actions/auth";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

type ForgotPasswordFormValues = ForgotPasswordInput;

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setServerError(null);

    const result = await requestPasswordReset({ email: values.email });

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    // Show success message — even if the email wasn't found
    setSubmitted(true);
  };

  // Success state — show confirmation message
  if (submitted) {
    return (
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-base font-medium">Check your inbox</h2>
        <p className="text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{getValues("email")}</span>, we sent a
          reset link. It expires in 1 hour.
        </p>
        <p className="text-xs text-muted-foreground pt-2">
          Don&apos;t see it? Check your spam folder.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            className={cn("pl-8", errors.email && "border-destructive")}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-xs text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {serverError && (
        <div
          className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Sending reset link…" : "Send reset link"}
      </Button>
    </form>
  );
}
