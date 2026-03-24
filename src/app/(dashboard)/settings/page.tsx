/**
 * src/app/(dashboard)/settings/page.tsx
 *
 * Settings page.
 *
 * Organized into sections:
 *   - Business Settings (name, logo, timezone) — owner only
 *   - User Profile (name, email, password, profile photo)
 *   - Team Members (invite, manage roles) — owner only
 *   - Email / SMTP configuration — owner only
 *   - Import / Export — available to all users
 *   - Danger Zone (reset, delete) — owner only
 *
 * URL: /settings
 */

import type { Metadata } from "next";
import { BusinessSettingsForm } from "@/features/settings/components/business-settings-form";
import { UserProfileForm } from "@/features/settings/components/user-profile-form";
import { TeamMembersSection } from "@/features/settings/components/team-members-section";
import { ImportExportSection } from "@/features/settings/components/import-export-section";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your workspace and account preferences.
        </p>
      </div>

      <Separator />

      {/* Business settings */}
      <section>
        <h2 className="text-lg font-medium mb-4">Business</h2>
        <BusinessSettingsForm />
      </section>

      <Separator />

      {/* User profile */}
      <section>
        <h2 className="text-lg font-medium mb-4">Your Profile</h2>
        <UserProfileForm />
      </section>

      <Separator />

      {/* Team members */}
      <section>
        <h2 className="text-lg font-medium mb-4">Team Members</h2>
        <TeamMembersSection />
      </section>

      <Separator />

      {/* Import / Export */}
      <section>
        <h2 className="text-lg font-medium mb-4">Import &amp; Export</h2>
        <ImportExportSection />
      </section>
    </div>
  );
}
