/**
 * src/features/contacts/components/contacts-filters.tsx
 *
 * ContactsFilters — search input and filter dropdowns for the contacts list.
 *
 * This is a client component that reads/writes URL search params directly.
 * Changing any filter triggers a soft navigation (router.push) which causes
 * the server component (ContactsPage) to re-fetch with the new params.
 *
 * The search input is debounced so it doesn't fire on every keystroke.
 *
 * Props:
 *   filters — Current parsed filter values (from the server component).
 *   users   — Active users for the "Assigned To" dropdown.
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
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, CONTACT_SOURCE_OPTIONS } from "@/lib/constants";
import type { ContactFiltersInput } from "@/lib/validations/contacts";

interface ContactsFiltersProps {
  filters: ContactFiltersInput;
  users: { id: string; name: string | null; email: string | null }[];
}

const DEBOUNCE_MS = 350;
const ALL_OPTION = "__all__";

export function ContactsFilters({ filters, users }: ContactsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for the search input so the UI stays snappy while debouncing
  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Returns a new URLSearchParams with the given key/value applied (or removed). */
  const buildParams = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 whenever any filter changes
      params.delete("page");
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
  // Search (debounced)
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

  // Keep local search in sync if navigated externally (e.g. back button)
  useEffect(() => {
    setSearchValue(filters.search ?? "");
  }, [filters.search]);

  // ---------------------------------------------------------------------------
  // Count active non-search filters to show a clear button
  // ---------------------------------------------------------------------------

  const activeFilterCount = [filters.stage, filters.type, filters.source, filters.assignedUserId].filter(
    Boolean
  ).length;

  function clearAllFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["stage", "type", "source", "assignedUserId", "page"].forEach((k) => params.delete(k));
    router.push(`${pathname}?${params.toString()}`);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search by name, phone, email…"
          className="pl-8"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          aria-label="Search contacts"
        />
      </div>

      {/* Stage filter */}
      <Select
        value={filters.stage ?? ALL_OPTION}
        onValueChange={(v) => pushFilter("stage", v === ALL_OPTION ? undefined : v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_OPTION}>All stages</SelectItem>
          {PIPELINE_STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {PIPELINE_STAGE_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type filter */}
      <Select
        value={filters.type ?? ALL_OPTION}
        onValueChange={(v) => pushFilter("type", v === ALL_OPTION ? undefined : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_OPTION}>All types</SelectItem>
          <SelectItem value="LEAD">Leads</SelectItem>
          <SelectItem value="CUSTOMER">Customers</SelectItem>
        </SelectContent>
      </Select>

      {/* Source filter */}
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

      {/* Assigned user filter */}
      {users.length > 0 && (
        <Select
          value={filters.assignedUserId ?? ALL_OPTION}
          onValueChange={(v) => pushFilter("assignedUserId", v === ALL_OPTION ? undefined : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All team members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OPTION}>All team members</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name ?? u.email ?? u.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Archived toggle */}
      <Button
        variant={filters.archived ? "secondary" : "outline"}
        size="sm"
        onClick={() => pushFilter("archived", filters.archived ? undefined : "true")}
      >
        {filters.archived ? "Showing archived" : "Archived"}
      </Button>

      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
          <X className="mr-1 h-3.5 w-3.5" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
