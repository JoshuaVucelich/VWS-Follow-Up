/**
 * src/app/(dashboard)/contacts/loading.tsx
 *
 * Loading UI for the contacts list page.
 *
 * Next.js automatically shows this component while the page is streaming.
 * Uses skeleton placeholders that match the shape of the actual content.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function ContactsLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Filters skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="border-b border-border bg-muted/50 px-4 py-3 flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20 ml-auto hidden sm:block" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-24 hidden lg:block" />
        </div>

        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-24 ml-auto hidden sm:block" />
            <Skeleton className="h-5 w-20 rounded-full hidden" />
            <Skeleton className="h-4 w-16 hidden md:block" />
          </div>
        ))}

        {/* Pagination */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
