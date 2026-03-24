/**
 * src/lib/auth.ts
 *
 * Auth.js (next-auth v5) configuration for VWS FollowUp.
 *
 * This file is the single source of truth for authentication configuration.
 * It exports the Auth.js handlers, the `auth()` helper, and the server-side
 * `signIn`/`signOut` functions.
 *
 * Authentication strategy:
 *   - Credentials provider (email + password)
 *   - JWT sessions (not database sessions) — works better with credentials
 *   - bcrypt password verification
 *   - Custom JWT and session callbacks to include `id` and `role`
 *
 * Usage in server components:
 *   import { auth } from "@/lib/auth";
 *   const session = await auth();
 *   if (!session) redirect("/login");
 *
 * Usage in client components:
 *   import { signIn, signOut } from "next-auth/react";
 *   await signIn("credentials", { email, password, redirect: false });
 *   await signOut({ callbackUrl: "/login" });
 *
 * The `handlers` export is used by the API route at:
 *   src/app/api/auth/[...nextauth]/route.ts
 *
 * @see https://authjs.dev/getting-started/installation
 * @see src/types/next-auth.d.ts for type augmentation
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required when running behind a reverse proxy (Coolify / nginx).
  // Without this, Auth.js rejects requests because the forwarded host
  // doesn't match the original request host.
  trustHost: true,

  // Use JWT sessions — credentials providers don't work well with database sessions
  // because they bypass the normal OAuth token storage flow.
  session: {
    strategy: "jwt",
    // Session lifetime: 30 days. Users stay logged in unless they sign out.
    maxAge: 30 * 24 * 60 * 60,
  },

  // Custom page routes — prevents Auth.js from using its built-in UI pages
  pages: {
    signIn: "/login",
    error: "/login", // Auth errors redirect here with ?error=... in the URL
    newUser: "/dashboard", // After OAuth signup (not used in v1)
  },

  providers: [
    Credentials({
      /**
       * The `authorize` function is called when the user submits the login form.
       * It receives the raw credentials from the client, validates them, and
       * returns a user object if valid, or null if invalid.
       *
       * IMPORTANT: Never throw errors here. Returning null causes Auth.js to
       * set error=CredentialsSignin, which the login form can display.
       */
      async authorize(credentials) {
        // Validate the incoming credentials against our Zod schema.
        // This catches malformed requests before any database queries.
        const validated = loginSchema.safeParse(credentials);
        if (!validated.success) {
          return null;
        }

        const { email, password } = validated.data;

        // Look up the user by email. Select only what we need.
        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        });

        // User not found or has no password (e.g., an OAuth-only account)
        if (!user || !user.passwordHash) {
          return null;
        }

        // Prevent deactivated accounts from signing in
        if (!user.isActive) {
          return null;
        }

        // Verify the password against the stored bcrypt hash.
        // bcrypt.compare is timing-safe so we don't worry about timing attacks here.
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
          return null;
        }

        // Return the user object. This becomes the `user` in the jwt callback below.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * The `jwt` callback runs when a JWT is created (after sign-in) or
     * when a session is accessed. We use it to embed our custom fields
     * (`id` and `role`) into the token so they're available in `session`.
     *
     * The `user` param is only present on the first call (sign-in).
     * On subsequent calls, only `token` is present.
     */
    jwt({ token, user }) {
      if (user) {
        // First call — embed custom fields from the user object
        token.id = user.id as string;
        token.role = (user as { role: import("@prisma/client").UserRole }).role;
      }
      return token;
    },

    /**
     * The `session` callback runs every time a session is read.
     * It maps the JWT token fields onto the session.user object
     * so they're accessible in components via `auth()` or `useSession()`.
     */
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
