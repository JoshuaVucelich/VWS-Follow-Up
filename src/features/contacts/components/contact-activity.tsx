/**
 * src/features/contacts/components/contact-activity.tsx
 *
 * ContactActivity — the activity timeline for a contact.
 *
 * Shows a reverse-chronological list of auto-generated activity events
 * such as stage changes, note additions, and contact creation. Each event
 * shows the action type, the actor's name, and a relative timestamp.
 *
 * Activity entries are created automatically by server actions — users
 * don't add them manually.
 *
 * Props:
 *   activities — Pre-fetched activity entries with user relation.
 */

import { Activity } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { PIPELINE_STAGE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContactStage } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityEntry {
  id: string;
  action: string;
  // Prisma stores metadata as Json (JsonValue), which can be any JSON-serializable value.
  // In practice, logActivity() always stores an object or null.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  createdAt: Date;
  user: { id: string; name: string | null; image: string | null } | null;
}

interface ContactActivityProps {
  activities: ActivityEntry[];
}

// ---------------------------------------------------------------------------
// Helpers — human-readable action descriptions
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeActivity(action: string, metadata: any): string {
  switch (action) {
    case "contact.created":
      return "Contact created";
    case "contact.archived":
      return "Contact archived";
    case "contact.restored":
      return "Contact restored";
    case "note.added": {
      const type = metadata?.type as string | undefined;
      if (type === "CALL_LOG") return "Logged a call";
      if (type === "MEETING_NOTE") return "Added a meeting note";
      return "Added a note";
    }
    case "stage.changed": {
      const from = metadata?.from as ContactStage | undefined;
      const to = metadata?.to as ContactStage | undefined;
      const fromLabel = from ? PIPELINE_STAGE_LABELS[from] : "—";
      const toLabel = to ? PIPELINE_STAGE_LABELS[to] : "—";
      return `Stage changed: ${fromLabel} → ${toLabel}`;
    }
    case "task.created":
      return "Task created";
    case "task.completed":
      return "Task marked complete";
    default:
      // Fallback: make the snake_case action readable
      return action
        .replace(/\./g, " ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

// ---------------------------------------------------------------------------
// ContactActivity
// ---------------------------------------------------------------------------

export function ContactActivity({ activities }: ContactActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No activity recorded yet.
          </p>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" aria-hidden />

            {activities.map((entry, i) => (
              <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                {/* Timeline dot */}
                <div className="relative z-10 mt-1 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border border-border bg-background">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-foreground">
                    {describeActivity(entry.action, entry.metadata)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.user?.name ?? "System"} · {formatRelativeTime(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
