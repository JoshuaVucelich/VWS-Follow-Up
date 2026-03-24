/**
 * src/features/auth/components/register-form.tsx
 *
 * Registration form component.
 *
 * Collects name, email, and password for the new account.
 * Submits to the createUser server action which handles:
 *   1. Validating the input
 *   2. Checking if email is already taken
 *   3. Hashing the password
 *   4. Creating the user record
 *   5. Optionally sending a verification email
 *
 * TODO: Wire up to the createUser server action.
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
import { createUser, acceptInvite } from "@/server/actions/auth";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

type RegisterFormValues = RegisterInput;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Pull invite params from the URL if present (invited users register this way)
  const inviteToken = searchParams.get("invite");
  const inviteEmail = searchParams.get("email") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    // Pre-fill email from invite link if available
    defaultValues: { email: inviteEmail },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);

    try {
      let result;

      if (inviteToken && inviteEmail) {
        // Invited user — use acceptInvite to validate the token and create the account
        result = await acceptInvite(inviteToken, inviteEmail, {
          name: values.name,
          email: inviteEmail,
          password: values.password,
        });
      } else {
        // Normal registration — first user becomes owner, others become staff
        result = await createUser({
          name: values.name,
          email: values.email,
          password: values.password,
        });
      }

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      // Account created — automatically sign the user in
      const signInResult = await signIn("credentials", {
        email: inviteEmail || values.email,
        password: values.password,
        redirect: false,
      });

      if (!signInResult || signInResult.error) {
        // Account was created but auto sign-in failed — redirect to login
        router.push("/login?registered=1");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setServerError("Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          autoFocus
          placeholder="Alex Johnson"
          className={cn(errors.name && "border-destructive")}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className={cn(errors.email && "border-destructive")}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className={cn("pr-10", errors.password && "border-destructive")}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Repeat your password"
          className={cn(errors.confirmPassword && "border-destructive")}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive" role="alert">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div
          className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {serverError}
        </div>
      )}

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
