/**
 * src/features/contacts/components/contact-quotes.tsx
 *
 * ContactQuotes — displays quote history for a contact with an "Add Quote" button.
 *
 * Shows all quotes with their status badge, amount, and created date.
 * The "+" button opens a CreateQuoteDialog pre-linked to this contact.
 *
 * Props:
 *   quotes    — Pre-fetched quotes with createdBy relation.
 *   contactId — The contact's ID, passed as defaultContactId to the dialog.
 */

import { FileText, Plus } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { QUOTE_STATUS_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateQuoteDialog } from "@/features/quotes/components/create-quote-dialog";
import type { QuoteStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuoteItem {
  id: string;
  title: string;
  status: QuoteStatus;
  // Prisma Decimal is serialized as a string across server/client boundary
  amount: { toString(): string } | null;
  createdAt: Date;
  createdBy: { id: string; name: string | null } | null;
}

interface ContactQuotesProps {
  quotes: QuoteItem[];
  contactId: string;
}

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  BEING_PREPARED: "Being prepared",
  SENT: "Sent",
  WAITING_ON_RESPONSE: "Waiting",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

// ---------------------------------------------------------------------------
// ContactQuotes
// ---------------------------------------------------------------------------

export function ContactQuotes({ quotes, contactId }: ContactQuotesProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Quotes
            {quotes.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                {quotes.length}
              </span>
            )}
          </CardTitle>
          <CreateQuoteDialog
            defaultContactId={contactId}
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Add quote">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No quotes yet. Use the + button to add one.
          </p>
        ) : (
          <div className="space-y-2">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="flex items-start justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{quote.title}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        QUOTE_STATUS_COLORS[quote.status]
                      }`}
                    >
                      {STATUS_LABELS[quote.status]}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(quote.createdAt)}
                    {quote.createdBy && ` · ${quote.createdBy.name}`}
                  </div>
                </div>

                {quote.amount != null && (
                  <div className="text-sm font-semibold text-foreground flex-shrink-0">
                    {formatCurrency(quote.amount.toString())}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
