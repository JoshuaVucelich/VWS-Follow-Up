/**
 * src/features/contacts/components/contact-overview.tsx
 *
 * ContactOverview — the left-sidebar info panel on the contact detail page.
 *
 * Displays all the contact's stored fields in a read-only format:
 *   - Phone numbers (with tel: links)
 *   - Email (with mailto: link)
 *   - Website (external link)
 *   - Full address
 *   - Source
 *   - Next follow-up date
 *   - Last contacted date
 *   - Customer since date
 *   - Assigned user
 *   - Created by / created at
 *   - Tags (with add/remove controls)
 *
 * This is a server component that receives the fully-loaded contact object.
 * The tags section includes a client sub-component for adding/removing tags.
 *
 * Props:
 *   contact — Full contact object from getContact().
 *   allTags — All workspace tags (for the tag autocomplete).
 */

import Link from "next/link";
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  User,
  Tag,
  Clock,
  BadgeCheck,
} from "lucide-react";
import { formatDate, formatPhone } from "@/lib/utils";
import { CONTACT_SOURCE_OPTIONS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactTagsPanel } from "@/features/contacts/components/contact-tags-panel";
import type { ContactSource } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The subset of the contact object that ContactOverview needs.
 * Uses a structural type to avoid coupling to ContactWithRelations.
 */
interface OverviewContact {
  id: string;
  phone: string | null;
  altPhone: string | null;
  email: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: ContactSource;
  notes: string | null;
  nextFollowUpAt: Date | null;
  lastContactedAt: Date | null;
  customerSinceAt: Date | null;
  createdAt: Date;
  assignedUser: { id: string; name: string | null; email?: string | null } | null;
  createdBy: { id: string; name: string | null } | null;
  tags: { tag: { id: string; name: string } }[];
}

interface ContactOverviewProps {
  contact: OverviewContact;
  allTags: { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// OverviewRow — small helper for label/value pairs
// ---------------------------------------------------------------------------

function OverviewRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2 border-b border-border last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground mt-0.5 break-words">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContactOverview
// ---------------------------------------------------------------------------

export function ContactOverview({ contact, allTags }: ContactOverviewProps) {
  const sourceLabel =
    CONTACT_SOURCE_OPTIONS.find((o) => o.value === contact.source)?.label ?? contact.source;

  const hasAddress =
    contact.addressLine1 || contact.city || contact.state || contact.zip;

  const addressParts = [
    contact.addressLine1,
    contact.addressLine2,
    [contact.city, contact.state].filter(Boolean).join(", "),
    contact.zip,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Contact info card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Contact Info</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {contact.phone && (
            <OverviewRow icon={Phone} label="Phone">
              <a href={`tel:${contact.phone}`} className="hover:underline text-primary">
                {formatPhone(contact.phone)}
              </a>
            </OverviewRow>
          )}

          {contact.altPhone && (
            <OverviewRow icon={Phone} label="Alt. phone">
              <a href={`tel:${contact.altPhone}`} className="hover:underline text-primary">
                {formatPhone(contact.altPhone)}
              </a>
            </OverviewRow>
          )}

          {contact.email && (
            <OverviewRow icon={Mail} label="Email">
              <a href={`mailto:${contact.email}`} className="hover:underline text-primary">
                {contact.email}
              </a>
            </OverviewRow>
          )}

          {contact.website && (
            <OverviewRow icon={Globe} label="Website">
              <a
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-primary"
              >
                {contact.website.replace(/^https?:\/\//, "")}
              </a>
            </OverviewRow>
          )}

          {hasAddress && (
            <OverviewRow icon={MapPin} label="Address">
              <address className="not-italic">
                {addressParts.map((part, i) => (
                  <span key={i}>
                    {part}
                    {i < addressParts.length - 1 && <br />}
                  </span>
                ))}
              </address>
            </OverviewRow>
          )}

          {!contact.phone && !contact.email && !contact.website && !hasAddress && (
            <p className="text-xs text-muted-foreground py-2">No contact details on file.</p>
          )}
        </CardContent>
      </Card>

      {/* Lead details card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lead Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <OverviewRow icon={BadgeCheck} label="Source">
            {sourceLabel}
          </OverviewRow>

          {contact.assignedUser && (
            <OverviewRow icon={User} label="Assigned to">
              {contact.assignedUser.name ?? contact.assignedUser.email}
            </OverviewRow>
          )}

          {contact.nextFollowUpAt && (
            <OverviewRow icon={Calendar} label="Next follow-up">
              <span
                className={contact.nextFollowUpAt < new Date() ? "text-destructive font-medium" : ""}
              >
                {formatDate(contact.nextFollowUpAt)}
                {contact.nextFollowUpAt < new Date() && (
                  <span className="ml-1 text-xs">(overdue)</span>
                )}
              </span>
            </OverviewRow>
          )}

          {contact.lastContactedAt && (
            <OverviewRow icon={Clock} label="Last contacted">
              {formatDate(contact.lastContactedAt)}
            </OverviewRow>
          )}

          {contact.customerSinceAt && (
            <OverviewRow icon={BadgeCheck} label="Customer since">
              {formatDate(contact.customerSinceAt)}
            </OverviewRow>
          )}

          <OverviewRow icon={Clock} label="Added">
            {formatDate(contact.createdAt)}
            {contact.createdBy && (
              <span className="text-muted-foreground"> by {contact.createdBy.name}</span>
            )}
          </OverviewRow>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ContactTagsPanel
            contactId={contact.id}
            currentTags={contact.tags.map((ct) => ct.tag)}
            allTags={allTags}
          />
        </CardContent>
      </Card>

      {/* Internal notes */}
      {contact.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Internal Note</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Set on the contact record.{" "}
              <Link href={`/contacts/${contact.id}/edit`} className="underline hover:text-foreground">
                Edit
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
