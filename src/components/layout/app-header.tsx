/**
 * src/components/layout/app-header.tsx
 *
 * Top header bar that appears above all dashboard pages.
 *
 * Contains:
 *   - Mobile menu toggle (hamburger) — on the left, visible on small screens
 *   - Global search input — center (or left on desktop)
 *   - Right side: notification bell (placeholder), user avatar dropdown
 *
 * Server component — MobileNav is the client sub-component that handles
 * the mobile drawer interactivity.
 */

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "@/components/shared/global-search";
import { SearchTrigger } from "@/components/shared/search-trigger";

interface AppHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "OWNER" | "STAFF";
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
      {/* Mobile nav drawer — shown only on small screens */}
      <MobileNav user={user} />

      {/* Global search — click opens command palette (Cmd+K) */}
      <SearchTrigger />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notification bell — placeholder, implement in future milestone */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative hidden sm:flex"
        >
          <Bell className="h-5 w-5" />
          {/* Badge for unread count — shown when there are overdue tasks */}
          {/* <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" /> */}
        </Button>

        {/* User info — shows name, role badge */}
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold select-none">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden lg:block">
            <p className="font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user.role.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      <GlobalSearch />
    </header>
  );
}
