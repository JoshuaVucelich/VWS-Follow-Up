/**
 * src/features/settings/components/user-profile-form.tsx
 *
 * UserProfileForm — two sections:
 *   1. Display name change (calls updateUserProfile)
 *   2. Password change (calls changePassword from auth actions)
 *
 * Server component wrapper that fetches the current user, then passes
 * to client sub-components for interactivity.
 */

import { getCurrentUser } from "@/lib/session";
import { UserProfileFormClient } from "./user-profile-form-client";

export async function UserProfileForm() {
  const user = await getCurrentUser();

  return (
    <UserProfileFormClient
      userId={user.id}
      currentName={user.name ?? ""}
      currentEmail={user.email ?? ""}
    />
  );
}
