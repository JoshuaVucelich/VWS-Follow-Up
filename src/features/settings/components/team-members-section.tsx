/**
 * src/features/settings/components/team-members-section.tsx
 *
 * TeamMembersSection — lists all users, handles invite, role change, and deactivation.
 *
 * Server component wrapper that fetches users + current session.
 * Delegates interactive parts to client sub-components.
 */

import { getAllUsers } from "@/server/queries/users";
import { getCurrentUser } from "@/lib/session";
import { TeamMembersSectionClient } from "./team-members-section-client";

export async function TeamMembersSection() {
  const [users, currentUser] = await Promise.all([
    getAllUsers(),
    getCurrentUser(),
  ]);

  return (
    <TeamMembersSectionClient
      users={users}
      currentUserId={currentUser.id}
      isOwner={currentUser.role === "OWNER"}
    />
  );
}
