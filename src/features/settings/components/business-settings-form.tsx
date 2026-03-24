/**
 * src/features/settings/components/business-settings-form.tsx
 *
 * BusinessSettingsForm — edit the workspace name and timezone.
 *
 * Owner-only: staff users see a read-only notice.
 * Fetches the current BusinessSettings record server-side, passes to a
 * client sub-component that calls updateBusinessSettings on submit.
 */

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { BusinessSettingsFormClient } from "./business-settings-form-client";

export async function BusinessSettingsForm() {
  const [settings, currentUser] = await Promise.all([
    db.businessSettings.findFirst(),
    getCurrentUser(),
  ]);

  return (
    <BusinessSettingsFormClient
      settings={settings ? { businessName: settings.businessName, timezone: settings.timezone } : null}
      isOwner={currentUser.role === "OWNER"}
    />
  );
}
