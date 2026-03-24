/**
 * src/app/api/export/tasks/route.ts
 *
 * GET /api/export/tasks
 *
 * Returns all non-deleted tasks as a CSV download.
 * Requires an authenticated session.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(fields: unknown[]): string {
  return fields.map(escapeCsv).join(",");
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const tasks = await db.task.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      status: true,
      dueAt: true,
      completedAt: true,
      createdAt: true,
      contact: { select: { displayName: true, email: true } },
      assignedUser: { select: { name: true, email: true } },
    },
  });

  const headers = [
    "ID", "Title", "Description", "Priority", "Status",
    "Due At", "Completed At",
    "Contact", "Assigned To", "Created At",
  ];

  const lines: string[] = [headers.join(",")];

  for (const t of tasks) {
    lines.push(row([
      t.id,
      t.title,
      t.description,
      t.priority,
      t.status,
      t.dueAt?.toISOString() ?? "",
      t.completedAt?.toISOString() ?? "",
      t.contact?.displayName ?? t.contact?.email ?? "",
      t.assignedUser?.name ?? t.assignedUser?.email ?? "",
      t.createdAt.toISOString(),
    ]));
  }

  const csv = lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tasks-${date}.csv"`,
    },
  });
}
