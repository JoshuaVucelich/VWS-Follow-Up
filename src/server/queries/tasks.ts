/**
 * src/server/queries/tasks.ts
 *
 * Read-only database queries for tasks.
 *
 * Used by:
 *   - The tasks list page (/tasks)
 *   - The dashboard "Tasks Due Today" widget
 *   - The contact detail page task panel
 */

import { db } from "@/lib/db";
import type { TaskFiltersInput } from "@/lib/validations/tasks";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskWithRelations = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  priority: import("@prisma/client").TaskPriority;
  status: import("@prisma/client").TaskStatus;
  completedAt: Date | null;
  createdAt: Date;
  assignedUser: { id: string; name: string | null } | null;
  contact: { id: string; displayName: string; phone: string | null } | null;
};

// ---------------------------------------------------------------------------
// getTasks — paginated, filterable task list
// ---------------------------------------------------------------------------

export async function getTasks(filters: TaskFiltersInput): Promise<{
  data: TaskWithRelations[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  const {
    search,
    status,
    priority,
    assignedUserId,
    overdue = false,
    page = 1,
    perPage = 25,
  } = filters;

  const where: Prisma.TaskWhereInput = {
    // Default: hide canceled tasks unless explicitly requested
    ...(status ? { status } : { status: { not: "CANCELED" } }),
    ...(priority && { priority }),
    ...(assignedUserId && { assignedUserId }),
    ...(overdue && {
      dueAt: { lte: new Date() },
      status: { notIn: ["COMPLETED", "CANCELED"] },
    }),
  };

  if (search) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { contact: { displayName: { contains: term, mode: "insensitive" } } },
    ];
  }

  // Overdue first, then by dueAt asc (nulls last), then by priority desc
  const orderBy: Prisma.TaskOrderByWithRelationInput[] = [
    { dueAt: { sort: "asc", nulls: "last" } },
    { priority: "desc" },
    { createdAt: "desc" },
  ];

  const [total, data] = await Promise.all([
    db.task.count({ where }),
    db.task.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        priority: true,
        status: true,
        completedAt: true,
        createdAt: true,
        assignedUser: { select: { id: true, name: true } },
        contact: { select: { id: true, displayName: true, phone: true } },
      },
    }),
  ]);

  return {
    data,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// ---------------------------------------------------------------------------
// getTasksDueToday — dashboard widget
// ---------------------------------------------------------------------------

/**
 * Returns open tasks due today or already overdue.
 * Sorted: overdue first (by dueAt asc), then by priority desc.
 */
export async function getTasksDueToday(limit = 8) {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  return db.task.findMany({
    where: {
      status: { notIn: ["COMPLETED", "CANCELED"] },
      dueAt: { lte: endOfToday },
    },
    orderBy: [
      { dueAt: { sort: "asc", nulls: "last" } },
      { priority: "desc" },
    ],
    take: limit,
    select: {
      id: true,
      title: true,
      dueAt: true,
      priority: true,
      status: true,
      contact: { select: { id: true, displayName: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// getOverdueTasks — count of overdue open tasks
// ---------------------------------------------------------------------------

export async function getOverdueTaskCount(): Promise<number> {
  return db.task.count({
    where: {
      status: { notIn: ["COMPLETED", "CANCELED"] },
      dueAt: { lt: new Date() },
    },
  });
}

// ---------------------------------------------------------------------------
// getOpenTaskCount — total open/in-progress tasks
// ---------------------------------------------------------------------------

export async function getOpenTaskCount(): Promise<number> {
  return db.task.count({
    where: { status: { notIn: ["COMPLETED", "CANCELED"] } },
  });
}
