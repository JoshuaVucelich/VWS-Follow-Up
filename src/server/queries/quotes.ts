/**
 * src/server/queries/quotes.ts
 *
 * Read-only database queries for quotes.
 *
 * Used by:
 *   - The quotes list page (/quotes)
 *   - The dashboard "Quotes Awaiting Response" widget
 *   - The contact detail page quotes panel
 */

import { db } from "@/lib/db";
import type { QuoteFiltersInput } from "@/lib/validations/quotes";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuoteWithRelations = {
  id: string;
  title: string;
  status: import("@prisma/client").QuoteStatus;
  amount: { toString(): string } | null;
  description: string | null;
  sentAt: Date | null;
  followUpAt: Date | null;
  acceptedAt: Date | null;
  declinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contact: { id: string; displayName: string } | null;
  createdBy: { id: string; name: string | null } | null;
};

// ---------------------------------------------------------------------------
// getQuotes — paginated, filterable quote list
// ---------------------------------------------------------------------------

export async function getQuotes(filters: QuoteFiltersInput): Promise<{
  data: QuoteWithRelations[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  const { search, status, page = 1, perPage = 25 } = filters;

  const where: Prisma.QuoteWhereInput = {
    ...(status && { status }),
  };

  if (search) {
    const term = search.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { contact: { displayName: { contains: term, mode: "insensitive" } } },
    ];
  }

  const orderBy: Prisma.QuoteOrderByWithRelationInput[] = [
    { followUpAt: { sort: "asc", nulls: "last" } },
    { updatedAt: "desc" },
  ];

  const [total, data] = await Promise.all([
    db.quote.count({ where }),
    db.quote.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        status: true,
        amount: true,
        description: true,
        sentAt: true,
        followUpAt: true,
        acceptedAt: true,
        declinedAt: true,
        createdAt: true,
        updatedAt: true,
        contact: { select: { id: true, displayName: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Prisma returns `amount` as a Decimal object, which is not serializable
  // by React RSC when passed from a server component to a client component.
  // Convert it to a string (or null) before returning.
  const serialized = data.map((q) => ({
    ...q,
    amount: q.amount != null ? q.amount.toString() : null,
  }));

  return {
    data: serialized as unknown as QuoteWithRelations[],
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// ---------------------------------------------------------------------------
// getQuotesPendingResponse — dashboard widget
// ---------------------------------------------------------------------------

/**
 * Returns quotes in SENT or WAITING_ON_RESPONSE status,
 * sorted by followUpAt ascending (overdue first), then by sentAt.
 */
export async function getQuotesPendingResponse(limit = 5) {
  return db.quote.findMany({
    where: {
      status: { in: ["SENT", "WAITING_ON_RESPONSE"] },
    },
    orderBy: [
      { followUpAt: { sort: "asc", nulls: "last" } },
      { sentAt: "asc" },
    ],
    take: limit,
    select: {
      id: true,
      title: true,
      amount: true,
      followUpAt: true,
      sentAt: true,
      contact: { select: { id: true, displayName: true } },
    },
  });
}
