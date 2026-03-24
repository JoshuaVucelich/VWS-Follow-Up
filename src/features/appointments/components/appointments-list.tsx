/**
 * src/features/appointments/components/appointments-list.tsx
 *
 * AppointmentsList — paginated list of appointments with inline status updates.
 *
 * Client component so it can:
 *   - Call server actions for status updates and deletion
 *   - Build pagination links from useSearchParams
 *   - Show pending state during mutations
 *
 * Props:
 *   appointments — Pre-fetched appointment list from the server.
 *   total / page / perPage / totalPages — Pagination state.
 *   filters      — Active filters (used to preserve them in pagination links).
 *   userRole     — Controls whether the delete action is shown.
 */

"use client";

import { useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateTime } from "@/lib/utils";
import { updateAppointmentStatus, deleteAppointment } from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPOINTMENT_TYPE_OPTIONS } from "@/lib/constants";
import type { AppointmentWithRelations } from "@/server/queries/appointments";
import type { AppointmentFiltersInput } from "@/lib/validations/appointments";
import type { UserRole, AppointmentStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppointmentsListProps {
  appointments: AppointmentWithRelations[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  filters: AppointmentFiltersInput;
  userRole: UserRole;
}

// ---------------------------------------------------------------------------
// Helpers / constants
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  APPOINTMENT_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  CANCELED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  RESCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
  RESCHEDULED: "Rescheduled",
};

const STATUS_TRANSITIONS: { label: string; status: AppointmentStatus }[] = [
  { label: "Mark confirmed", status: "CONFIRMED" },
  { label: "Mark completed", status: "COMPLETED" },
  { label: "Mark rescheduled", status: "RESCHEDULED" },
  { label: "Cancel", status: "CANCELED" },
];

// ---------------------------------------------------------------------------
// AppointmentRowActions
// ---------------------------------------------------------------------------

function AppointmentRowActions({
  appt,
  userRole,
}: {
  appt: AppointmentWithRelations;
  userRole: UserRole;
}) {
  const [isPending, startTransition] = useTransition();

  function handleStatus(status: AppointmentStatus) {
    startTransition(async () => {
      const result = await updateAppointmentStatus(appt.id, { status });
      if (!result.success) toast.error(result.error);
      else toast.success("Status updated.");
    });
  }

  function handleDelete() {
    if (!confirm("Delete this appointment? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteAppointment(appt.id);
      if (!result.success) toast.error(result.error);
      else toast.success("Appointment deleted.");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity"
          disabled={isPending}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Update status
        </DropdownMenuLabel>
        {STATUS_TRANSITIONS.filter((t) => t.status !== appt.status).map((t) => (
          <DropdownMenuItem
            key={t.status}
            onSelect={() => handleStatus(t.status)}
            className={t.status === "CANCELED" ? "text-destructive focus:text-destructive" : ""}
          >
            {t.label}
          </DropdownMenuItem>
        ))}
        {userRole === "OWNER" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete appointment
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// AppointmentsList
// ---------------------------------------------------------------------------

export function AppointmentsList({
  appointments,
  total,
  page,
  perPage,
  totalPages,
  filters,
  userRole,
}: AppointmentsListProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildPageUrl(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    return `${pathname}?${params.toString()}`;
  }

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const now = new Date();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {appointments.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          {filters.upcoming || filters.type || filters.status || filters.assignedUserId
            ? "No appointments match your current filters."
            : "No appointments yet. Schedule your first appointment to get started."}
        </div>
      ) : (
        <>
          {/* Cards */}
          <div className="divide-y divide-border">
            {appointments.map((appt) => {
              const isPast = appt.startAt < now && appt.status !== "COMPLETED";
              const isCanceled = appt.status === "CANCELED";

              return (
                <div
                  key={appt.id}
                  className={cn(
                    "group/row flex items-start gap-4 px-4 py-4 hover:bg-accent/30 transition-colors",
                    (isPast || isCanceled) && "opacity-60"
                  )}
                >
                  {/* Date block */}
                  <div className="flex-shrink-0 w-14 text-center">
                    <p className="text-lg font-bold leading-none">
                      {appt.startAt.getDate()}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {appt.startAt.toLocaleString("default", { month: "short" })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {appt.startAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn("text-sm font-medium", isCanceled && "line-through")}>
                            {appt.title}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              STATUS_STYLES[appt.status]
                            )}
                          >
                            {STATUS_LABELS[appt.status]}
                          </span>
                          <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                            {TYPE_LABEL[appt.type] ?? appt.type}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {appt.contact && (
                            <Link
                              href={`/contacts/${appt.contact.id}`}
                              className="hover:text-primary transition-colors font-medium text-foreground/80"
                            >
                              {appt.contact.displayName}
                            </Link>
                          )}
                          {appt.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{appt.location}</span>
                            </span>
                          )}
                          {appt.assignedUser && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3 flex-shrink-0" />
                              {appt.assignedUser.name}
                            </span>
                          )}
                          {appt.endAt && (
                            <span>
                              ends {appt.endAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </span>
                          )}
                        </div>

                        {appt.notes && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {appt.notes}
                          </p>
                        )}
                      </div>

                      {/* Row actions */}
                      <div className="flex-shrink-0">
                        <AppointmentRowActions appt={appt} userRole={userRole} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {start}–{end} of {total} appointment{total !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={page <= 1}
                className="h-8 gap-1"
              >
                <Link href={buildPageUrl(page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={page >= totalPages}
                className="h-8 gap-1"
              >
                <Link href={buildPageUrl(page + 1)}>
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
