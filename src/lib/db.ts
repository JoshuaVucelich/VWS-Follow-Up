/**
 * src/lib/db.ts
 *
 * Prisma Client singleton for VWS FollowUp.
 *
 * This module exports a single shared Prisma Client instance.
 * Using a singleton prevents connection pool exhaustion during development
 * (where Next.js hot-reloading would otherwise create a new client on every
 * module reload).
 *
 * Usage:
 *   import { db } from "@/lib/db";
 *   const contacts = await db.contact.findMany();
 *
 * Do not import PrismaClient directly elsewhere — always use this module.
 *
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */

import { PrismaClient } from "@prisma/client";

/**
 * Extend globalThis with our Prisma client so that the singleton
 * persists across hot-reloads in development without leaking connections.
 *
 * In production (where modules are cached permanently), this is a no-op —
 * the module-level `db` export is used directly.
 */
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// Persist the client in global scope during development.
// In production this branch is never taken because NODE_ENV === "production".
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
