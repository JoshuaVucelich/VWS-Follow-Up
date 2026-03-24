/**
 * src/features/dashboard/components/recent-contacts.tsx
 *
 * Dashboard widget showing recently added contacts.
 *
 * Server component — fetches data via getRecentContacts().
 */

import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { getRecentContacts } from "@/server/queries/contacts";

const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  QUOTE_REQUESTED: "Quote Requested",
  QUOTE_SENT: "Quote Sent",
  WAITING_ON_RESPONSE: "Waiting",
  FOLLOW_UP_NEEDED: "Follow Up",
  BOOKED: "Booked",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  LOST: "Lost",
};

export async function RecentContacts() {
  const contacts = await getRecentContacts(8);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Recent Contacts</h2>
        </div>
        <Link
          href="/contacts"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {contacts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No contacts yet. Add your first contact to get started.
          </div>
        ) : (
          contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
            >
              {/* Avatar */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {getInitials(contact.displayName)}
              </div>

              {/* Name + source */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{contact.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {contact.source.replace(/_/g, " ").toLowerCase()}
                </p>
              </div>

              {/* Stage badge + date */}
              <div className="flex items-center gap-3 flex-shrink-0 text-right">
                <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                  {STAGE_LABELS[contact.stage] ?? contact.stage}
                </span>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {formatDate(contact.createdAt)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
