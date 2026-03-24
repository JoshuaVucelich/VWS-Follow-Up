/**
 * src/app/layout.tsx
 *
 * Root layout for VWS FollowUp.
 *
 * This is the outermost layout in the Next.js App Router hierarchy.
 * It wraps every page in the application and is responsible for:
 *
 *   1. HTML document structure (<html>, <body>, metadata)
 *   2. Global font loading
 *   3. Global CSS import
 *   4. Top-level providers (auth session, toast notifications)
 *
 * Sub-layouts in (auth)/ and (dashboard)/ handle more specific
 * structural elements like sidebars and navigation.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/layout
 */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import "./globals.css";

// Inter is a clean, highly legible sans-serif that works well for
// data-dense UI like dashboards and tables.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // Prevent invisible text during font load
});

/**
 * Static metadata for the application.
 *
 * This provides sensible defaults that can be overridden on a per-page
 * basis using the `metadata` export or `generateMetadata` function.
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 */
export const metadata: Metadata = {
  title: {
    default: "VWS FollowUp",
    template: "%s | VWS FollowUp",
  },
  description:
    "Simple lead tracking, follow-up management, and CRM for small service businesses.",
  keywords: [
    "CRM",
    "lead tracking",
    "follow-up",
    "small business",
    "service business",
    "open source",
  ],
  authors: [{ name: "VWS Digital" }],
  // Open Graph metadata for link previews
  openGraph: {
    type: "website",
    siteName: "VWS FollowUp",
    title: "VWS FollowUp",
    description: "Simple lead tracking and follow-up management for small service businesses.",
  },
  // Prevent search engines from indexing self-hosted instances by default.
  // Users who want public indexing can override this in their deployment.
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/*
         * SessionProvider makes the Auth.js session available to all client
         * components via the useSession() hook. It must wrap the entire app.
         * Server components use auth() from "@/lib/auth" directly instead.
         */}
        <SessionProvider>
          {children}
        </SessionProvider>

        {/*
         * Sonner toast notification container.
         * Placed outside SessionProvider so it's always available.
         * Position is bottom-right on desktop, bottom-center on mobile.
         * Use toast() from "sonner" anywhere in the app to trigger a notification.
         */}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
      </body>
    </html>
  );
}
