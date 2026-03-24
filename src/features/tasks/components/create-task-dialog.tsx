/**
 * src/features/tasks/components/create-task-dialog.tsx
 *
 * CreateTaskDialog — modal dialog for creating a new task.
 *
 * Used on the tasks page header, the dashboard quick actions, and the
 * contact detail page. Accepts an optional defaultContactId to pre-link
 * the task to a specific contact.
 *
 * The dialog fetches its own user list on the server — the trigger button
 * is client-only, but the form data (users, contacts) is passed as props
 * from the parent server component.
 *
 * Props:
 *   users            — Active users for the assign dropdown.
 *   contacts         — Contact list for the contact picker (pass [] to hide).
 *   defaultContactId — Pre-selects and locks the contact field.
 *   trigger          — Custom trigger element (defaults to "Add Task" button).
 */

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TaskForm } from "@/features/tasks/components/task-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Contact {
  id: string;
  displayName: string;
}

interface CreateTaskDialogProps {
  users: User[];
  contacts?: Contact[];
  defaultContactId?: string;
  trigger?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// CreateTaskDialog
// ---------------------------------------------------------------------------

export function CreateTaskDialog({
  users,
  contacts = [],
  defaultContactId,
  trigger,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <TaskForm
          users={users}
          contacts={contacts}
          defaultContactId={defaultContactId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
