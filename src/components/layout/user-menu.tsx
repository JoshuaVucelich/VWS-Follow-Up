/**
 * src/components/layout/user-menu.tsx
 *
 * User avatar and dropdown menu at the bottom of the sidebar.
 *
 * Shows the current user's name and role. Clicking opens a dropdown with:
 *   - Link to profile / account settings
 *   - Sign out button
 *
 * This is a client component because the dropdown requires click handling.
 */

"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { getInitials } from "@/lib/utils";

interface UserMenuProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "OWNER" | "STAFF";
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const handleSignOut = () => {
    // Signs out and redirects to the login page.
    // callbackUrl ensures the user lands on /login, not the default Auth.js page.
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm">
      {/* Avatar */}
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold select-none">
        {getInitials(user.name)}
      </div>

      {/* Name and role */}
      <div className="flex-1 overflow-hidden">
        <p className="truncate font-medium leading-none text-foreground">
          {user.name}
        </p>
        <p className="truncate text-xs text-muted-foreground capitalize">
          {user.role.toLowerCase()}
        </p>
      </div>

      {/* Sign out button */}
      <button
        onClick={handleSignOut}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
