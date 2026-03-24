/**
 * src/features/appointments/components/appointments-filters.tsx
 *
 * AppointmentsFilters — client component for filtering the appointments list.
 *
 * Filter state lives in URL search params.
 *
 * Props:
 *   filters — Parsed filter values from URL params (passed from the page).
 *   users   — Active users for the "Assigned to" dropdown.
 *   total   — Total matching count to display.
 */

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPOINTMENT_TYPE_OPTIONS } from "@/lib/constants";
import type { AppointmentFiltersInput } from "@/lib/validations/appointments";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppointmentsFiltersUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface AppointmentsFiltersProps {
  filters: AppointmentFiltersInput;
  users?: AppointmentsFiltersUser[];
  total?: number;
}

// ---------------------------------------------------------------------------
// AppointmentsFilters
// ---------------------------------------------------------------------------

const APPOINTMENT_STATUS_OPTIONS = [
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Canceled", value: "CANCELED" },
  { label: "Rescheduled", value: "RESCHEDULED" },
];

export function AppointmentsFilters({
  filters,
  users = [],
  total,
}: AppointmentsFiltersProps) {
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
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const activeCount = [
    filters.type,
    filters.status,
    filters.assignedUserId,
    filters.upcoming,
  ].filter(Boolean).length;

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Upcoming toggle */}
      <Button
        variant={filters.upcoming ? "default" : "outline"}
        size="sm"
        className="h-9"
        onClick={() => updateParam("upcoming", filters.upcoming ? undefined : "true")}
      >
        Upcoming only
      </Button>

      {/* Type filter */}
      <Select
        value={filters.type ?? ""}
        onValueChange={(v) => updateParam("type", v || undefined)}
      >
        <SelectTrigger className="h-9 w-48">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All types</SelectItem>
          {APPOINTMENT_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={filters.status ?? ""}
        onValueChange={(v) => updateParam("status", v || undefined)}
      >
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All statuses</SelectItem>
          {APPOINTMENT_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assigned user filter */}
      {users.length > 0 && (
        <Select
          value={filters.assignedUserId ?? ""}
          onValueChange={(v) => updateParam("assignedUserId", v || undefined)}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All staff</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name ?? u.email ?? u.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear */}
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-9 gap-1.5">
          <X className="h-3.5 w-3.5" />
          Clear ({activeCount})
        </Button>
      )}

      {/* Total count */}
      {total !== undefined && (
        <span className="ml-auto text-sm text-muted-foreground">
          {total} {total === 1 ? "appointment" : "appointments"}
        </span>
      )}
    </div>
  );
}
