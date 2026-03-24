/**
 * src/app/page.tsx
 *
 * Root page — handles the initial redirect.
 *
 * The root path "/" has no UI of its own. It simply redirects visitors:
 *   - Authenticated users  → /dashboard
 *   - Unauthenticated users → /login
 *
 * This keeps the URL clean and predictable. Bookmarking "/" always works
 * because it redirects appropriately based on session state.
 *
 * Note: The auth check here is a server-side redirect. The middleware.ts
 * file handles client-side protection and may redirect before this runs.
 * Both layers of protection are intentional.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();

  // Authenticated users land on the dashboard.
  // Unauthenticated users see the login page.
  // The middleware also handles this redirect, but having it here provides
  // a reliable server-side fallback.
  if (session?.user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }

  return null;
}
