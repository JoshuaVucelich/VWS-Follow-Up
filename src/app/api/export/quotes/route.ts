/**
 * src/app/api/export/quotes/route.ts
 *
 * GET /api/export/quotes
 *
 * Returns all quotes as a CSV download.
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

  const quotes = await db.quote.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      amount: true,
      status: true,
      description: true,
      sentAt: true,
      followUpAt: true,
      acceptedAt: true,
      declinedAt: true,
      createdAt: true,
      contact: { select: { displayName: true, email: true } },
    },
  });

  const headers = [
    "ID", "Title", "Amount", "Status", "Description",
    "Contact", "Sent At", "Follow-Up At", "Accepted At", "Declined At", "Created At",
  ];

  const lines: string[] = [headers.join(",")];

  for (const q of quotes) {
    lines.push(row([
      q.id,
      q.title,
      q.amount ? q.amount.toString() : "",
      q.status,
      q.description,
      q.contact?.displayName ?? q.contact?.email ?? "",
      q.sentAt?.toISOString() ?? "",
      q.followUpAt?.toISOString() ?? "",
      q.acceptedAt?.toISOString() ?? "",
      q.declinedAt?.toISOString() ?? "",
      q.createdAt.toISOString(),
    ]));
  }

  const csv = lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quotes-${date}.csv"`,
    },
  });
}
