/**
 * src/app/(dashboard)/pipeline/loading.tsx
 *
 * Loading UI for the pipeline page.
 *
 * Shown by Next.js while the server component is streaming. Uses skeleton
 * placeholders that roughly match the shape of the kanban columns.
 */

import { Skeleton } from "@/components/ui/skeleton";

const VISIBLE_COLUMN_COUNT = 7;
const CARDS_PER_COLUMN = [2, 1, 3, 2, 1, 0, 1];

export default function PipelineLoading() {
  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Stats bar skeleton */}
      <div className="flex gap-3 flex-shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-36 rounded-lg" />
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-3 flex-shrink-0">
        <Skeleton className="h-9 flex-1 max-w-xs" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Board skeleton — horizontal columns */}
      <div className="flex gap-3 overflow-hidden flex-1">
        {Array.from({ length: VISIBLE_COLUMN_COUNT }).map((_, colIndex) => (
          <div
            key={colIndex}
            className="flex flex-col flex-shrink-0 w-[260px] rounded-xl border border-border bg-muted/20"
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>

            {/* Card skeletons */}
            <div className="flex-1 p-2 space-y-2">
              {Array.from({ length: CARDS_PER_COLUMN[colIndex] ?? 0 }).map((_, cardIndex) => (
                <div key={cardIndex} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
