/**
 * src/server/queries/users.ts
 *
 * Read-only database queries for users.
 *
 * Currently used for: populating the "Assign to" dropdown in the contact form,
 * team member list in settings, and activity timeline author display.
 */

import { db } from "@/lib/db";

/**
 * Returns all active users in the workspace.
 * Used to populate assignment dropdowns.
 */
export async function getActiveUsers() {
  return db.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, image: true },
  });
}

/**
 * Returns a single user by ID.
 */
export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, image: true, isActive: true, createdAt: true },
  });
}

/**
 * Returns all users including inactive ones.
 * Used by owner-only team management in settings.
 */
export async function getAllUsers() {
  return db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, image: true, isActive: true, createdAt: true },
  });
}
