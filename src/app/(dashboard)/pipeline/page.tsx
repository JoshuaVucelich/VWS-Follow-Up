/**
 * src/app/(dashboard)/pipeline/page.tsx
 *
 * Pipeline / Kanban board page.
 *
 * Visualizes all active contacts across pipeline stages as draggable cards.
 * Fetches contacts server-side based on URL search params (filters), then
 * passes the flat array to the client board which groups by stage and
 * handles drag-and-drop stage updates.
 *
 * URL: /pipeline
 * Query params (all optional):
 *   search, assignedUserId, source, type
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineBoard } from "@/features/contacts/components/pipeline-board";
import { PipelineFilters } from "@/features/contacts/components/pipeline-filters";
import { PipelineStats } from "@/features/contacts/components/pipeline-stats";
import { getPipelineContacts } from "@/server/queries/contacts";
import { getActiveUsers } from "@/server/queries/users";
import { pipelineFiltersSchema } from "@/lib/validations/pipeline";

export const metadata: Metadata = {
  title: "Pipeline",
};

interface PipelinePageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function PipelinePage({ searchParams }: PipelinePageProps) {
  // Normalise searchParams
  const rawParams = Object.fromEntries(
    Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  );

  const filters = pipelineFiltersSchema.parse(rawParams);

  // Fetch contacts and users in parallel
  const [contacts, users] = await Promise.all([
    getPipelineContacts(filters),
    getActiveUsers(),
  ]);

  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Page header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag contacts between stages to update their status.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/contacts/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Link>
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex-shrink-0">
        <PipelineStats contacts={contacts} />
      </div>

      {/* Filters — wrapped in Suspense because it calls useSearchParams */}
      <div className="flex-shrink-0">
        <Suspense fallback={<Skeleton className="h-9 w-full max-w-sm" />}>
          <PipelineFilters
            filters={filters}
            users={users}
            totalContacts={contacts.length}
          />
        </Suspense>
      </div>

      {/* Kanban board — takes remaining vertical space */}
      <div className="flex-1 overflow-hidden">
        <PipelineBoard contacts={contacts} />
      </div>
    </div>
  );
}
