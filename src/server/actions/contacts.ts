/**
 * src/server/actions/contacts.ts
 *
 * Server actions for contact mutations (create, update, archive, delete).
 *
 * All actions:
 *   1. Verify the user is authenticated
 *   2. Validate input with Zod
 *   3. Perform the database operation
 *   4. Log an activity entry for important changes
 *   5. Revalidate affected Next.js cache paths
 *   6. Return ActionResult<T>
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/session";
import { contactFormSchema, updateStageSchema, addNoteSchema } from "@/lib/validations/contacts";
import type { ActionResult } from "@/types";
import type { Contact } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Computes a display name from first/last/business name. */
function buildDisplayName(
  firstName: string,
  lastName: string,
  businessName?: string | null
): string {
  const fullName = `${firstName} ${lastName}`.trim();
  const trimmedBusinessName = businessName?.trim();

  if (fullName && trimmedBusinessName) return `${fullName} (${trimmedBusinessName})`;
  if (fullName) return fullName;
  if (trimmedBusinessName) return trimmedBusinessName;

  return "Unnamed Contact";
}

/** Logs an activity entry for a contact event. Swallows errors — activity logging
 *  should never break the main action. */
async function logActivity(
  contactId: string,
  userId: string | undefined,
  action: string,
  metadata?: Record<string, unknown>
) {
  try {
    await db.activity.create({
      data: {
        contactId,
        userId,
        entityType: "contact",
        entityId: contactId,
        action,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });
  } catch {
    // Silently ignore — activity logging should never break the primary action
  }
}

// ---------------------------------------------------------------------------
// createContact
// ---------------------------------------------------------------------------

export async function createContact(input: unknown): Promise<ActionResult<Contact>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = contactFormSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = validated.data;

  try {
    const contact = await db.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        businessName: data.businessName,
        displayName: buildDisplayName(data.firstName, data.lastName, data.businessName),
        email: data.email,
        phone: data.phone,
        altPhone: data.altPhone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        website: data.website,
        source: data.source,
        stage: data.stage,
        type: data.type,
        notes: data.notes,
        nextFollowUpAt: data.nextFollowUpAt,
        assignedUserId: data.assignedUserId,
        createdById: auth.user.id,
        // When created as CUSTOMER type, set customerSinceAt automatically
        customerSinceAt: data.type === "CUSTOMER" ? new Date() : undefined,
      },
    });

    await logActivity(contact.id, auth.user.id, "contact.created", {
      stage: data.stage,
      type: data.type,
    });

    revalidatePath("/contacts");
    revalidatePath("/dashboard");

    return { success: true, data: contact };
  } catch (error) {
    console.error("[createContact]", error);
    return { success: false, error: "Failed to create contact. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// updateContact
// ---------------------------------------------------------------------------

export async function updateContact(
  id: string,
  input: unknown
): Promise<ActionResult<Contact>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = contactFormSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = validated.data;

  try {
    // Get current contact to detect stage changes
    const current = await db.contact.findUnique({
      where: { id },
      select: { stage: true, type: true, customerSinceAt: true },
    });

    if (!current) return { success: false, error: "Contact not found." };

    const contact = await db.contact.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        businessName: data.businessName,
        displayName: buildDisplayName(data.firstName, data.lastName, data.businessName),
        email: data.email,
        phone: data.phone,
        altPhone: data.altPhone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        website: data.website,
        source: data.source,
        stage: data.stage,
        type: data.type,
        notes: data.notes,
        nextFollowUpAt: data.nextFollowUpAt,
        assignedUserId: data.assignedUserId,
        // Set customerSinceAt when type first changes to CUSTOMER
        customerSinceAt:
          data.type === "CUSTOMER" && !current.customerSinceAt ? new Date() : current.customerSinceAt,
      },
    });

    // Log stage change if it happened
    if (current.stage !== data.stage) {
      await logActivity(id, auth.user.id, "stage.changed", {
        from: current.stage,
        to: data.stage,
      });
    }

    revalidatePath(`/contacts/${id}`);
    revalidatePath("/contacts");
    revalidatePath("/pipeline");

    return { success: true, data: contact };
  } catch (error) {
    console.error("[updateContact]", error);
    return { success: false, error: "Failed to update contact. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// updateContactStage (quick stage update — from pipeline board drag/drop)
// ---------------------------------------------------------------------------

export async function updateContactStage(
  id: string,
  input: unknown
): Promise<ActionResult<{ stage: string }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = updateStageSchema.safeParse(input);
  if (!validated.success) return { success: false, error: "Invalid stage." };

  try {
    const current = await db.contact.findUnique({
      where: { id },
      select: { stage: true, type: true, customerSinceAt: true },
    });

    if (!current) return { success: false, error: "Contact not found." };

    const newStage = validated.data.stage;

    await db.contact.update({
      where: { id },
      data: {
        stage: newStage,
        // Auto-promote to CUSTOMER when booked/in-progress/completed
        type:
          ["BOOKED", "IN_PROGRESS", "COMPLETED"].includes(newStage) && current.type === "LEAD"
            ? "CUSTOMER"
            : current.type,
        customerSinceAt:
          ["BOOKED", "IN_PROGRESS", "COMPLETED"].includes(newStage) && !current.customerSinceAt
            ? new Date()
            : current.customerSinceAt,
      },
    });

    await logActivity(id, auth.user.id, "stage.changed", {
      from: current.stage,
      to: newStage,
    });

    revalidatePath(`/contacts/${id}`);
    revalidatePath("/contacts");
    revalidatePath("/pipeline");
    revalidatePath("/dashboard");

    return { success: true, data: { stage: newStage } };
  } catch (error) {
    console.error("[updateContactStage]", error);
    return { success: false, error: "Failed to update stage." };
  }
}

// ---------------------------------------------------------------------------
// archiveContact / restoreContact
// ---------------------------------------------------------------------------

export async function archiveContact(id: string): Promise<ActionResult<undefined>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  try {
    await db.contact.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });

    await logActivity(id, auth.user.id, "contact.archived");

    revalidatePath("/contacts");
    revalidatePath("/dashboard");

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to archive contact." };
  }
}

