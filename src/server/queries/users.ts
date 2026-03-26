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
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      isActive: true,
      createdAt: true,
    },
  });
}

/**
 * Returns all users including inactive ones.
 * Used by owner-only team management in settings.
 */
export async function getAllUsers() {
  return db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      isActive: true,
      createdAt: true,
    },
  });
}

/**
 * Returns pending invite records (accepted invites are consumed/deleted).
 * Includes expired invites so owners can resend directly from settings.
 */
export async function getPendingInvites() {
  const [inviteTokens, users] = await Promise.all([
    db.verificationToken.findMany({
      where: { identifier: { startsWith: "invite:" } },
      select: { identifier: true, expires: true },
      orderBy: { expires: "desc" },
    }),
    db.user.findMany({ select: { email: true } }),
  ]);

  const existingUserEmails = new Set(
    users.map((user) => user.email.toLowerCase()),
  );
  const latestByEmail = new Map<string, { email: string; expiresAt: Date }>();

  for (const invite of inviteTokens) {
    const email = invite.identifier
      .replace(/^invite:/, "")
      .trim()
      .toLowerCase();
    if (!email || existingUserEmails.has(email)) continue;

    const existingInvite = latestByEmail.get(email);
    if (!existingInvite || invite.expires > existingInvite.expiresAt) {
      latestByEmail.set(email, { email, expiresAt: invite.expires });
    }
  }

  return Array.from(latestByEmail.values()).sort((a, b) =>
    a.email.localeCompare(b.email),
  );
}
