/**
 * src/features/tasks/components/tasks-list.tsx
 *
 * TasksList — paginated task table with complete/cancel/delete row actions.
 *
 * Each row has:
 *   - Checkbox to mark complete (or re-open if already done)
 *   - Title + optional description preview
 *   - Contact link (if linked)
 *   - Priority badge
 *   - Assigned user
 *   - Due date (red if overdue)
 *   - Row actions menu (edit coming in a later update, cancel, delete)
 *
 * Overdue open tasks get a subtle red background tint.
 * Completed tasks are visually muted with a strikethrough title.
 *
 * This is a client component because it calls server actions for
 * complete/cancel/delete with useTransition for pending state.
 */

"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import { TASK_PRIORITY_COLORS } from "@/lib/constants";
import { completeTask, reopenTask, cancelTask, deleteTask } from "@/server/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskWithRelations } from "@/server/queries/tasks";
import type { TaskFiltersInput } from "@/lib/validations/tasks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TasksListProps {
  tasks: TaskWithRelations[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  filters: TaskFiltersInput;
  userRole: string;
}

// ---------------------------------------------------------------------------
// Priority label
// ---------------------------------------------------------------------------

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  COMPLETED: "Done",
  CANCELED: "Canceled",
};

// ---------------------------------------------------------------------------
// TaskRowActions
// ---------------------------------------------------------------------------

function TaskRowActions({
  task,
  userRole,
}: {
  task: TaskWithRelations;
  userRole: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    startTransition(async () => {
      const isDone = task.status === "COMPLETED";
      const result = isDone ? await reopenTask(task.id) : await completeTask(task.id);
      if (!result.success) toast.error(result.error);
      else toast.success(isDone ? "Task reopened." : "Task completed.");
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelTask(task.id);
      if (!result.success) toast.error(result.error);
      else toast.success("Task canceled.");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (!result.success) toast.error(result.error);
      else toast.success("Task deleted.");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={isPending}
          aria-label="Task actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleComplete}>
          {task.status === "COMPLETED" ? "Reopen" : "Mark complete"}
        </DropdownMenuItem>
        {task.status !== "CANCELED" && task.status !== "COMPLETED" && (
          <DropdownMenuItem onClick={handleCancel} className="text-muted-foreground">
            Cancel
          </DropdownMenuItem>
        )}
        {userRole === "OWNER" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              Delete permanently
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// TaskCompleteCheckbox
// ---------------------------------------------------------------------------

function TaskCompleteCheckbox({ task }: { task: TaskWithRelations }) {
  const [isPending, startTransition] = useTransition();
  const isDone = task.status === "COMPLETED";

  function handleChange() {
    startTransition(async () => {
      const result = isDone ? await reopenTask(task.id) : await completeTask(task.id);
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <Checkbox
      checked={isDone}
      onCheckedChange={handleChange}
      disabled={isPending || task.status === "CANCELED"}
      aria-label={`Mark "${task.title}" as ${isDone ? "open" : "complete"}`}
    />
  );
}

// ---------------------------------------------------------------------------
// TasksList
// ---------------------------------------------------------------------------

export function TasksList({
  tasks,
  total,
  page,
  perPage,
  totalPages,
  filters,
  userRole,
}: TasksListProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pageUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  }

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-sm font-medium">No tasks found</p>
          <p className="text-xs text-muted-foreground">
            {filters.status || filters.priority || filters.overdue
              ? "Try adjusting your filters."
              : "Create your first task to get started."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Task</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                Priority
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                Assigned
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                Due
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                Status
              </th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.map((task) => {
              const isDone = task.status === "COMPLETED";
              const isCanceled = task.status === "CANCELED";
              const isOverdue =
                task.dueAt != null &&
                task.dueAt < new Date() &&
                !isDone &&
                !isCanceled;
              const isMuted = isDone || isCanceled;

              return (
                <tr
                  key={task.id}
                  className={cn(
                    "hover:bg-accent/30 transition-colors",
                    isOverdue && "bg-destructive/5",
                    isMuted && "opacity-60"
                  )}
                >
                  {/* Complete checkbox */}
                  <td className="px-4 py-3">
                    <TaskCompleteCheckbox task={task} />
                  </td>

                  {/* Title + contact */}
                  <td className="px-4 py-3 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium leading-tight",
                        isDone && "line-through text-muted-foreground",
                        isOverdue && "text-destructive"
                      )}
                    >
                      {task.title}
                    </p>
                    {task.contact && (
                      <Link
                        href={`/contacts/${task.contact.id}`}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        {task.contact.displayName}
                      </Link>
                    )}
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        TASK_PRIORITY_COLORS[task.priority]
                      )}
                    >
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  </td>

                  {/* Assigned user */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {task.assignedUser ? (
                      <span className="text-xs text-muted-foreground">
                        {task.assignedUser.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Due date */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {task.dueAt ? (
                      <span
                        className={cn(
                          "text-xs",
                          isOverdue
                            ? "text-destructive font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatDate(task.dueAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {STATUS_LABELS[task.status]}
                    </span>
                  </td>

                  {/* Row actions */}
                  <td className="px-4 py-3">
                    <TaskRowActions task={task} userRole={userRole} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>
          {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild={page > 1}
            disabled={page <= 1}
            className="text-xs"
          >
            {page > 1 ? <Link href={pageUrl(page - 1)}>Previous</Link> : <span>Previous</span>}
          </Button>
          <span className="px-1">{page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            asChild={page < totalPages}
            disabled={page >= totalPages}
            className="text-xs"
          >
            {page < totalPages ? <Link href={pageUrl(page + 1)}>Next</Link> : <span>Next</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
