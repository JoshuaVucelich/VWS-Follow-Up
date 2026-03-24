/**
 * src/app/(dashboard)/quotes/page.tsx
 *
 * Quotes / estimates status page.
 *
 * Shows all quote records across all contacts. Useful for getting a
 * birds-eye view of outstanding estimates, accepted work, and follow-ups.
 *
 * Common filter: "Waiting on Response" — the most actionable view.
 *
 * URL: /quotes
 * Query params (all optional): status, search, page
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateQuoteDialog } from "@/features/quotes/components/create-quote-dialog";
import { QuotesList } from "@/features/quotes/components/quotes-list";
import { QuotesFilters } from "@/features/quotes/components/quotes-filters";
import { getQuotes } from "@/server/queries/quotes";
import { getContactsForPicker } from "@/server/queries/contacts";
import { getCurrentUser } from "@/lib/session";
import { quoteFiltersSchema } from "@/lib/validations/quotes";

export const metadata: Metadata = {
  title: "Quotes",
};

interface QuotesPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const rawParams = Object.fromEntries(
    Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  );

  const parsedFilters = quoteFiltersSchema.safeParse(rawParams);
  const filters = parsedFilters.success ? parsedFilters.data : quoteFiltersSchema.parse({});

  const [{ data: quotes, total, page, perPage, totalPages }, contacts, currentUser] =
    await Promise.all([
      getQuotes(filters),
      getContactsForPicker(),
      getCurrentUser(),
    ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track estimates and their current status.
          </p>
        </div>
        <CreateQuoteDialog contacts={contacts} />
      </div>

      {/* Filters */}
      <Suspense fallback={<Skeleton className="h-9 w-full max-w-xl" />}>
        <QuotesFilters filters={filters} total={total} />
      </Suspense>

      {/* Quotes list */}
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <QuotesList
          quotes={quotes}
          total={total}
          page={page}
          perPage={perPage}
          totalPages={totalPages}
          filters={filters}
          userRole={currentUser.role}
        />
      </Suspense>
    </div>
  );
}
