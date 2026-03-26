/**
 * src/features/contacts/components/pipeline-stats.tsx
 *
 * PipelineStats — summary bar above the kanban board.
 *
 * Shows a quick snapshot of where contacts stand in the pipeline:
 *   - Total active contacts
 *   - Count at key stages (New Leads, Quoted, Booked)
 *   - Overdue follow-ups count
 *
 * This is a pure display component — all counts are computed from the
 * contacts array already fetched by the page, so no extra DB query is needed.
 *
 * Props:
 *   contacts       — All pipeline contacts (used to compute per-stage counts).
 *   overdueCount   — Number of contacts with a past nextFollowUpAt.
 */

import { Users, TrendingUp, CalendarX, BadgeCheck } from "lucide-react";
import type { PipelineContact } from "@/server/queries/contacts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineStatsProps {
  contacts: PipelineContact[];
}

// ---------------------------------------------------------------------------
// StatPill — a small labeled count chip
// ---------------------------------------------------------------------------

function StatPill({
  icon: Icon,
  label,
  count,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
        highlight && count > 0
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border bg-card"
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0 opacity-70" />
      <div>
        <p className="text-xs text-muted-foreground leading-none mb-0.5">
          {label}
        </p>
        <p className="text-lg font-semibold tabular-nums leading-none">
          {count}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PipelineStats
// ---------------------------------------------------------------------------

export function PipelineStats({ contacts }: PipelineStatsProps) {
  const total = contacts.length;

  const newLeads = contacts.filter((c) => c.stage === "NEW_LEAD").length;

  const quoted = contacts.filter(
    (c) => c.stage === "QUOTE_REQUESTED" || c.stage === "QUOTE_SENT",
  ).length;

  const booked = contacts.filter(
    (c) => c.stage === "BOOKED" || c.stage === "IN_PROGRESS",
  ).length;

  const overdueFollowUps = contacts.filter(
    (c) => c.nextFollowUpAt != null && c.nextFollowUpAt < new Date(),
  ).length;

  return (
    <div className="flex flex-wrap gap-3">
      <StatPill icon={Users} label="Active contacts" count={total} />
      <StatPill icon={TrendingUp} label="New leads" count={newLeads} />
      <StatPill icon={BadgeCheck} label="Quoted" count={quoted} />
      <StatPill icon={BadgeCheck} label="Booked" count={booked} />
      <StatPill
        icon={CalendarX}
        label="Overdue follow-ups"
        count={overdueFollowUps}
        highlight
      />
    </div>
  );
}
