/**
 * src/features/contacts/components/pipeline-filters.tsx
 *
 * PipelineFilters — search and filter controls for the pipeline board.
 *
 * A client component that reads/writes URL search params. When filters
 * change the server component re-fetches contacts with the new criteria.
 *
 * Controls:
 *   - Search (debounced, by name/phone)
 *   - Assigned user dropdown
 *   - Source dropdown
 *   - Type (lead vs customer)
 *   - Clear all button
 *
 * Props:
 *   filters — Current parsed filter values passed down from the server page.
 *   users   — Active users for the assigned-to dropdown.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTACT_SOURCE_OPTIONS } from "@/lib/constants";
import type { PipelineFiltersInput } from "@/lib/validations/pipeline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineFiltersProps {
  filters: PipelineFiltersInput;
  users: { id: string; name: string | null; email: string | null }[];
  totalContacts: number;
}

const DEBOUNCE_MS = 350;
const ALL_OPTION = "__all__";

// ---------------------------------------------------------------------------
// PipelineFilters
// ---------------------------------------------------------------------------

export function PipelineFilters({ filters, users, totalContacts }: PipelineFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // URL helpers
  // ---------------------------------------------------------------------------

  const buildParams = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      return params.toString();
    },
    [searchParams]
  );

  const pushFilter = useCallback(
    (key: string, value: string | undefined) => {
      router.push(`${pathname}?${buildParams(key, value)}`);
    },
    [router, pathname, buildParams]
  );

  // ---------------------------------------------------------------------------
  // Debounced search
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushFilter("search", searchValue || undefined);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  useEffect(() => {
    setSearchValue(filters.search ?? "");
  }, [filters.search]);

  // ---------------------------------------------------------------------------
  // Active filter count for "Clear" button
  // ---------------------------------------------------------------------------

  const activeFilterCount = [filters.assignedUserId, filters.source, filters.type].filter(
    Boolean
  ).length;

  function clearAllFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["assignedUserId", "source", "type"].forEach((k) => params.delete(k));
    router.push(`${pathname}?${params.toString()}`);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search by name or phone…"
          className="pl-8"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          aria-label="Search pipeline"
        />
      </div>

      {/* Assigned user */}
      {users.length > 0 && (
        <Select
          value={filters.assignedUserId ?? ALL_OPTION}
          onValueChange={(v) => pushFilter("assignedUserId", v === ALL_OPTION ? undefined : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OPTION}>All members</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name ?? u.email ?? u.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Source */}
      <Select
        value={filters.source ?? ALL_OPTION}
        onValueChange={(v) => pushFilter("source", v === ALL_OPTION ? undefined : v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_OPTION}>All sources</SelectItem>
          {CONTACT_SOURCE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type */}
      <Select
        value={filters.type ?? ALL_OPTION}
        onValueChange={(v) => pushFilter("type", v === ALL_OPTION ? undefined : v)}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_OPTION}>All types</SelectItem>
          <SelectItem value="LEAD">Leads</SelectItem>
          <SelectItem value="CUSTOMER">Customers</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
          <X className="mr-1 h-3.5 w-3.5" />
          Clear ({activeFilterCount})
        </Button>
      )}

      {/* Contact count */}
      <span className="ml-auto text-xs text-muted-foreground">
        {totalContacts} contact{totalContacts !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
