/**
 * src/server/queries/appointments.ts
 *
 * Read-only database queries for appointments.
 *
 * Used by:
 *   - The appointments list page (/appointments)
 *   - The dashboard "Upcoming Appointments" widget
 *   - The contact detail page appointments panel
 */

import { db } from "@/lib/db";
import type { AppointmentFiltersInput } from "@/lib/validations/appointments";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppointmentWithRelations = {
  id: string;
  title: string;
  type: import("@prisma/client").AppointmentType;
  status: import("@prisma/client").AppointmentStatus;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  notes: string | null;
  createdAt: Date;
  contact: { id: string; displayName: string } | null;
  assignedUser: { id: string; name: string | null } | null;
};

// ---------------------------------------------------------------------------
// getAppointments — paginated, filterable appointment list
// ---------------------------------------------------------------------------

export async function getAppointments(filters: AppointmentFiltersInput): Promise<{
  data: AppointmentWithRelations[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  const {
    type,
    status,
    assignedUserId,
    upcoming = false,
    page = 1,
    perPage = 25,
  } = filters;

  const now = new Date();

  const where: Prisma.AppointmentWhereInput = {
    ...(type && { type }),
    ...(status ? { status } : { status: { not: "CANCELED" } }),
    ...(assignedUserId && { assignedUserId }),
    ...(upcoming && { startAt: { gte: now } }),
  };

  // Default sort: upcoming first (asc), past events last (desc within past)
  const orderBy: Prisma.AppointmentOrderByWithRelationInput[] = [
    { startAt: "asc" },
  ];

  const [total, data] = await Promise.all([
    db.appointment.count({ where }),
    db.appointment.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        startAt: true,
        endAt: true,
        location: true,
        notes: true,
        createdAt: true,
        contact: { select: { id: true, displayName: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    data: data as AppointmentWithRelations[],
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// ---------------------------------------------------------------------------
// getUpcomingAppointments — dashboard widget
// ---------------------------------------------------------------------------

/**
 * Returns upcoming (non-canceled) appointments sorted by start time ascending.
 */
export async function getUpcomingAppointments(limit = 5) {
  const now = new Date();

  return db.appointment.findMany({
    where: {
      startAt: { gte: now },
      status: { notIn: ["CANCELED"] },
    },
    orderBy: { startAt: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      type: true,
      startAt: true,
      location: true,
      contact: { select: { id: true, displayName: true } },
      assignedUser: { select: { id: true, name: true } },
    },
  });
}
