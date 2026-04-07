/**
 * src/components/layout/mobile-nav.tsx
 *
 * Mobile navigation drawer — shown on small screens.
 *
 * Uses Radix UI Dialog as a side-sheet pattern (positioned left, full-height).
 * The hamburger trigger is rendered inside AppHeader, which passes down the
 * nav items and user info.
 *
 * Clicking any nav link closes the drawer automatically.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  GitBranch,
  CheckSquare,
  FileText,
  CalendarDays,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/contacts",      label: "Contacts",     icon: Users },
  { href: "/pipeline",      label: "Pipeline",     icon: GitBranch },
  { href: "/tasks",         label: "Tasks",        icon: CheckSquare },
  { href: "/quotes",        label: "Quotes",       icon: FileText },
  { href: "/appointments",  label: "Appointments", icon: CalendarDays },
  { href: "/settings",      label: "Settings",     icon: Settings },
] as const;

interface MobileNavProps {
  user: {
    name: string;
    email: string;
    role: "OWNER" | "STAFF";
  };
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/* Hamburger trigger */}
      <Dialog.Trigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Drawer panel */}
        <Dialog.Content
          className={cn(
            "fixed left-0 top-0 z-50 h-full w-72 bg-card shadow-xl",
            "flex flex-col border-r border-border",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
            "duration-200"
          )}
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold text-foreground"
              onClick={() => setOpen(false)}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold select-none">
                VW
              </div>
              <span className="text-sm">VWS FollowUp</span>
            </Link>
            <Dialog.Close asChild>
              <button
                className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto py-4 px-2">
            <ul className="space-y-1" role="list">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User info at bottom */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold select-none">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
