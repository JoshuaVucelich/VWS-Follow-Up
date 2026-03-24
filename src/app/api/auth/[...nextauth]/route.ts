/**
 * src/app/api/auth/[...nextauth]/route.ts
 *
 * Auth.js API route handler.
 *
 * This file connects Auth.js to Next.js's API routing system.
 * It handles all auth-related HTTP requests:
 *
 *   GET  /api/auth/session          — returns the current session
 *   GET  /api/auth/providers        — returns configured providers
 *   GET  /api/auth/csrf             — returns the CSRF token
 *   POST /api/auth/signin/credentials — handles credential sign-in
 *   POST /api/auth/signout          — handles sign-out
 *
 * The `handlers` object is created by NextAuth() in src/lib/auth.ts.
 * This file is intentionally minimal — all configuration lives in auth.ts.
 *
 * @see src/lib/auth.ts
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
