/**
 * src/app/(dashboard)/contacts/[id]/page.tsx
 *
 * Contact detail page — the most important day-to-day page in the app.
 *
 * Shows everything about a single contact in one view:
 *   - Header: name, stage badge, type, quick action buttons
 *   - Left sidebar: contact info, lead details, tags, internal notes
 *   - Main area: tasks, notes/call logs, quotes, appointments, activity timeline
 *
 * Fetches all data server-side so there's no client-side loading state on
 * initial render. The notes add form and tag controls are client components.
 *
 * URL: /contacts/:id
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactHeader } from "@/features/contacts/components/contact-header";
import { ContactOverview } from "@/features/contacts/components/contact-overview";
import { ContactNotes } from "@/features/contacts/components/contact-notes";
import { ContactTasks } from "@/features/contacts/components/contact-tasks";
import { ContactQuotes } from "@/features/contacts/components/contact-quotes";
import { ContactAppointments } from "@/features/contacts/components/contact-appointments";
import { ContactActivity } from "@/features/contacts/components/contact-activity";
import { getContact, getAllTags } from "@/server/queries/contacts";
import { getActiveUsers } from "@/server/queries/users";
import { getCurrentUser } from "@/lib/session";

interface ContactPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const contact = await getContact(params.id);
  if (!contact) return { title: "Not Found" };
  return { title: contact.displayName };
}

export default async function ContactPage({ params }: ContactPageProps) {
  // Fetch contact data, current user, and active users in parallel
  const [contact, allTags, currentUser, users] = await Promise.all([
    getContact(params.id),
    getAllTags(),
    getCurrentUser(),
    getActiveUsers(),
  ]);

  if (!contact) notFound();

  return (
    <div className="space-y-6">
      {/* Contact header: name, stage badge, quick action buttons */}
      <ContactHeader contact={contact} userRole={currentUser.role} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left sidebar: contact info, details, tags */}
        <div className="space-y-4 xl:col-span-1">
          <ContactOverview
            contact={contact}
            allTags={allTags.map((t) => ({ id: t.id, name: t.name }))}
          />
        </div>

        {/* Main area: tasks, notes, quotes, appointments, activity */}
        <div className="space-y-4 xl:col-span-2">
          <ContactTasks tasks={contact.tasks} contactId={contact.id} users={users} />
          <ContactNotes
            contactId={contact.id}
            notes={contact.contactNotes}
          />
          <ContactQuotes quotes={contact.quotes} contactId={contact.id} />
          <ContactAppointments appointments={contact.appointments} contactId={contact.id} users={users} />
          <ContactActivity activities={contact.activities} />
        </div>
      </div>
    </div>
  );
}
