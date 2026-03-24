/**
 * src/components/layout/app-sidebar.tsx
 *
 * Main application sidebar navigation.
 *
 * This is a server component — it receives user data as props from the
 * dashboard layout and renders a static sidebar. Active link detection
 * is handled by the NavLink client sub-component which uses usePathname().
 *
 * Structure:
 *   - App logo / branding at the top
 *   - Primary navigation links (main pages)
 *   - Bottom section: user avatar + name + sign out
 *
 * The sidebar is hidden on mobile. A mobile nav drawer will be added
 * in a future milestone using a sheet component.
 */

"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  CheckSquare,
  FileText,
  CalendarDays,
  Settings,
} from "lucide-react";
import { SidebarNavLink } from "./sidebar-nav-link";
import { UserMenu } from "./user-menu";

/**
 * Navigation items for the primary sidebar.
 * Each item maps to a top-level route in the application.
 *
 * To add a new nav item:
 *   1. Add an entry to this array
 *   2. Create the corresponding page in src/app/(dashboard)/
 */
const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: Users,
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    icon: GitBranch,
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: CheckSquare,
  },
  {
    href: "/quotes",
    label: "Quotes",
    icon: FileText,
  },
  {
    href: "/appointments",
    label: "Appointments",
    icon: CalendarDays,
  },
] as const;

interface AppSidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "OWNER" | "STAFF";
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card">
      {/* Logo / branding */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold text-foreground hover:opacity-80 transition-opacity"
        >
          {/* Logo mark — swap this for an <Image> or SVG when you have a real logo */}
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold select-none">
            VW
          </div>
          <span className="text-sm">VWS FollowUp</span>
        </Link>
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1" role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <SidebarNavLink
                href={item.href}
                label={item.label}
                icon={item.icon}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section: settings + user */}
      <div className="border-t border-border p-2 space-y-1">
        <SidebarNavLink
          href="/settings"
          label="Settings"
          icon={Settings}
        />

        {/* User menu / profile */}
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
