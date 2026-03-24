/**
 * src/components/ui/skeleton.tsx
 *
 * Skeleton loading placeholder component.
 *
 * Used to show a pulsing placeholder while content is loading.
 * Compose multiple Skeletons to match the shape of the content being loaded.
 *
 * Usage:
 *   <Skeleton className="h-4 w-[250px]" />
 *   <Skeleton className="h-10 w-10 rounded-full" />
 */

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  );
}

export { Skeleton };
