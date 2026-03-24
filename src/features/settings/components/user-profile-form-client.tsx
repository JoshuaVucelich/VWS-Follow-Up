/**
 * src/features/settings/components/user-profile-form-client.tsx
 *
 * Client form for user profile and password change.
 */

"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { userProfileSchema, type UserProfileInput } from "@/lib/validations/settings";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { updateUserProfile } from "@/server/actions/settings";
import { changePassword } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface UserProfileFormClientProps {
  userId: string;
  currentName: string;
  currentEmail: string;
}

export function UserProfileFormClient({
  userId,
  currentName,
  currentEmail,
}: UserProfileFormClientProps) {
  // ---------------------------------------------------------------------------
  // Profile form
  // ---------------------------------------------------------------------------
  const [profilePending, startProfileTransition] = useTransition();

  const profileForm = useForm<UserProfileInput>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: { name: currentName },
  });

  function onProfileSubmit(data: UserProfileInput) {
    startProfileTransition(async () => {
      const result = await updateUserProfile(data);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated.");
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Password form
  // ---------------------------------------------------------------------------
  const [passwordPending, startPasswordTransition] = useTransition();

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  function onPasswordSubmit(data: ChangePasswordInput) {
    startPasswordTransition(async () => {
      const result = await changePassword(userId, data);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Password updated.");
        passwordForm.reset();
      }
    });
  }

  return (
    <div className="space-y-6 max-w-md">
      {/* Profile info */}
      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            placeholder="Your name"
            {...profileForm.register("name")}
          />
          {profileForm.formState.errors.name && (
            <p className="text-xs text-destructive">
              {profileForm.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-email">Email address</Label>
          <Input
            id="profile-email"
            type="email"
            value={currentEmail}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email address cannot be changed. Contact your workspace owner if needed.
          </p>
        </div>

        <Button type="submit" disabled={profilePending}>
          {profilePending ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <Separator />

      {/* Change password */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Change password</h3>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw">Current password</Label>
            <Input
              id="current-pw"
              type="password"
              autoComplete="current-password"
              {...passwordForm.register("currentPassword")}
            />
            {passwordForm.formState.errors.currentPassword && (
              <p className="text-xs text-destructive">
                {passwordForm.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register("newPassword")}
            />
            {passwordForm.formState.errors.newPassword && (
              <p className="text-xs text-destructive">
                {passwordForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirm new password</Label>
            <Input
              id="confirm-pw"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register("confirmNewPassword")}
            />
            {passwordForm.formState.errors.confirmNewPassword && (
              <p className="text-xs text-destructive">
                {passwordForm.formState.errors.confirmNewPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" variant="outline" disabled={passwordPending}>
            {passwordPending ? "Updating…" : "Change password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
