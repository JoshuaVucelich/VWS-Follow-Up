/**
 * src/features/tasks/components/tasks-filters.tsx
 *
 * TasksFilters — filter controls for the tasks list page.
 *
 * Client component that reads/writes URL search params. Supports:
 *   - Status filter (open, done, canceled)
 *   - Priority filter
 *   - Assigned user filter
 *   - Overdue toggle
 *   - Clear all
 *
 * Props:
 *   filters — Current parsed filter values from the server page.
 *   users   — Active users for the assigned-to dropdown.
 */

"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_PRIORITY_OPTIONS } from "@/lib/constants";
import type { TaskFiltersInput } from "@/lib/validations/tasks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TasksFiltersProps {
  filters: TaskFiltersInput;
  users: { id: string; name: string | null; email: string | null }[];
}

// ---------------------------------------------------------------------------
// TasksFilters
// ---------------------------------------------------------------------------

export function TasksFilters({ filters, users }: TasksFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pushFilter = useCallback(
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

  const activeFilterCount = [
    filters.status,
    filters.priority,
    filters.assignedUserId,
    filters.overdue ? "overdue" : undefined,
  ].filter(Boolean).length;

  function clearAllFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["status", "priority", "assignedUserId", "overdue", "page"].forEach((k) =>
      params.delete(k)
    );
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Status */}
      <Select
        value={filters.status ?? ""}
        onValueChange={(v) => pushFilter("status", v || undefined)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All statuses</SelectItem>
          <SelectItem value="OPEN">Open</SelectItem>
          <SelectItem value="IN_PROGRESS">In progress</SelectItem>
          <SelectItem value="COMPLETED">Done</SelectItem>
          <SelectItem value="CANCELED">Canceled</SelectItem>
        </SelectContent>
      </Select>

      {/* Priority */}
      <Select
        value={filters.priority ?? ""}
        onValueChange={(v) => pushFilter("priority", v || undefined)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All priorities</SelectItem>
          {TASK_PRIORITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assigned user */}
      {users.length > 0 && (
        <Select
          value={filters.assignedUserId ?? ""}
          onValueChange={(v) => pushFilter("assignedUserId", v || undefined)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All members</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name ?? u.email ?? u.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Overdue toggle */}
      <Button
        variant={filters.overdue ? "secondary" : "outline"}
        size="sm"
        onClick={() => pushFilter("overdue", filters.overdue ? undefined : "true")}
        className={filters.overdue ? "text-destructive" : ""}
      >
        <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
        Overdue only
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
