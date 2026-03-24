/**
 * src/features/quotes/components/create-quote-dialog.tsx
 *
 * CreateQuoteDialog — modal dialog for creating a new quote.
 *
 * Used on the quotes page header and the contact detail page.
 * Accepts an optional defaultContactId to pre-link the quote to a contact.
 *
 * Props:
 *   contacts        — Contact list for the picker (pass [] to hide).
 *   defaultContactId — Pre-selects and locks the contact field.
 *   trigger         — Custom trigger element (defaults to "Add Quote" button).
 */

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuoteForm } from "@/features/quotes/components/quote-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Contact {
  id: string;
  displayName: string;
}

interface CreateQuoteDialogProps {
  contacts?: Contact[];
  defaultContactId?: string;
  trigger?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// CreateQuoteDialog
// ---------------------------------------------------------------------------

export function CreateQuoteDialog({
  contacts = [],
  defaultContactId,
  trigger,
}: CreateQuoteDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Quote
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Quote</DialogTitle>
        </DialogHeader>
        <QuoteForm
          contacts={contacts}
          defaultContactId={defaultContactId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
