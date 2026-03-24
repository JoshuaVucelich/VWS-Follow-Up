/**
 * src/features/dashboard/components/upcoming-appointments.tsx
 *
 * Dashboard widget showing the next upcoming appointments/jobs.
 *
 * Server component — fetches data via getUpcomingAppointments().
 */

import Link from "next/link";
import { CalendarDays, MapPin, ArrowRight, User } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { getUpcomingAppointments } from "@/server/queries/appointments";
import { APPOINTMENT_TYPE_OPTIONS } from "@/lib/constants";

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  APPOINTMENT_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export async function UpcomingAppointments() {
  const appointments = await getUpcomingAppointments(5);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Upcoming Appointments</h2>
        </div>
        <Link
          href="/appointments?upcoming=true"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {appointments.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No upcoming appointments.
          </div>
        ) : (
          appointments.map((appt) => (
            <div key={appt.id} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{appt.title}</p>
                <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">
                  {TYPE_LABEL[appt.type] ?? "Appointment"}
                </span>
              </div>

              {appt.contact && (
                <Link
                  href={`/contacts/${appt.contact.id}`}
                  className="block text-xs text-primary hover:underline"
                >
                  {appt.contact.displayName}
                </Link>
              )}

              <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{formatDateTime(appt.startAt)}</span>
                {appt.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate max-w-[140px]">{appt.location}</span>
                  </span>
                )}
                {appt.assignedUser && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 flex-shrink-0" />
                    {appt.assignedUser.name}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
