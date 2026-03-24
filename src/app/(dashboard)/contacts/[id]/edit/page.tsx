/**
 * src/app/(dashboard)/contacts/[id]/edit/page.tsx
 *
 * Edit Contact page — pre-fills the contact form with existing data.
 *
 * Fetches the contact and active user list server-side.
 * Returns 404 if the contact doesn't exist.
 *
 * URL: /contacts/:id/edit
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { getContact } from "@/server/queries/contacts";
import { getActiveUsers } from "@/server/queries/users";

interface EditContactPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: EditContactPageProps): Promise<Metadata> {
  const contact = await getContact(params.id);
  if (!contact) return { title: "Not Found" };
  return { title: `Edit ${contact.displayName}` };
}

export default async function EditContactPage({ params }: EditContactPageProps) {
  const [contact, users] = await Promise.all([
    getContact(params.id),
    getActiveUsers(),
  ]);

  if (!contact) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page header */}
      <div>
        <Link
          href={`/contacts/${contact.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {contact.displayName}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Contact</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update the details for {contact.displayName}.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <ContactForm contact={contact} users={users} />
      </div>
    </div>
  );
}
