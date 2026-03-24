/**
 * src/app/api/export/contacts/route.ts
 *
 * GET /api/export/contacts
 *
 * Returns all non-archived contacts as a CSV download.
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

  const contacts = await db.contact.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      businessName: true,
      email: true,
      phone: true,
      altPhone: true,
      city: true,
      state: true,
      zip: true,
      source: true,
      stage: true,
      type: true,
      status: true,
      notes: true,
      nextFollowUpAt: true,
      lastContactedAt: true,
      createdAt: true,
      assignedUser: { select: { name: true, email: true } },
    },
  });

  const headers = [
    "ID", "First Name", "Last Name", "Display Name", "Business Name",
    "Email", "Phone", "Alt Phone", "City", "State", "Zip",
    "Source", "Stage", "Type", "Status", "Notes",
    "Next Follow-Up", "Last Contacted", "Assigned To", "Created At",
  ];

  const lines: string[] = [headers.join(",")];

  for (const c of contacts) {
    lines.push(row([
      c.id,
      c.firstName,
      c.lastName,
      c.displayName,
      c.businessName,
      c.email,
      c.phone,
      c.altPhone,
      c.city,
      c.state,
      c.zip,
      c.source,
      c.stage,
      c.type,
      c.status,
      c.notes,
      c.nextFollowUpAt?.toISOString() ?? "",
      c.lastContactedAt?.toISOString() ?? "",
      c.assignedUser?.name ?? c.assignedUser?.email ?? "",
      c.createdAt.toISOString(),
    ]));
  }

  const csv = lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${date}.csv"`,
    },
  });
}
