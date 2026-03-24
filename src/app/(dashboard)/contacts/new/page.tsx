/**
 * src/app/(dashboard)/contacts/new/page.tsx
 *
 * New Contact page — renders the contact creation form.
 *
 * Fetches the active user list server-side so the "Assign to" dropdown
 * is populated without any client-side fetching.
 *
 * URL: /contacts/new
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { getActiveUsers } from "@/server/queries/users";

export const metadata: Metadata = {
  title: "New Contact",
};

export default async function NewContactPage() {
  const users = await getActiveUsers();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page header */}
      <div>
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Contacts
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New Contact</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new lead or customer to your pipeline.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <ContactForm users={users} />
      </div>
    </div>
  );
}
