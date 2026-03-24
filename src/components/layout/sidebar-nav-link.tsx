/**
 * src/components/layout/sidebar-nav-link.tsx
 *
 * Client component for individual sidebar navigation links.
 *
 * This is a client component because it uses `usePathname()` to determine
 * if the link is currently active, which requires the client runtime.
 *
 * The parent AppSidebar is a server component — only this leaf component
 * needs to be a client component, which keeps the serialization boundary
 * as narrow as possible.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function SidebarNavLink({ href, label, icon: Icon }: SidebarNavLinkProps) {
  const pathname = usePathname();

  // Mark as active if the current path starts with this href.
  // This handles sub-routes (e.g., /contacts/123 is still "Contacts" active).
  // Exception: /dashboard only matches exactly to avoid marking everything active.
  const isActive =
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
