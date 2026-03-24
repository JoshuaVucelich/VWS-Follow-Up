/**
 * src/app/(dashboard)/tasks/page.tsx
 *
 * Tasks management page.
 *
 * Lists all tasks across the workspace with filtering by:
 *   - Status (open, in progress, done, canceled)
 *   - Priority (urgent, high, medium, low)
 *   - Assigned user
 *   - Overdue toggle
 *
 * Overdue tasks appear with a visual indicator.
 *
 * URL: /tasks
 * Query params (all optional): status, priority, assignedUserId, overdue, page
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import { TasksList } from "@/features/tasks/components/tasks-list";
import { TasksFilters } from "@/features/tasks/components/tasks-filters";
import { getTasks } from "@/server/queries/tasks";
import { getActiveUsers } from "@/server/queries/users";
import { getContactsForPicker } from "@/server/queries/contacts";
import { getCurrentUser } from "@/lib/session";
import { taskFiltersSchema } from "@/lib/validations/tasks";

export const metadata: Metadata = {
  title: "Tasks",
};

interface TasksPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  // Flatten array params (take first value)
  const rawParams = Object.fromEntries(
    Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  );

  const parsedFilters = taskFiltersSchema.safeParse(rawParams);
  const filters = parsedFilters.success ? parsedFilters.data : taskFiltersSchema.parse({});

  const [{ data: tasks, total, page, perPage, totalPages }, users, contacts, currentUser] =
    await Promise.all([
      getTasks(filters),
      getActiveUsers(),
      getContactsForPicker(),
      getCurrentUser(),
    ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track follow-ups, reminders, and to-dos.
          </p>
        </div>
        <CreateTaskDialog users={users} contacts={contacts} />
      </div>

      {/* Filters — wrapped in Suspense because TasksFilters calls useSearchParams */}
      <Suspense fallback={<Skeleton className="h-9 w-full max-w-lg" />}>
        <TasksFilters filters={filters} users={users} />
      </Suspense>

      {/* Tasks list — wrapped in Suspense because TasksList calls useSearchParams */}
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <TasksList
          tasks={tasks}
          total={total}
          page={page}
          perPage={perPage}
          totalPages={totalPages}
          filters={filters}
          userRole={currentUser.role}
        />
      </Suspense>
    </div>
  );
}
