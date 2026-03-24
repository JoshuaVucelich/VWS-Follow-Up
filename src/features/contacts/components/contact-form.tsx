/**
 * src/features/contacts/components/contact-form.tsx
 *
 * ContactForm — shared form for creating and editing contacts.
 *
 * This is a client component because it uses React Hook Form for local
 * field state and validation feedback. It calls the createContact or
 * updateContact server action on submit.
 *
 * Props:
 *   contact     — When provided, the form pre-fills in edit mode.
 *   users       — Active users for the "Assign to" dropdown.
 *   redirectTo  — Path to navigate to after a successful save.
 *                 Defaults to "/contacts".
 *
 * Sections:
 *   1. Name & Business
 *   2. Contact Info (phone, email, website)
 *   3. Address
 *   4. Lead Details (stage, type, source, assigned user, follow-up date)
 *   5. Notes (internal note field)
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contactFormSchema, type ContactFormInput, type ContactFormValues } from "@/lib/validations/contacts";
import { createContact, updateContact } from "@/server/actions/contacts";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS, CONTACT_SOURCE_OPTIONS } from "@/lib/constants";
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
import type { ContactStage, ContactSource, ContactType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContactFormContact {
  id: string;
  firstName: string;
  lastName: string;
  businessName?: string | null;
  email?: string | null;
  phone?: string | null;
  altPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  website?: string | null;
  source: ContactSource;
  stage: ContactStage;
  type: ContactType;
  assignedUserId?: string | null;
  notes?: string | null;
  nextFollowUpAt?: Date | null;
}

interface ContactFormUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface ContactFormProps {
  contact?: ContactFormContact;
  users: ContactFormUser[];
  redirectTo?: string;
}

// ---------------------------------------------------------------------------
// ContactForm
// ---------------------------------------------------------------------------

export function ContactForm({ contact, users, redirectTo = "/contacts" }: ContactFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditing = !!contact;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: contact?.firstName ?? "",
      lastName: contact?.lastName ?? "",
      businessName: contact?.businessName ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      altPhone: contact?.altPhone ?? "",
      addressLine1: contact?.addressLine1 ?? "",
      addressLine2: contact?.addressLine2 ?? "",
      city: contact?.city ?? "",
      state: contact?.state ?? "",
      zip: contact?.zip ?? "",
      website: contact?.website ?? "",
      source: contact?.source ?? "OTHER",
      stage: contact?.stage ?? "NEW_LEAD",
      type: contact?.type ?? "LEAD",
      assignedUserId: contact?.assignedUserId ?? "",
      notes: contact?.notes ?? "",
      // Format the date back to the HTML date input format (YYYY-MM-DD)
      nextFollowUpAt: contact?.nextFollowUpAt
        ? contact.nextFollowUpAt.toISOString().split("T")[0]
        : "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  function onSubmit(data: ContactFormValues) {
    const transformed = data as unknown as ContactFormInput;
    startTransition(async () => {
      const result = isEditing
        ? await updateContact(contact!.id, transformed)
        : await createContact(transformed);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Contact updated." : "Contact created.");
      router.push(isEditing ? `/contacts/${contact!.id}` : redirectTo);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Name & Business                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Name &amp; Business
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">
              First name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              placeholder="Maria"
              autoComplete="given-name"
              {...register("firstName")}
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName">
              Last name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              placeholder="Gonzalez"
              autoComplete="family-name"
              {...register("lastName")}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              placeholder="Gonzalez Properties (optional)"
              autoComplete="organization"
              {...register("businessName")}
            />
            {errors.businessName && (
              <p className="text-xs text-destructive">{errors.businessName.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Contact Info                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Contact Info
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="555-0100"
              autoComplete="tel"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="altPhone">Alt. phone</Label>
            <Input
              id="altPhone"
              type="tel"
              placeholder="555-0101 (optional)"
              {...register("altPhone")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="maria@example.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              {...register("website")}
            />
            {errors.website && (
              <p className="text-xs text-destructive">{errors.website.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Address                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Address
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addressLine1">Street address</Label>
            <Input
              id="addressLine1"
              placeholder="123 Main St"
              autoComplete="address-line1"
              {...register("addressLine1")}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addressLine2">Suite / unit</Label>
            <Input
              id="addressLine2"
              placeholder="Apt 4B (optional)"
              autoComplete="address-line2"
              {...register("addressLine2")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="Springfield"
              autoComplete="address-level2"
              {...register("city")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              placeholder="IL"
              autoComplete="address-level1"
              {...register("state")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zip">ZIP code</Label>
            <Input
              id="zip"
              placeholder="62701"
              autoComplete="postal-code"
              {...register("zip")}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4: Lead Details                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Lead Details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Stage */}
          <div className="space-y-1.5">
            <Label htmlFor="stage">Stage</Label>
            <Select
              value={watch("stage")}
              onValueChange={(v) => setValue("stage", v as ContactStage, { shouldValidate: true })}
            >
              <SelectTrigger id="stage">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PIPELINE_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Select
              value={watch("type")}
              onValueChange={(v) => setValue("type", v as ContactType, { shouldValidate: true })}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LEAD">Lead</SelectItem>
                <SelectItem value="CUSTOMER">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label htmlFor="source">Source</Label>
            <Select
              value={watch("source")}
              onValueChange={(v) => setValue("source", v as ContactSource, { shouldValidate: true })}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="How did they find you?" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned user */}
          <div className="space-y-1.5">
            <Label htmlFor="assignedUserId">Assign to</Label>
            <Select
              value={watch("assignedUserId") ?? ""}
              onValueChange={(v) => setValue("assignedUserId", v || undefined, { shouldValidate: true })}
            >
              <SelectTrigger id="assignedUserId">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? u.email ?? u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Next follow-up date */}
          <div className="space-y-1.5">
            <Label htmlFor="nextFollowUpAt">Next follow-up date</Label>
            <Input
              id="nextFollowUpAt"
              type="date"
              {...register("nextFollowUpAt")}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 5: Internal Notes                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Notes
        </h2>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Internal note</Label>
          <Textarea
            id="notes"
            placeholder="Any context about this contact that the team should know…"
            rows={4}
            {...register("notes")}
          />
          {errors.notes && (
            <p className="text-xs text-destructive">{errors.notes.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Visible to your team only. Not shared with the contact.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Form Actions                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEditing ? "Saving…" : "Creating…"
            : isEditing ? "Save changes" : "Create contact"}
        </Button>
      </div>
    </form>
  );
}
