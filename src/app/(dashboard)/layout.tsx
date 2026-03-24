/**
 * src/app/(dashboard)/layout.tsx
 *
 * Layout for the main authenticated dashboard area.
 *
 * This layout wraps all pages inside the (dashboard) route group:
 *   /dashboard, /contacts, /pipeline, /tasks, /quotes, /appointments, /settings
 *
 * It provides:
 *   1. Authentication guard — redirects unauthenticated users to /login
 *   2. App shell — sidebar navigation + top header + main content area
 *   3. Consistent page structure across all dashboard screens
 *
 * The sidebar is a desktop-only persistent nav. On mobile, navigation
 * is handled by a slide-out drawer (to be implemented in a future milestone).
 *
 * Note: The (dashboard) route group does not affect the URL structure.
 * Pages are accessed at /dashboard, /contacts, etc. — not /(dashboard)/...
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // The middleware handles most redirects, but we verify the session here too
  // as a defense-in-depth measure and to get the typed user object.
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Sidebar — fixed on the left, full height */}
      <AppSidebar user={session.user} />

      {/* Main content area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Top header bar — receives the typed session user */}
        <AppHeader user={session.user} />

        {/* Page content — scrollable */}
        <main className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin">
          <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
