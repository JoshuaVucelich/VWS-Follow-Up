/**
 * src/features/tasks/components/task-form.tsx
 *
 * TaskForm — shared form for creating and editing tasks.
 *
 * Used inside CreateTaskDialog (new task) and a future edit dialog.
 * Calls createTask or updateTask server actions on submit.
 *
 * Props:
 *   task          — When provided, the form pre-fills in edit mode.
 *   users         — Active users for the "Assign to" dropdown.
 *   defaultContactId — Pre-select a contact (e.g., when opened from a contact page).
 *   contacts      — Contact list for the contact picker dropdown.
 *   onSuccess     — Called after a successful save (used to close the dialog).
 */

"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { taskFormSchema, type TaskFormInput, type TaskFormValues } from "@/lib/validations/tasks";
import { createTask, updateTask } from "@/server/actions/tasks";
import { TASK_PRIORITY_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskPriority } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskFormTask {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueAt: Date | null;
  assignedUserId: string | null;
  contactId: string | null;
}

interface TaskFormUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface TaskFormContact {
  id: string;
  displayName: string;
}

interface TaskFormProps {
  task?: TaskFormTask;
  users: TaskFormUser[];
  contacts?: TaskFormContact[];
  defaultContactId?: string;
  onSuccess?: () => void;
}

const UNASSIGNED_OPTION = "__unassigned__";
const NO_CONTACT_OPTION = "__no_contact__";

// ---------------------------------------------------------------------------
// TaskForm
// ---------------------------------------------------------------------------

export function TaskForm({
  task,
  users,
  contacts = [],
  defaultContactId,
  onSuccess,
}: TaskFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!task;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      priority: task?.priority ?? "MEDIUM",
      assignedUserId: task?.assignedUserId ?? "",
      contactId: task?.contactId ?? defaultContactId ?? "",
      dueAt: task?.dueAt ? task.dueAt.toISOString().split("T")[0] : "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = form;

  function onSubmit(data: TaskFormValues) {
    const transformed = data as unknown as TaskFormInput;
    startTransition(async () => {
      const result = isEditing
        ? await updateTask(task!.id, transformed)
        : await createTask(transformed);

      if (!result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, messages]) => {
            if (!messages?.[0]) return;
            setError(field as keyof TaskFormValues, {
              type: "server",
              message: messages[0],
            });
          });
        }
        toast.error(result.error);
        return;
      }

      clearErrors();
      toast.success(isEditing ? "Task updated." : "Task created.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="task-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="task-title"
          placeholder="Call back Marcus Williams"
          autoFocus
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="task-description">Notes (optional)</Label>
        <Textarea
          id="task-description"
          placeholder="Any extra context for this task…"
          rows={2}
          {...register("description")}
        />
      </div>

      {/* Priority + Due date row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-priority">Priority</Label>
          <Select
            value={watch("priority")}
            onValueChange={(v) => setValue("priority", v as TaskPriority, { shouldValidate: true })}
          >
            <SelectTrigger id="task-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-due">Due date</Label>
          <Input id="task-due" type="date" {...register("dueAt")} />
          {errors.dueAt && (
            <p className="text-xs text-destructive">{errors.dueAt.message}</p>
          )}
        </div>
      </div>

      {/* Assigned user */}
      <div className="space-y-1.5">
        <Label htmlFor="task-assignee">Assign to</Label>
        <Select
          value={watch("assignedUserId") || UNASSIGNED_OPTION}
          onValueChange={(v) =>
            setValue("assignedUserId", v === UNASSIGNED_OPTION ? undefined : v, {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="task-assignee">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED_OPTION}>Unassigned</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name ?? u.email ?? u.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.assignedUserId && (
          <p className="text-xs text-destructive">{errors.assignedUserId.message}</p>
        )}
      </div>

      {/* Contact link — only show if contacts are passed and no default is locked */}
      {contacts.length > 0 && !defaultContactId && (
        <div className="space-y-1.5">
          <Label htmlFor="task-contact">Link to contact</Label>
          <Select
            value={watch("contactId") || NO_CONTACT_OPTION}
            onValueChange={(v) =>
              setValue("contactId", v === NO_CONTACT_OPTION ? undefined : v, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="task-contact">
              <SelectValue placeholder="No contact" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CONTACT_OPTION}>No contact</SelectItem>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.contactId && (
            <p className="text-xs text-destructive">{errors.contactId.message}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEditing ? "Saving…" : "Creating…"
            : isEditing ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
}
