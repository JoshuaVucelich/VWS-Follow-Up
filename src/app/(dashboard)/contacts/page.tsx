/**
 * src/app/(dashboard)/contacts/page.tsx
 *
 * Contacts list page — the primary record management screen.
 *
 * Reads filter/sort/pagination state from URL search params so the view is
 * bookmarkable and shareable. All filtering happens server-side via Prisma.
 *
 * URL: /contacts
 * Query params (all optional):
 *   search, stage, type, source, assignedUserId, archived, page, perPage, sort, order
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactsTable } from "@/features/contacts/components/contacts-table";
import { ContactsFilters } from "@/features/contacts/components/contacts-filters";
import { getContacts } from "@/server/queries/contacts";
import { getActiveUsers } from "@/server/queries/users";
import { contactFiltersSchema } from "@/lib/validations/contacts";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Contacts",
};

interface ContactsPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  // Normalise searchParams — coerce array values to their first element
  const rawParams = Object.fromEntries(
    Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  );

  // Parse and validate all filter params (invalid values fall back to defaults)
  const filters = contactFiltersSchema.parse(rawParams);

  // Fetch contacts and users in parallel
  const [{ data: contacts, total, page, perPage, totalPages }, users] = await Promise.all([
    getContacts(filters),
    getActiveUsers(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total === 0
              ? "No contacts yet."
              : `${total} contact${total === 1 ? "" : "s"}`}
          </p>
        </div>

        <Button asChild>
          <Link href="/contacts/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Link>
        </Button>
      </div>

      {/* Filters bar — wrapped in Suspense because ContactsFilters calls useSearchParams */}
      <Suspense fallback={<Skeleton className="h-9 w-full max-w-sm" />}>
        <ContactsFilters users={users} filters={filters} />
      </Suspense>

      {/* Contacts data table — wrapped in Suspense because ContactsTable calls useSearchParams */}
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <ContactsTable
          contacts={contacts}
          total={total}
          page={page}
          perPage={perPage}
          totalPages={totalPages}
          filters={filters}
        />
      </Suspense>
    </div>
  );
}
