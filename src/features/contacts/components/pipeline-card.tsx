/**
 * src/features/contacts/components/pipeline-card.tsx
 *
 * PipelineCard — a single contact card on the kanban board.
 *
 * Displays the contact's name, business name, phone, assigned user avatar,
 * next follow-up date (highlighted red when overdue), and a task/note count
 * badge so the user can see at a glance if there's activity on this contact.
 *
 * This component is used inside Draggable from @hello-pangea/dnd.
 * It receives a `dragHandleProps` forwarded from the Draggable wrapper.
 *
 * The card links to the contact detail page. Clicking the link does NOT
 * interfere with dragging because the drag handle covers the whole card
 * and the link only fires on a clean click (not after a drag).
 *
 * Props:
 *   contact         — Pipeline contact data from getPipelineContacts().
 *   isDragging      — Whether this card is currently being dragged.
 */

import Link from "next/link";
import { Phone, Calendar, CheckSquare } from "lucide-react";
import { getInitials, formatDate, formatPhone } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { PipelineContact } from "@/server/queries/contacts";

interface PipelineCardProps {
  contact: PipelineContact;
  isDragging: boolean;
}

export function PipelineCard({ contact, isDragging }: PipelineCardProps) {
  const isFollowUpOverdue =
    contact.nextFollowUpAt != null && contact.nextFollowUpAt < new Date();

  const totalActivity = contact._count.tasks + contact._count.contactNotes;

  return (
    <Link
      href={`/contacts/${contact.id}`}
      className={cn(
        "block rounded-lg border bg-card p-3 shadow-sm transition-all",
        "hover:border-primary/40 hover:shadow-md",
        isDragging && "shadow-lg border-primary/40 rotate-1 opacity-95"
      )}
      // Prevent the link from triggering while the user is dragging
      draggable={false}
    >
      {/* Name row */}
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold select-none">
          {getInitials(contact.displayName)}
        </div>

        {/* Name + business */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight truncate">
            {contact.displayName}
          </p>
          {contact.businessName && (
            <p className="text-[11px] text-muted-foreground leading-tight truncate">
              {contact.businessName}
            </p>
          )}
        </div>

        {/* Assigned user avatar */}
        {contact.assignedUser && (
          <div
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-semibold text-secondary-foreground"
            title={contact.assignedUser.name ?? undefined}
          >
            {getInitials(contact.assignedUser.name ?? "")}
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {contact.phone && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Phone className="h-3 w-3 flex-shrink-0" />
            {formatPhone(contact.phone)}
          </span>
        )}

        {contact.nextFollowUpAt && (
          <span
            className={cn(
              "flex items-center gap-1 text-[11px] font-medium",
              isFollowUpOverdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <Calendar className="h-3 w-3 flex-shrink-0" />
            {formatDate(contact.nextFollowUpAt)}
          </span>
        )}

        {totalActivity > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <CheckSquare className="h-3 w-3 flex-shrink-0" />
            {totalActivity}
          </span>
        )}
      </div>
    </Link>
  );
}
