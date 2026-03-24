/**
 * src/features/dashboard/components/overdue-follow-ups.tsx
 *
 * Dashboard widget for contacts whose follow-up date has passed.
 *
 * Server component — fetches data via getOverdueFollowUps().
 */

import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import { getOverdueFollowUps } from "@/server/queries/contacts";

export async function OverdueFollowUps() {
  const contacts = await getOverdueFollowUps(10);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-semibold">Overdue Follow-Ups</h2>
          {contacts.length > 0 && (
            <span className="text-xs font-semibold text-destructive bg-destructive/10 rounded-full px-1.5 py-0.5">
              {contacts.length}
            </span>
          )}
        </div>
        <Link
          href="/contacts?overdue=true"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {contacts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No overdue follow-ups.
          </div>
        ) : (
          contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                {getInitials(contact.displayName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{contact.displayName}</p>
                <p className="text-xs text-muted-foreground">{contact.phone ?? "—"}</p>
              </div>
              <span className="text-xs text-destructive font-medium flex-shrink-0">
                {contact.nextFollowUpAt ? formatRelativeTime(contact.nextFollowUpAt) : "—"}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
