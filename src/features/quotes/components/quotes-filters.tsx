/**
 * src/features/quotes/components/quotes-filters.tsx
 *
 * QuotesFilters — client component for filtering the quotes list.
 *
 * Filter state lives in URL search params, which allows:
 *   - Shareable filtered URLs
 *   - Back/forward navigation
 *   - Server-side filtering on page load
 *
 * Props:
 *   filters — Parsed filter values from URL params (passed from the page).
 */

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QUOTE_STATUS_OPTIONS } from "@/lib/constants";
import type { QuoteFiltersInput } from "@/lib/validations/quotes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuotesFiltersProps {
  filters: QuoteFiltersInput;
  total?: number;
}

// ---------------------------------------------------------------------------
// QuotesFilters
// ---------------------------------------------------------------------------

export function QuotesFilters({ filters, total }: QuotesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Count active filters (excluding pagination)
  const activeCount = [filters.search, filters.status].filter(Boolean).length;

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <Input
        placeholder="Search quotes or contacts…"
        className="h-9 w-64"
        defaultValue={filters.search ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          clearTimeout((window as Window & { _qfTimeout?: ReturnType<typeof setTimeout> })._qfTimeout);
          (window as Window & { _qfTimeout?: ReturnType<typeof setTimeout> })._qfTimeout = setTimeout(
            () => updateParam("search", val || undefined),
            350
          );
        }}
      />

      {/* Status filter */}
      <Select
        value={filters.status ?? ""}
        onValueChange={(v) => updateParam("status", v || undefined)}
      >
        <SelectTrigger className="h-9 w-48">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All statuses</SelectItem>
          {QUOTE_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-9 gap-1.5">
          <X className="h-3.5 w-3.5" />
          Clear ({activeCount})
        </Button>
      )}

      {/* Total count */}
      {total !== undefined && (
        <span className="ml-auto text-sm text-muted-foreground">
          {total} {total === 1 ? "quote" : "quotes"}
        </span>
      )}
    </div>
  );
}
