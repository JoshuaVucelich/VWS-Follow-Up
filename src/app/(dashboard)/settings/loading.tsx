/**
 * src/app/(dashboard)/settings/loading.tsx
 *
 * Loading skeleton for the settings page.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 max-w-md">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-9 w-32 rounded-md mt-2" />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Page header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Separator />

      {/* Business section */}
      <section className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <SectionSkeleton rows={2} />
      </section>

      <Separator />

      {/* Profile section */}
      <section className="space-y-4">
        <Skeleton className="h-6 w-28" />
        <SectionSkeleton rows={2} />
        <Separator className="max-w-md" />
        <div className="max-w-md space-y-1.5">
          <Skeleton className="h-5 w-36" />
        </div>
        <SectionSkeleton rows={3} />
      </section>

      <Separator />

      {/* Team members section */}
      <section className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2 max-w-xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Import / Export section */}
      <section className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
      </section>
    </div>
  );
}
