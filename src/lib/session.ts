/**
 * src/lib/session.ts
 *
 * Session helper utilities for server components and server actions.
 *
 * These are thin wrappers around Auth.js's `auth()` function that provide
 * typed, convenient access to the current user's session data.
 *
 * Why use these helpers instead of calling `auth()` directly?
 *   - They handle the redirect when no session exists
 *   - They provide typed return values
 *   - They centralize session access patterns in one place
 *
 * Usage in server components:
 *   const user = await getCurrentUser();      // returns user or redirects
 *   const session = await getOptionalSession(); // returns session or null (no redirect)
 *
 * Usage in server actions (when you need to check auth):
 *   const user = await requireAuth();
 *   if (!user) return { success: false, error: "Unauthorized" };
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

// The shape of the user object available in session
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
};

/**
 * Returns the current session, or null if the user is not authenticated.
 *
 * Use this when you want to handle the unauthenticated case yourself.
 * For most pages, use getCurrentUser() instead (auto-redirects).
 */
export async function getOptionalSession(): Promise<{ user: SessionUser } | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session as { user: SessionUser };
}

/**
 * Returns the current user from the session.
 * Redirects to /login if no session exists.
 *
 * Use this in server components and layouts that require authentication.
 */
export async function getCurrentUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user as SessionUser;
}

/**
 * Returns the current user if they have the OWNER role.
 * Redirects to /dashboard if the user is not an owner.
 *
 * Use this in server actions or pages that require owner-level access.
 *
 * @example
 *   const owner = await requireOwner();
 *   // Safe to proceed with owner-only action
 */
export async function requireOwner(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (user.role !== "OWNER") {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Validates auth for use inside server actions.
 * Returns the session user, or returns an error result without redirecting.
 *
 * Redirecting inside a server action called from a client component can
 * cause unexpected behavior — use this pattern instead.
 *
 * @example
 *   export async function someAction(input: unknown) {
 *     const authResult = await requireAuthForAction();
 *     if (!authResult.success) return authResult;
 *     const user = authResult.user;
 *     // ...
 *   }
 */
export async function requireAuthForAction(): Promise<
  { success: true; user: SessionUser } | { success: false; error: string }
> {
  const session = await getOptionalSession();
  if (!session?.user) {
    return { success: false, error: "You must be signed in to perform this action." };
  }
  return { success: true, user: session.user };
}
