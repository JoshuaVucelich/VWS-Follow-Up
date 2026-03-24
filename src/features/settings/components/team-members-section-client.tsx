/**
 * src/features/settings/components/team-members-section-client.tsx
 *
 * Client component for team member management:
 *   - List all users with role badge and active status
 *   - Invite form (owner only)
 *   - Deactivate / Reactivate (owner only)
 *   - Change role (owner only)
 */

"use client";

import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { inviteUserSchema, type InviteUserInput } from "@/lib/validations/settings";
import { inviteUser } from "@/server/actions/auth";
import { changeUserRole, deactivateUser, reactivateUser } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, getInitials } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

interface TeamMembersSectionClientProps {
  users: TeamUser[];
  currentUserId: string;
  isOwner: boolean;
}

// ---------------------------------------------------------------------------
// UserRow — a single team member row with actions
// ---------------------------------------------------------------------------

function UserRow({
  user,
  currentUserId,
  isOwner,
}: {
  user: TeamUser;
  currentUserId: string;
  isOwner: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const isSelf = user.id === currentUserId;

  function handleRoleToggle() {
    const newRole = user.role === "OWNER" ? "STAFF" : "OWNER";
    if (!confirm(`Change ${user.name ?? user.email}'s role to ${newRole}?`)) return;
    startTransition(async () => {
      const result = await changeUserRole(user.id, newRole);
      if (!result.success) toast.error(result.error);
      else toast.success("Role updated.");
    });
  }

  function handleDeactivate() {
    if (!confirm(`Deactivate ${user.name ?? user.email}? They will no longer be able to log in.`)) return;
    startTransition(async () => {
      const result = await deactivateUser(user.id);
      if (!result.success) toast.error(result.error);
      else toast.success("User deactivated.");
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      const result = await reactivateUser(user.id);
      if (!result.success) toast.error(result.error);
      else toast.success("User reactivated.");
    });
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-border p-3",
        !user.isActive && "opacity-60"
      )}
    >
      {/* Avatar + info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
          {getInitials(user.name ?? user.email)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{user.name ?? "—"}</p>
            {isSelf && (
              <span className="text-xs text-muted-foreground">(you)</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      {/* Right: role + status + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={cn(
            "text-xs rounded-full px-2 py-0.5 font-semibold",
            user.role === "OWNER"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {user.role === "OWNER" ? "Owner" : "Staff"}
        </span>

        {!user.isActive && (
          <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
            Inactive
          </span>
        )}

        {isOwner && !isSelf && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleRoleToggle}
              disabled={isPending}
            >
              {user.role === "OWNER" ? "Make staff" : "Make owner"}
            </Button>

            {user.isActive ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={handleDeactivate}
                disabled={isPending}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleReactivate}
                disabled={isPending}
              >
                Reactivate
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TeamMembersSectionClient
// ---------------------------------------------------------------------------

export function TeamMembersSectionClient({
  users,
  currentUserId,
  isOwner,
}: TeamMembersSectionClientProps) {
  const [invitePending, startInviteTransition] = useTransition();
  const [inviteSent, setInviteSent] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
  });

  function onInvite(data: InviteUserInput) {
    startInviteTransition(async () => {
      const result = await inviteUser(currentUserId, data.email);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(`Invitation sent to ${data.email}`);
        reset();
        setInviteSent(true);
        setTimeout(() => setInviteSent(false), 4000);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* User list */}
      <div className="space-y-2">
        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            currentUserId={currentUserId}
            isOwner={isOwner}
          />
        ))}
      </div>

      {/* Invite form — owner only */}
      {isOwner && (
        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Invite team member</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              They will receive an email to create their account.
            </p>
          </div>
          <form onSubmit={handleSubmit(onInvite)} className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="invite-email" className="sr-only">
                Email address
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Button type="submit" disabled={invitePending} className="flex-shrink-0">
              {invitePending ? "Sending…" : "Send invite"}
            </Button>
          </form>
          {inviteSent && (
            <p className="text-xs text-green-600">Invitation sent successfully!</p>
          )}
        </div>
      )}

      {!isOwner && (
        <p className="text-sm text-muted-foreground">
          Only workspace owners can invite or manage team members.
        </p>
      )}
    </div>
  );
}
