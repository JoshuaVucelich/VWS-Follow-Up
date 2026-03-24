/**
 * src/app/(dashboard)/appointments/loading.tsx
 *
 * Appointments page skeleton shown while the server component fetches data.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function AppointmentsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Cards */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 px-4 py-4">
            {/* Date block */}
            <div className="flex-shrink-0 w-14 space-y-1 text-center">
              <Skeleton className="h-6 w-8 mx-auto" />
              <Skeleton className="h-3 w-8 mx-auto" />
              <Skeleton className="h-3 w-10 mx-auto" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>

            <Skeleton className="h-7 w-7 rounded flex-shrink-0" />
          </div>
        ))}

        {/* Pagination */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
