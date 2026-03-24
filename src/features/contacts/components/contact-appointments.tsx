/**
 * src/features/contacts/components/contact-appointments.tsx
 *
 * ContactAppointments — displays upcoming and past appointments for a contact.
 *
 * Shows appointments sorted by startAt, with upcoming first.
 * The "+" button opens CreateAppointmentDialog pre-linked to this contact.
 *
 * Props:
 *   appointments — Pre-fetched appointments with assignedUser relation.
 *   contactId    — The contact's ID, passed as defaultContactId to the dialog.
 *   users        — Active workspace users for the assignment dropdown in the form.
 */

import { CalendarDays, Plus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { APPOINTMENT_TYPE_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateAppointmentDialog } from "@/features/appointments/components/create-appointment-dialog";
import type { AppointmentStatus, AppointmentType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppointmentItem {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startAt: Date;
  endAt: Date | null;
  notes: string | null;
  assignedUser: { id: string; name: string | null } | null;
}

interface ContactAppointmentsUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface ContactAppointmentsProps {
  appointments: AppointmentItem[];
  contactId: string;
  users: ContactAppointmentsUser[];
}

// ---------------------------------------------------------------------------
// Status styles — aligned with AppointmentStatus enum (no NO_SHOW)
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-gray-100 text-gray-500",
  RESCHEDULED: "bg-amber-100 text-amber-700",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
  RESCHEDULED: "Rescheduled",
};

// ---------------------------------------------------------------------------
// ContactAppointments
// ---------------------------------------------------------------------------

export function ContactAppointments({
  appointments,
  contactId,
  users,
}: ContactAppointmentsProps) {
  const typeLabel = (type: AppointmentType) =>
    APPOINTMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => a.startAt >= now && a.status !== "CANCELED"
  );
  const past = appointments.filter(
    (a) => a.startAt < now || a.status === "CANCELED"
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Appointments
            {upcoming.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                {upcoming.length} upcoming
              </span>
            )}
          </CardTitle>
          <CreateAppointmentDialog
            users={users}
            defaultContactId={contactId}
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Schedule appointment">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No appointments yet. Use the + button to schedule one.
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((appt) => (
              <AppointmentRow key={appt.id} appt={appt} typeLabel={typeLabel} />
            ))}

            {past.length > 0 && upcoming.length > 0 && (
              <div className="border-t border-border pt-2 mt-2">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide mb-2 px-2">
                  Past
                </p>
              </div>
            )}

            {past.map((appt) => (
              <AppointmentRow key={appt.id} appt={appt} typeLabel={typeLabel} muted />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AppointmentRow
// ---------------------------------------------------------------------------

function AppointmentRow({
  appt,
  typeLabel,
  muted = false,
}: {
  appt: AppointmentItem;
  typeLabel: (t: AppointmentType) => string;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent/30 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{typeLabel(appt.type)}</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[appt.status]}`}
          >
            {STATUS_LABELS[appt.status]}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatDateTime(appt.startAt)}
          {appt.assignedUser && ` · ${appt.assignedUser.name}`}
        </div>
        {appt.notes && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{appt.notes}</p>
        )}
      </div>
    </div>
  );
}
