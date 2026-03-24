/**
 * src/app/(dashboard)/appointments/page.tsx
 *
 * Appointments and jobs page.
 *
 * Lists all scheduled appointments/jobs across contacts.
 * Default view shows upcoming non-canceled appointments sorted by date.
 *
 * URL: /appointments
 * Query params (all optional): type, status, assignedUserId, upcoming, page
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateAppointmentDialog } from "@/features/appointments/components/create-appointment-dialog";
import { AppointmentsList } from "@/features/appointments/components/appointments-list";
import { AppointmentsFilters } from "@/features/appointments/components/appointments-filters";
import { getAppointments } from "@/server/queries/appointments";
import { getActiveUsers } from "@/server/queries/users";
import { getContactsForPicker } from "@/server/queries/contacts";
import { getCurrentUser } from "@/lib/session";
import { appointmentFiltersSchema } from "@/lib/validations/appointments";

export const metadata: Metadata = {
  title: "Appointments",
};

interface AppointmentsPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const rawParams = Object.fromEntries(
    Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  );

  const parsedFilters = appointmentFiltersSchema.safeParse(rawParams);
  const filters = parsedFilters.success ? parsedFilters.data : appointmentFiltersSchema.parse({});

  const [{ data: appointments, total, page, perPage, totalPages }, users, contacts, currentUser] =
    await Promise.all([
      getAppointments(filters),
      getActiveUsers(),
      getContactsForPicker(),
      getCurrentUser(),
    ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage scheduled visits and jobs.
          </p>
        </div>
        <CreateAppointmentDialog users={users} contacts={contacts} />
      </div>

      {/* Filters */}
      <Suspense fallback={<Skeleton className="h-9 w-full max-w-2xl" />}>
        <AppointmentsFilters filters={filters} users={users} total={total} />
      </Suspense>

      {/* Appointments list */}
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <AppointmentsList
          appointments={appointments}
          total={total}
          page={page}
          perPage={perPage}
          totalPages={totalPages}
          filters={filters}
          userRole={currentUser.role}
        />
      </Suspense>
    </div>
  );
}
