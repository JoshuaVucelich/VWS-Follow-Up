/**
 * src/features/dashboard/components/quick-actions.tsx
 *
 * Quick action buttons displayed in the top-right of the dashboard.
 *
 * Provides one-click access to the most common actions:
 *   - Add Lead
 *   - Add Task
 *   - Log Activity (future)
 *
 * These are client components because they open modals/dialogs.
 * The buttons themselves can be server-rendered, but the modals they
 * open require client-side state.
 *
 * TODO: Connect to actual create modals once they are built.
 */

"use client";

import Link from "next/link";
import { UserPlus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";

interface QuickActionsProps {
  users: { id: string; name: string | null; email: string | null }[];
  contacts: { id: string; displayName: string }[];
}

export function QuickActions({ users, contacts }: QuickActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Add Task — opens CreateTaskDialog */}
      <CreateTaskDialog
        users={users}
        contacts={contacts}
        trigger={
          <Button variant="outline" size="sm">
            <CheckSquare className="mr-1.5 h-4 w-4" />
            Add Task
          </Button>
        }
      />

      {/* Add Lead — navigates to new contact form */}
      <Button size="sm" asChild>
        <Link href="/contacts/new">
          <UserPlus className="mr-1.5 h-4 w-4" />
          Add Lead
        </Link>
      </Button>
    </div>
  );
}
