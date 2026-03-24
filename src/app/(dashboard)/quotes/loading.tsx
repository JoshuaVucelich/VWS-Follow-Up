/**
 * src/app/(dashboard)/quotes/loading.tsx
 *
 * Quotes page skeleton shown while the server component fetches data.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function QuotesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-48" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="border-b border-border bg-muted/50 px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-28 hidden md:block" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-16 hidden sm:block" />
        </div>

        {/* Rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-b border-border px-4 py-3 flex items-center gap-4 last:border-0"
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-4 w-24 hidden md:block" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-4 w-16 hidden sm:block" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        ))}

        {/* Pagination */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
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
