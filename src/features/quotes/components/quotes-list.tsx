/**
 * src/features/quotes/components/quotes-list.tsx
 *
 * QuotesList — paginated table of quotes with inline status updates.
 *
 * Client component so it can:
 *   - Call server actions for status updates and deletion
 *   - Build pagination links from useSearchParams
 *   - Show pending state during mutations
 *
 * Props:
 *   quotes      — Pre-fetched quote list from the server.
 *   total       — Total count for pagination display.
 *   page / perPage / totalPages — Pagination state.
 *   filters     — Active filters (used to preserve them in pagination links).
 *   userRole    — Controls whether the delete action is shown.
 */

"use client";

import { useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { QUOTE_STATUS_COLORS } from "@/lib/constants";
import { updateQuoteStatus, deleteQuote } from "@/server/actions/quotes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QUOTE_STATUS_OPTIONS } from "@/lib/constants";
import type { QuoteWithRelations } from "@/server/queries/quotes";
import type { QuoteFiltersInput } from "@/lib/validations/quotes";
import type { UserRole } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuotesListProps {
  quotes: QuoteWithRelations[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  filters: QuoteFiltersInput;
  userRole: UserRole;
}

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  BEING_PREPARED: "Being prepared",
  SENT: "Sent",
  WAITING_ON_RESPONSE: "Waiting",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

// ---------------------------------------------------------------------------
// QuoteStatusSelect
// ---------------------------------------------------------------------------

function QuoteStatusSelect({ quoteId, status }: { quoteId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(newStatus: string) {
    startTransition(async () => {
      const result = await updateQuoteStatus(quoteId, { status: newStatus });
      if (!result.success) toast.error(result.error);
      else toast.success("Status updated.");
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className={cn(
          "h-7 w-40 text-xs font-medium rounded-full border-0 px-2.5",
          QUOTE_STATUS_COLORS[status as keyof typeof QUOTE_STATUS_COLORS] ??
            "bg-muted text-muted-foreground"
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {QUOTE_STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------------------------------------------------------------------------
// QuoteRowActions
// ---------------------------------------------------------------------------

function QuoteRowActions({
  quoteId,
  userRole,
}: {
  quoteId: string;
  userRole: UserRole;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this quote? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteQuote(quoteId);
      if (!result.success) toast.error(result.error);
      else toast.success("Quote deleted.");
    });
  }

  if (userRole !== "OWNER") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity"
          disabled={isPending}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={handleDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete quote
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// QuotesList
// ---------------------------------------------------------------------------

export function QuotesList({
  quotes,
  total,
  page,
  perPage,
  totalPages,
  filters,
  userRole,
}: QuotesListProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function buildPageUrl(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    return `${pathname}?${params.toString()}`;
  }

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {quotes.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          {Object.values(filters).some(Boolean)
            ? "No quotes match your current filters."
            : "No quotes yet. Add your first quote to get started."}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Quote</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Amount</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Sent</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Follow-up</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotes.map((quote) => {
                  const followUpOverdue =
                    quote.followUpAt != null &&
                    quote.followUpAt < new Date() &&
                    quote.status !== "ACCEPTED" &&
                    quote.status !== "DECLINED" &&
                    quote.status !== "EXPIRED";

                  return (
                    <tr key={quote.id} className="group/row hover:bg-accent/30 transition-colors">
                      {/* Title */}
                      <td className="px-4 py-3">
                        <p className="font-medium leading-snug">{quote.title}</p>
                        {quote.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                            {quote.description}
                          </p>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        {quote.contact ? (
                          <Link
                            href={`/contacts/${quote.contact.id}`}
                            className="text-sm text-foreground hover:text-primary transition-colors"
                          >
                            {quote.contact.displayName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <QuoteStatusSelect quoteId={quote.id} status={quote.status} />
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-semibold hidden sm:table-cell">
                        {quote.amount != null
                          ? formatCurrency(quote.amount.toString())
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>

                      {/* Sent date */}
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {quote.sentAt ? formatDate(quote.sentAt) : "—"}
                      </td>

                      {/* Follow-up date */}
                      <td
                        className={cn(
                          "px-4 py-3 hidden lg:table-cell",
                          followUpOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                        )}
                      >
                        {quote.followUpAt ? formatDate(quote.followUpAt) : "—"}
                      </td>

                      {/* Row actions */}
                      <td className="px-2 py-3 text-right">
                        <QuoteRowActions quoteId={quote.id} userRole={userRole} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {start}–{end} of {total} quote{total !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={page <= 1}
                className="h-8 gap-1"
              >
                <Link href={buildPageUrl(page - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={page >= totalPages}
                className="h-8 gap-1"
              >
                <Link href={buildPageUrl(page + 1)}>
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
