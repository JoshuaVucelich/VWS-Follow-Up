/**
 * src/features/contacts/components/contact-header.tsx
 *
 * ContactHeader — the top section of the contact detail page.
 *
 * Displays:
 *   - Large initials avatar
 *   - Contact display name and optional business name
 *   - Stage badge and type label (Lead / Customer)
 *   - Archived badge when applicable
 *   - Quick action buttons: Edit, Archive/Restore, Delete (owner only)
 *
 * This is a client component because the archive/restore/delete buttons
 * call server actions and use useTransition for pending state.
 *
 * Props:
 *   contact  — Subset of the contact needed for this header.
 *   userRole — Current user's role (to conditionally show the Delete button).
 */

"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { archiveContact, restoreContact, deleteContact } from "@/server/actions/contacts";
import { ContactStageBadge } from "@/features/contacts/components/contact-stage-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UserRole, ContactStage, ContactType, ContactStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactHeaderContact {
  id: string;
  displayName: string;
  businessName?: string | null;
  stage: ContactStage;
  type: ContactType;
  status: ContactStatus;
}

interface ContactHeaderProps {
  contact: ContactHeaderContact;
  userRole: UserRole;
}

// ---------------------------------------------------------------------------
// ContactHeader
// ---------------------------------------------------------------------------

export function ContactHeader({ contact, userRole }: ContactHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isArchived = contact.status === "ARCHIVED";

  function handleArchiveToggle() {
    startTransition(async () => {
      const result = isArchived
        ? await restoreContact(contact.id)
        : await archiveContact(contact.id);

      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(isArchived ? "Contact restored." : "Contact archived.");
        if (!isArchived) {
          router.push("/contacts");
        }
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteContact(contact.id);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Contact deleted.");
        router.push("/contacts");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Identity */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold select-none">
            {getInitials(contact.displayName)}
          </div>

          {/* Name + meta tags */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{contact.displayName}</h1>
              <ContactStageBadge stage={contact.stage} />
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-border text-muted-foreground">
                {contact.type === "CUSTOMER" ? "Customer" : "Lead"}
              </span>
              {isArchived && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border-border">
                  Archived
                </span>
              )}
            </div>
            {contact.businessName && (
              <p className="text-sm text-muted-foreground mt-0.5">{contact.businessName}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/contacts/${contact.id}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleArchiveToggle}
            disabled={isPending}
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
                Restore
              </>
            ) : (
              <>
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Archive
              </>
            )}
          </Button>

          {/* Delete — owner only */}
          {userRole === "OWNER" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete contact?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete <strong>{contact.displayName}</strong> and
                    all associated notes, tasks, quotes, appointments, and activity history.
                    This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    {isPending ? "Deleting…" : "Yes, delete permanently"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}
