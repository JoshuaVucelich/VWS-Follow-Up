/**
 * src/app/(dashboard)/dashboard/page.tsx
 *
 * Main dashboard page.
 *
 * The dashboard is the first thing users see after logging in. It should
 * answer the question "what needs my attention right now?" at a glance.
 *
 * Layout:
 *   - Top row: summary stat cards (new leads, tasks due, quotes awaiting, etc.)
 *   - Middle row: "Due Today" task list + upcoming appointments
 *   - Bottom row: recent contacts + overdue follow-ups
 *
 * All data fetching happens in server components (this file and the feature
 * components it renders). No client-side fetching on the dashboard for v1 —
 * server rendering keeps it fast and avoids loading spinners.
 *
 * URL: /dashboard
 */

import type { Metadata } from "next";
import { DashboardStats } from "@/features/dashboard/components/dashboard-stats";
import { TasksDueToday } from "@/features/dashboard/components/tasks-due-today";
import { UpcomingAppointments } from "@/features/dashboard/components/upcoming-appointments";
import { RecentContacts } from "@/features/dashboard/components/recent-contacts";
import { OverdueFollowUps } from "@/features/dashboard/components/overdue-follow-ups";
import { QuotesPendingResponse } from "@/features/dashboard/components/quotes-pending-response";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { SocialMediaLinks } from "@/features/dashboard/components/social-media-links";
import { getActiveUsers } from "@/server/queries/users";
import { getContactsForPicker } from "@/server/queries/contacts";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const [users, contacts] = await Promise.all([
    getActiveUsers(),
    getContactsForPicker(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what needs your attention today.
          </p>
        </div>

        {/* Quick action buttons */}
        <QuickActions users={users} contacts={contacts} />
      </div>

      {/* Summary stat cards */}
      <DashboardStats />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <TasksDueToday />
          <OverdueFollowUps />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <UpcomingAppointments />
          <QuotesPendingResponse />
        </div>
      </div>

      {/* Full-width bottom section */}
      <RecentContacts />

      {/* Social media quick links */}
      <SocialMediaLinks />
    </div>
  );
}
