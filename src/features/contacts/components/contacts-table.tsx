/**
 * src/features/contacts/components/contacts-table.tsx
 *
 * ContactsTable — server-rendered contacts data table.
 *
 * Displays the paginated list of contacts fetched by ContactsPage.
 * Columns: avatar/name, phone, stage badge, source, assigned user,
 * next follow-up date, and a row actions menu.
 *
 * Sorting is done via sortable column header links that update URL params.
 * Pagination is handled via Previous / Next links.
 *
 * The table is a server component — no client interactivity here.
 * Row-level actions (archive, delete) are handled in the ContactRowActions
 * client component below.
 *
 * Props:
 *   contacts   — Paginated array of contacts with relations.
 *   total      — Total number of matching contacts (for pagination summary).
 *   page       — Current page number.
 *   perPage    — Items per page.
 *   totalPages — Total number of pages.
 *   filters    — Current active filter values (for building sort/page URLs).
 */

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { getInitials, formatDate, formatPhone } from "@/lib/utils";
import { ContactStageBadge } from "@/features/contacts/components/contact-stage-badge";
import { CONTACT_SOURCE_OPTIONS } from "@/lib/constants";
import { archiveContact, restoreContact, deleteContact } from "@/server/actions/contacts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { ContactWithRelations } from "@/types";
import type { ContactFiltersInput } from "@/lib/validations/contacts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContactsTableProps {
  contacts: ContactWithRelations[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  filters: ContactFiltersInput;
}

// ---------------------------------------------------------------------------
// ContactRowActions (client — needs useTransition for pending state)
// ---------------------------------------------------------------------------

function ContactRowActions({ contact }: { contact: ContactWithRelations }) {
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(async () => {
      const result = contact.status === "ARCHIVED"
        ? await restoreContact(contact.id)
        : await archiveContact(contact.id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(contact.status === "ARCHIVED" ? "Contact restored." : "Contact archived.");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Actions for ${contact.displayName}`}
          disabled={isPending}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/contacts/${contact.id}`}>View</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/contacts/${contact.id}/edit`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleArchive}
          className={contact.status === "ARCHIVED" ? "" : "text-muted-foreground"}
        >
          {contact.status === "ARCHIVED" ? "Restore" : "Archive"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// SortableHeader
// ---------------------------------------------------------------------------

function SortableHeader({
  label,
  column,
  filters,
  pathname,
  searchParams,
}: {
  label: string;
  column: string;
  filters: ContactFiltersInput;
  pathname: string;
  searchParams: URLSearchParams;
}) {
  const isActive = filters.sort === column;
  const nextOrder = isActive && filters.order === "asc" ? "desc" : "asc";

  const params = new URLSearchParams(searchParams.toString());
  params.set("sort", column);
  params.set("order", nextOrder);
  params.delete("page");

  return (
    <Link
      href={`${pathname}?${params.toString()}`}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {isActive ? (
        filters.order === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ChevronDown className="h-3 w-3 opacity-30" />
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// ContactsTable
// ---------------------------------------------------------------------------

export function ContactsTable({
  contacts,
  total,
  page,
  perPage,
  totalPages,
  filters,
}: ContactsTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build pagination URLs
  function pageUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  }

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const sourceLabel = (value: string) =>
    CONTACT_SOURCE_OPTIONS.find((o) => o.value === value)?.label ?? value;

  if (contacts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No contacts found</p>
          <p className="text-xs text-muted-foreground">
            {filters.search || filters.stage || filters.type || filters.source
              ? "Try adjusting your filters."
              : "Add your first contact to get started."}
          </p>
          {!filters.search && !filters.stage && !filters.type && !filters.source && (
            <Button asChild size="sm" className="mt-2">
              <Link href="/contacts/new">Add Contact</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <SortableHeader
                  label="Name"
                  column="name"
                  filters={filters}
                  pathname={pathname}
                  searchParams={new URLSearchParams(searchParams.toString())}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                Phone
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <SortableHeader
                  label="Stage"
                  column="stage"
                  filters={filters}
                  pathname={pathname}
                  searchParams={new URLSearchParams(searchParams.toString())}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                Source
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                Assigned
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                <SortableHeader
                  label="Follow Up"
                  column="nextFollowUpAt"
                  filters={filters}
                  pathname={pathname}
                  searchParams={new URLSearchParams(searchParams.toString())}
                />
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-accent/30 transition-colors group">
                {/* Name */}
                <td className="px-4 py-3">
                  <Link href={`/contacts/${contact.id}`} className="hover:underline block">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(contact.displayName)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground leading-tight">
                          {contact.displayName}
                        </p>
                        {contact.businessName && (
                          <p className="text-xs text-muted-foreground leading-tight">
                            {contact.businessName}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </td>

                {/* Phone */}
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="hover:text-foreground transition-colors">
                      {formatPhone(contact.phone)}
                    </a>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>

                {/* Stage */}
                <td className="px-4 py-3">
                  <ContactStageBadge stage={contact.stage} />
                </td>

                {/* Source */}
                <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                  {sourceLabel(contact.source)}
                </td>

                {/* Assigned user */}
                <td className="px-4 py-3 hidden lg:table-cell">
                  {contact.assignedUser ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-secondary-foreground flex-shrink-0">
                        {getInitials(contact.assignedUser.name ?? "")}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {contact.assignedUser.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">Unassigned</span>
                  )}
                </td>

                {/* Next follow-up */}
                <td className="px-4 py-3 text-xs hidden lg:table-cell">
                  {contact.nextFollowUpAt ? (
                    <span
                      className={
                        contact.nextFollowUpAt < new Date()
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {formatDate(contact.nextFollowUpAt)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>

                {/* Row actions */}
                <td className="px-4 py-3">
                  <ContactRowActions contact={contact} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>
          {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild={page > 1}
            disabled={page <= 1}
            className="text-xs"
          >
            {page > 1 ? <Link href={pageUrl(page - 1)}>Previous</Link> : <span>Previous</span>}
          </Button>
          <span className="px-1">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            asChild={page < totalPages}
            disabled={page >= totalPages}
            className="text-xs"
          >
            {page < totalPages ? <Link href={pageUrl(page + 1)}>Next</Link> : <span>Next</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
