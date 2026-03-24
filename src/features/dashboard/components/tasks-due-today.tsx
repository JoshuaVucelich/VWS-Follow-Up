/**
 * src/features/dashboard/components/tasks-due-today.tsx
 *
 * Dashboard widget showing tasks due today and overdue tasks.
 *
 * Shows up to 8 tasks, sorted with overdue first, then by priority.
 * Each task shows: title, associated contact, due date, priority badge.
 *
 * Server component — fetches data via getTasksDueToday().
 */

import Link from "next/link";
import { CheckSquare, AlertCircle, ArrowRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { getTasksDueToday } from "@/server/queries/tasks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  MEDIUM: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  LOW: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export async function TasksDueToday() {
  const tasks = await getTasksDueToday(8);

  const now = new Date();
  const overdueCount = tasks.filter((t) => t.dueAt && t.dueAt < now).length;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Tasks Due Today</h2>
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-destructive font-medium">
              <AlertCircle className="h-3 w-3" />
              {overdueCount} overdue
            </span>
          )}
        </div>
        <Link
          href="/tasks"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Task list */}
      <div className="divide-y divide-border">
        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No tasks due today. You&apos;re all caught up!
          </div>
        ) : (
          tasks.map((task) => {
            const isOverdue = task.dueAt != null && task.dueAt < now;
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3",
                  isOverdue && "bg-destructive/5"
                )}
              >
                {/* Checkbox stub — task complete is on the full tasks page */}
                <div className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-border" />

                {/* Task content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium leading-snug",
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
                </div>

                {/* Right side: priority + due date */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs font-medium",
                      PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.MEDIUM
                    )}
                  >
                    {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                  </span>
                  {task.dueAt && (
                    <span
                      className={cn(
                        "text-xs",
                        isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                      )}
                    >
                      {formatDate(task.dueAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
