/**
 * src/features/quotes/components/quote-form.tsx
 *
 * QuoteForm — shared form for creating and editing quotes.
 *
 * Used inside CreateQuoteDialog (new quote) and a future edit dialog.
 * Calls createQuote or updateQuote server actions on submit.
 *
 * Props:
 *   quote           — When provided, the form pre-fills in edit mode.
 *   contacts        — Contact list for the contact picker dropdown.
 *   defaultContactId — Pre-select and lock the contact field.
 *   onSuccess       — Called after a successful save (used to close the dialog).
 */

"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { quoteFormSchema, type QuoteFormInput, type QuoteFormValues } from "@/lib/validations/quotes";
import { createQuote, updateQuote } from "@/server/actions/quotes";
import { QUOTE_STATUS_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuoteStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuoteFormQuote {
  id: string;
  title: string;
  description: string | null;
  amount: { toString(): string } | null;
  status: QuoteStatus;
  sentAt: Date | null;
  followUpAt: Date | null;
  contactId: string;
}

interface QuoteFormContact {
  id: string;
  displayName: string;
}

interface QuoteFormProps {
  quote?: QuoteFormQuote;
  contacts?: QuoteFormContact[];
  defaultContactId?: string;
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// QuoteForm
// ---------------------------------------------------------------------------

export function QuoteForm({
  quote,
  contacts = [],
  defaultContactId,
  onSuccess,
}: QuoteFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!quote;

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      title: quote?.title ?? "",
      description: quote?.description ?? "",
      amount: quote?.amount ? quote.amount.toString() : "",
      status: quote?.status ?? "DRAFT",
      sentAt: quote?.sentAt ? quote.sentAt.toISOString().split("T")[0] : "",
      followUpAt: quote?.followUpAt ? quote.followUpAt.toISOString().split("T")[0] : "",
      contactId: quote?.contactId ?? defaultContactId ?? "",
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  function onSubmit(data: QuoteFormValues) {
    const transformed = data as unknown as QuoteFormInput;
    startTransition(async () => {
      const result = isEditing
        ? await updateQuote(quote!.id, transformed)
        : await createQuote(transformed);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Quote updated." : "Quote created.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="quote-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="quote-title"
          placeholder="Spring lawn care package"
          autoFocus
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Amount + Status row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="quote-amount">Amount ($)</Label>
          <Input
            id="quote-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("amount")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quote-status">Status</Label>
          <Select
            value={watch("status")}
            onValueChange={(v) => setValue("status", v as QuoteStatus, { shouldValidate: true })}
          >
            <SelectTrigger id="quote-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUOTE_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sent date + Follow-up date row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="quote-sent">Sent date</Label>
          <Input id="quote-sent" type="date" {...register("sentAt")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quote-followup">Follow-up date</Label>
          <Input id="quote-followup" type="date" {...register("followUpAt")} />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="quote-description">Description / scope (optional)</Label>
        <Textarea
          id="quote-description"
          placeholder="What's included in this quote…"
          rows={3}
          {...register("description")}
        />
      </div>

      {/* Contact — only show when no default is locked in */}
      {!defaultContactId && contacts.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="quote-contact">
            Contact <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("contactId") ?? ""}
            onValueChange={(v) => setValue("contactId", v, { shouldValidate: true })}
          >
            <SelectTrigger id="quote-contact">
              <SelectValue placeholder="Select a contact" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.contactId && (
            <p className="text-xs text-destructive">{errors.contactId.message}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEditing ? "Saving…" : "Creating…"
            : isEditing ? "Save changes" : "Create quote"}
        </Button>
      </div>
    </form>
  );
}
