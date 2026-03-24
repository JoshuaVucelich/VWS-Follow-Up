/**
 * src/features/dashboard/components/quotes-pending-response.tsx
 *
 * Dashboard widget showing quotes that are waiting for customer response.
 *
 * Server component — fetches data via getQuotesPendingResponse().
 */

import Link from "next/link";
import { FileText, ArrowRight, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getQuotesPendingResponse } from "@/server/queries/quotes";

export async function QuotesPendingResponse() {
  const quotes = await getQuotesPendingResponse(5);

  const now = new Date();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Quotes Awaiting Response</h2>
          {quotes.length > 0 && (
            <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
              {quotes.length}
            </span>
          )}
        </div>
        <Link
          href="/quotes?status=WAITING_ON_RESPONSE"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {quotes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No quotes waiting on response.
          </div>
        ) : (
          quotes.map((quote) => {
            const followUpOverdue =
              quote.followUpAt != null && quote.followUpAt < now;

            return (
              <div key={quote.id} className="px-4 py-3 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{quote.title}</p>
                  {quote.amount != null && (
                    <span className="text-sm font-semibold text-foreground flex-shrink-0">
                      {formatCurrency(quote.amount.toString())}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {quote.contact ? (
                    <Link
                      href={`/contacts/${quote.contact.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {quote.contact.displayName}
                    </Link>
                  ) : (
                    <span>—</span>
                  )}
                  {quote.followUpAt && (
                    <span
                      className={
                        followUpOverdue
                          ? "text-destructive font-medium flex items-center gap-1"
                          : ""
                      }
                    >
                      {followUpOverdue && <AlertCircle className="h-3 w-3" />}
                      Follow up: {formatDate(quote.followUpAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
