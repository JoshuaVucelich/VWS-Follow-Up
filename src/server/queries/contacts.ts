/**
 * src/server/queries/contacts.ts
 *
 * All read-only database queries for contacts.
 *
 * These functions are called by server components and server actions.
 * They never run on the client.
 *
 * Every function returns typed data using the extended types from src/types/index.ts.
 * Never select * — always specify exactly the fields needed.
 */

import { db } from "@/lib/db";
import type { ContactFiltersInput } from "@/lib/validations/contacts";
import type { PipelineFiltersInput } from "@/lib/validations/pipeline";
import type { ContactWithRelations, PaginatedResult } from "@/types";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Contact list (paginated, filterable)
// ---------------------------------------------------------------------------

/**
 * Fetches a paginated list of contacts with their tags and assigned user.
 *
 * Supports filtering by: search text, stage, type, source, assigned user, archived state.
 * Supports sorting by: name, createdAt, nextFollowUpAt, stage.
 */
export async function getContacts(
  filters: ContactFiltersInput
): Promise<PaginatedResult<ContactWithRelations>> {
  const {
    search,
    stage,
    type,
    source,
    assignedUserId,
    archived = false,
    page = 1,
    perPage = 25,
    sort = "createdAt",
    order = "desc",
  } = filters;

  // Build the where clause
  const where: Prisma.ContactWhereInput = {
    // Archived filter — default shows only active contacts
    ...(archived ? {} : { status: { not: "ARCHIVED" } }),
    ...(archived && { status: "ARCHIVED" }),
    ...(stage && { stage }),
    ...(type && { type }),
    ...(source && { source }),
    ...(assignedUserId && { assignedUserId }),
  };

  // Full-text search across name, business, email, phone
  if (search) {
    const term = search.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { displayName: { contains: term, mode: "insensitive" } },
      { businessName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
    ];
  }

  // Determine sort order
  const orderBy: Prisma.ContactOrderByWithRelationInput =
    sort === "name"
      ? { displayName: order }
      : sort === "nextFollowUpAt"
      ? { nextFollowUpAt: { sort: order, nulls: "last" } }
      : sort === "stage"
      ? { stage: order }
      : { createdAt: order };

  const [total, contacts] = await Promise.all([
    db.contact.count({ where }),
    db.contact.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        businessName: true,
        displayName: true,
        email: true,
        phone: true,
        altPhone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zip: true,
        website: true,
        source: true,
        stage: true,
        type: true,
        status: true,
        assignedUserId: true,
        createdById: true,
        lastContactedAt: true,
        nextFollowUpAt: true,
        customerSinceAt: true,
        archivedAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        tags: {
          include: { tag: true },
        },
        assignedUser: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { tasks: true, quotes: true, appointments: true },
        },
      },
    }),
  ]);

  return {
    data: contacts as ContactWithRelations[],
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// ---------------------------------------------------------------------------
// Single contact (full detail)
// ---------------------------------------------------------------------------

/**
 * Returns a single contact with all relations loaded for the detail page.
 * Returns null if not found.
 */
export async function getContact(id: string) {
  return db.contact.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      assignedUser: { select: { id: true, name: true, email: true, image: true } },
      createdBy: { select: { id: true, name: true } },
      tasks: {
        where: { status: { not: "CANCELED" } },
        orderBy: [{ status: "asc" }, { dueAt: { sort: "asc", nulls: "last" } }],
        include: {
          assignedUser: { select: { id: true, name: true } },
        },
      },
      contactNotes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      },
      appointments: {
        orderBy: { startAt: "asc" },
        include: {
          assignedUser: { select: { id: true, name: true } },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

/** Returns all tags in the workspace, ordered alphabetically. */
export async function getAllTags() {
  return db.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true } } },
  });
}

// ---------------------------------------------------------------------------
// Pipeline board
// ---------------------------------------------------------------------------

/**
 * The minimal contact shape needed for a pipeline board card.
 * Fetching only what is needed keeps this query fast even with many contacts.
 */
export type PipelineContact = {
  id: string;
  displayName: string;
  businessName: string | null;
  phone: string | null;
  stage: import("@prisma/client").ContactStage;
  source: import("@prisma/client").ContactSource;
  type: import("@prisma/client").ContactType;
  nextFollowUpAt: Date | null;
  assignedUser: { id: string; name: string | null; image: string | null } | null;
  _count: { tasks: number; contactNotes: number };
};

/**
 * Fetches all active (non-archived) contacts for the pipeline board.
 *
 * Returns a flat array. The client component groups them by stage using
 * useMemo so the board always reflects the current filter state without
 * a round-trip per column.
 *
 * Hard-capped at 500 contacts — boards with more than that should use
 * the contacts list view instead.
 */
export async function getPipelineContacts(
  filters: PipelineFiltersInput
): Promise<PipelineContact[]> {
  const where: Prisma.ContactWhereInput = {
    status: { not: "ARCHIVED" },
    ...(filters.assignedUserId && { assignedUserId: filters.assignedUserId }),
    ...(filters.source && { source: filters.source }),
    ...(filters.type && { type: filters.type }),
  };

  if (filters.search) {
    const term = filters.search.trim();
    where.OR = [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { displayName: { contains: term, mode: "insensitive" } },
      { businessName: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ];
  }

  return db.contact.findMany({
    where,
    orderBy: { displayName: "asc" },
    take: 500,
    select: {
      id: true,
      displayName: true,
      businessName: true,
      phone: true,
      stage: true,
      source: true,
      type: true,
      nextFollowUpAt: true,
      assignedUser: { select: { id: true, name: true, image: true } },
      _count: { select: { tasks: true, contactNotes: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Stats for dashboard widgets
// ---------------------------------------------------------------------------

/**
 * Returns counts of contacts grouped by stage.
 * Used by the pipeline board column headers.
 */
export async function getContactCountsByStage(): Promise<Record<string, number>> {
  const counts = await db.contact.groupBy({
    by: ["stage"],
    where: { status: { not: "ARCHIVED" } },
    _count: { id: true },
  });

  return Object.fromEntries(counts.map((c) => [c.stage, c._count.id]));
}

/**
 * Returns contacts whose nextFollowUpAt is today or in the past (and not archived).
 */
export async function getOverdueFollowUps(limit = 10) {
  return db.contact.findMany({
    where: {
      status: { not: "ARCHIVED" },
      nextFollowUpAt: { lte: new Date() },
    },
    orderBy: { nextFollowUpAt: "asc" },
    take: limit,
    select: {
      id: true,
      displayName: true,
      phone: true,
      nextFollowUpAt: true,
      stage: true,
    },
  });
}

/**
 * Returns a minimal contact list for picker / dropdown usage.
 * Used by the task creation dialog and other assignment dropdowns.
 */
export async function getContactsForPicker(limit = 200) {
  return db.contact.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { displayName: "asc" },
    take: limit,
    select: { id: true, displayName: true },
  });
}

/**
 * Returns recently created contacts.
 */
export async function getRecentContacts(limit = 8) {
  return db.contact.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      displayName: true,
      stage: true,
      source: true,
      createdAt: true,
    },
  });
}
