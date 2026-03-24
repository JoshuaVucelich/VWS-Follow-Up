/**
 * src/app/(auth)/layout.tsx
 *
 * Layout for all authentication pages (login, register, forgot password).
 *
 * The (auth) route group keeps auth pages separate from the main dashboard
 * without affecting the URL structure. Pages inside this group render with
 * this layout instead of the dashboard shell.
 *
 * Design:
 *   - Full-height centered layout with a subtle background pattern
 *   - The auth card sits in the middle of the screen on all screen sizes
 *   - A minimal app branding element appears above the card
 *   - No navigation — auth pages should be distraction-free
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: {
    default: "Sign In",
    template: "%s | VWS FollowUp",
  },
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* App branding above the auth card */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
          {/* Logo placeholder — replace with actual SVG or Image component */}
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm select-none">
            VW
          </div>
          <span className="text-xl font-semibold tracking-tight">VWS FollowUp</span>
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          Simple CRM for service businesses
        </p>
      </div>

      {/* Auth form content */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Open source &middot;{" "}
        <a
          href="https://github.com/your-org/vws-followup"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </p>
    </div>
  );
}
