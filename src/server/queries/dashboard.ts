/**
 * src/server/queries/dashboard.ts
 *
 * Aggregated queries for the dashboard stat cards.
 *
 * Each function is purpose-built for its widget — they select only what
 * the widget needs and run efficiently with indexed queries.
 *
 * Called by DashboardStats, which runs them all in parallel with Promise.all.
 */

import { db } from "@/lib/db";
import { startOfWeek, endOfWeek } from "date-fns";

export interface DashboardStats {
  newLeadsThisWeek: number;
  openTaskCount: number;
  overdueTaskCount: number;
  quotesAwaitingResponse: number;
  jobsBookedThisWeek: number;
}

/**
 * Fetches all dashboard stat counts in a single parallel batch.
 * Returns a typed object used by the DashboardStats widget.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [
    newLeadsThisWeek,
    openTaskCount,
    overdueTaskCount,
    quotesAwaitingResponse,
    jobsBookedThisWeek,
  ] = await Promise.all([
    // New contacts (any type) created this week
    db.contact.count({
      where: {
        status: { not: "ARCHIVED" },
        createdAt: { gte: weekStart, lte: weekEnd },
      },
    }),

    // All non-done, non-canceled tasks
    db.task.count({
      where: { status: { notIn: ["COMPLETED", "CANCELED"] } },
    }),

    // Tasks with a past due date that are still open
    db.task.count({
      where: {
        status: { notIn: ["COMPLETED", "CANCELED"] },
        dueAt: { lt: now },
      },
    }),

    // Quotes in SENT or WAITING_ON_RESPONSE status
    db.quote.count({
      where: { status: { in: ["SENT", "WAITING_ON_RESPONSE"] } },
    }),

    // Contacts that moved to BOOKED or IN_PROGRESS this week
    db.contact.count({
      where: {
        status: { not: "ARCHIVED" },
        stage: { in: ["BOOKED", "IN_PROGRESS"] },
        updatedAt: { gte: weekStart, lte: weekEnd },
      },
    }),
  ]);

  return {
    newLeadsThisWeek,
    openTaskCount,
    overdueTaskCount,
    quotesAwaitingResponse,
    jobsBookedThisWeek,
  };
}