export async function restoreContact(id: string): Promise<ActionResult<undefined>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  try {
    await db.contact.update({
      where: { id },
      data: { status: "ACTIVE", archivedAt: null },
    });

    await logActivity(id, auth.user.id, "contact.restored");

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${id}`);

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to restore contact." };
  }
}

// ---------------------------------------------------------------------------
// deleteContact (hard delete — owner only)
// ---------------------------------------------------------------------------

export async function deleteContact(id: string): Promise<ActionResult<undefined>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only workspace owners can permanently delete contacts." };
  }

  try {
    await db.contact.delete({ where: { id } });

    revalidatePath("/contacts");
    revalidatePath("/dashboard");

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete contact." };
  }
}

// ---------------------------------------------------------------------------
// addNote
// ---------------------------------------------------------------------------

export async function addNote(
  contactId: string,
  input: unknown
): Promise<ActionResult<{ id: string; content: string; createdAt: Date }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = addNoteSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const note = await db.note.create({
      data: {
        contactId,
        authorId: auth.user.id,
        type: validated.data.type as import("@prisma/client").NoteType,
        content: validated.data.content,
      },
      select: { id: true, content: true, createdAt: true },
    });

    await logActivity(contactId, auth.user.id, "note.added", { type: validated.data.type });

    // Update lastContactedAt if this was a call log
    if (validated.data.type === "CALL_LOG") {
      await db.contact.update({
        where: { id: contactId },
        data: { lastContactedAt: new Date() },
      });
    }

    revalidatePath(`/contacts/${contactId}`);

    return { success: true, data: note };
  } catch {
    return { success: false, error: "Failed to add note." };
  }
}

// ---------------------------------------------------------------------------
// addTag / removeTag
// ---------------------------------------------------------------------------

export async function addTagToContact(
  contactId: string,
  tagName: string
): Promise<ActionResult<undefined>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const name = tagName.trim();
  if (!name) return { success: false, error: "Tag name is required." };

  try {
    // Upsert the tag (create if it doesn't exist)
    const tag = await db.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    });

    // Add the contact-tag link (ignore if already exists)
    await db.contactTag.upsert({
      where: { contactId_tagId: { contactId, tagId: tag.id } },
      create: { contactId, tagId: tag.id },
      update: {},
    });

    revalidatePath(`/contacts/${contactId}`);
    revalidatePath("/contacts");

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to add tag." };
  }
}

export async function removeTagFromContact(
  contactId: string,
  tagId: string
): Promise<ActionResult<undefined>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  try {
    await db.contactTag.delete({
      where: { contactId_tagId: { contactId, tagId } },
    });

    revalidatePath(`/contacts/${contactId}`);

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to remove tag." };
  }
}
