/**
 * src/features/contacts/components/contact-stage-badge.tsx
 *
 * ContactStageBadge — colored pill label for a contact's pipeline stage.
 *
 * Each stage has a distinct color to make it easy to visually scan a list
 * of contacts and understand where each one stands in the pipeline.
 *
 * Used in: ContactsTable, ContactHeader, pipeline board cards.
 *
 * Props:
 *   stage — a ContactStage enum value
 */

import type { ContactStage } from "@prisma/client";
import { PIPELINE_STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Tailwind color classes for each stage. */
const STAGE_COLORS: Record<ContactStage, string> = {
  NEW_LEAD: "bg-blue-100 text-blue-700 border-blue-200",
  CONTACTED: "bg-violet-100 text-violet-700 border-violet-200",
  QUOTE_REQUESTED: "bg-cyan-100 text-cyan-700 border-cyan-200",
  QUOTE_SENT: "bg-amber-100 text-amber-700 border-amber-200",
  WAITING_ON_RESPONSE: "bg-orange-100 text-orange-700 border-orange-200",
  FOLLOW_UP_NEEDED: "bg-rose-100 text-rose-700 border-rose-200",
  BOOKED: "bg-green-100 text-green-700 border-green-200",
  IN_PROGRESS: "bg-teal-100 text-teal-700 border-teal-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  LOST: "bg-gray-100 text-gray-500 border-gray-200",
};

interface ContactStageBadgeProps {
  stage: ContactStage;
  className?: string;
}

export function ContactStageBadge({ stage, className }: ContactStageBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STAGE_COLORS[stage],
        className
      )}
    >
      {PIPELINE_STAGE_LABELS[stage]}
    </span>
  );
}
