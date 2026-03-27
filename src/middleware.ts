/**
 * src/middleware.ts
 *
 * Next.js middleware for route protection.
 *
 * Uses Auth.js v5's built-in middleware integration. The `auth` export from
 * "@/lib/auth" is used directly as the middleware function, giving us access
 * to `req.auth` (the current session) on every matched request.
 *
 * Routing logic:
 *   - Unauthenticated users on protected routes → redirect to /login
 *   - Authenticated users on auth routes (/login, /register) → redirect to /dashboard
 *   - Register page with valid invite token → always allowed (for invited users)
 *
 * The middleware runs on the Edge runtime, so it's extremely fast and adds
 * no perceptible latency. Keep this file lean — no heavy logic here.
 *
 * @see src/lib/auth.ts for Auth.js configuration
 * @see https://authjs.dev/getting-started/session-management/protecting
 */

import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

/**
 * Top-level dashboard/app routes that require a valid session.
 * Any path that starts with one of these prefixes is protected.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/contacts",
  "/pipeline",
  "/tasks",
  "/quotes",
  "/appointments",
  "/settings",
];

/**
 * Auth routes that authenticated users should be bounced away from.
 * (No point showing the login page to someone already signed in.)
 */
const AUTH_ROUTES = ["/login", "/forgot-password"];

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname, searchParams } = req.nextUrl;
  const isLoggedIn = !!(req as { auth?: { user?: unknown } }).auth?.user;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // /register is special: always open if an invite token is present,
  // otherwise block authenticated users from re-registering.
  const isRegister = pathname === "/register";
  const hasInviteToken = searchParams.has("invite");

  // Unauthenticated users trying to access a protected page
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    // Save where they were trying to go so we can redirect them after login
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Authenticated users hitting login/forgot-password pages
  if (isAuthRoute && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.url));
  }

  // Authenticated user trying to register (unless they have an invite — edge case)
  if (isRegister && isLoggedIn && !hasInviteToken) {
    return Response.redirect(new URL("/dashboard", req.url));
  }
});

/**
 * Matcher configuration.
 *
 * We exclude:
 *   - Next.js internal routes (_next/static, _next/image)
 *   - Static assets (favicon, etc.)
 *   - The Auth.js API routes (/api/auth/*) — Auth.js handles these itself
 *
 * Everything else runs through the middleware, which is fast because
 * it's running on the Edge and Auth.js JWT verification is lightweight.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)",
  ],
};
