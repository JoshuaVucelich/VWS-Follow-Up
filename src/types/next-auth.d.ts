/**
 * src/types/next-auth.d.ts
 *
 * TypeScript module augmentation for Auth.js (next-auth) types.
 *
 * By default, Auth.js's Session and JWT types only include `name`, `email`,
 * and `image`. We extend them here to include `id` and `role` so those fields
 * are typed everywhere they are used in the app.
 *
 * After editing this file, run `npm run typecheck` to verify the changes.
 *
 * @see https://authjs.dev/getting-started/typescript
 */

import type { UserRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /**
   * The shape of the session.user object returned by `auth()` in server
   * components and `useSession()` in client components.
   */
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      role: UserRole;
    };
  }

  /**
   * The shape of the user object returned by the `authorize` callback
   * in the Credentials provider. This gets encoded into the JWT.
   */
  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extends the default JWT payload to include our custom fields.
   * These are set in the `jwt` callback in src/lib/auth.ts.
   */
  interface JWT {
    id: string;
    role: UserRole;
  }
}
