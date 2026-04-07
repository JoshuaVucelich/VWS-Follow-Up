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
import { QUICKBOOKS_SYNC_MAX_ERRORS } from "@/lib/constants";
import { contactFormSchema, updateStageSchema, addNoteSchema } from "@/lib/validations/contacts";
import {
  type QuickBooksConnectionRecord,
  parseQuickBooksError,
  readResponsePayload,
  buildQuickBooksApiUrl,
  getFreshQuickBooksConnection,
} from "@/server/lib/quickbooks-api";
import { logActivity } from "@/server/lib/activity-logger";
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

async function createQuickBooksCustomer(input: {
  connection: QuickBooksConnectionRecord;
  environment: "sandbox" | "production";
  displayName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
}): Promise<{ success: true; customerId: string } | { success: false; error: string }> {
  const {
    connection,
    environment,
    displayName,
    firstName,
    lastName,
    email,
    phone,
    addressLine1,
    city,
    state,
    zip,
  } = input;

  const payload: Record<string, unknown> = {
    DisplayName: displayName,
  };

  if (firstName) payload.GivenName = firstName;
  if (lastName) payload.FamilyName = lastName;
  if (email) payload.PrimaryEmailAddr = { Address: email };
  if (phone) payload.PrimaryPhone = { FreeFormNumber: phone };

  const billAddress: Record<string, string> = {};
  if (addressLine1) billAddress.Line1 = addressLine1;
  if (city) billAddress.City = city;
  if (state) billAddress.CountrySubDivisionCode = state;
  if (zip) billAddress.PostalCode = zip;
  if (Object.keys(billAddress).length > 0) payload.BillAddr = billAddress;

  const response = await fetch(
    buildQuickBooksApiUrl({
      realmId: connection.realmId,
      environment,
      path: "/customer",
    }),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );

  const responseData = await readResponsePayload(response) as {
    Customer?: { Id?: string };
  };

  if (!response.ok || !responseData?.Customer?.Id) {
    const apiError = parseQuickBooksError(responseData) ?? "Failed to create customer in QuickBooks.";
    return { success: false, error: apiError };
  }

  return { success: true, customerId: responseData.Customer.Id };
}

async function syncContactRecordToQuickBooks(contact: {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  quickBooksCustomerId: string | null;
}): Promise<{ success: true; customerId: string | null } | { success: false; error: string }> {
  const quickBooksConnection = await getFreshQuickBooksConnection();
  if (!quickBooksConnection.success) {
    return { success: false, error: quickBooksConnection.error };
  }

  if (!quickBooksConnection.connection) {
    return { success: true, customerId: null };
  }

  const { connection, environment } = quickBooksConnection;

  const customerPayload: Record<string, unknown> = {
    DisplayName: contact.displayName,
  };
  if (contact.firstName) customerPayload.GivenName = contact.firstName;
  if (contact.lastName) customerPayload.FamilyName = contact.lastName;
  if (contact.email) customerPayload.PrimaryEmailAddr = { Address: contact.email };
  if (contact.phone) customerPayload.PrimaryPhone = { FreeFormNumber: contact.phone };

  const billAddress: Record<string, string> = {};
  if (contact.addressLine1) billAddress.Line1 = contact.addressLine1;
  if (contact.city) billAddress.City = contact.city;
  if (contact.state) billAddress.CountrySubDivisionCode = contact.state;
  if (contact.zip) billAddress.PostalCode = contact.zip;
  if (Object.keys(billAddress).length > 0) customerPayload.BillAddr = billAddress;

  if (contact.quickBooksCustomerId) {
    const existingCustomerResponse = await fetch(
      buildQuickBooksApiUrl({
        realmId: connection.realmId,
        environment,
        path: `/customer/${contact.quickBooksCustomerId}`,
      }),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const existingCustomerData = await readResponsePayload(existingCustomerResponse) as {
      Customer?: { SyncToken?: string };
    };

    const syncToken = existingCustomerData?.Customer?.SyncToken;
    if (existingCustomerResponse.ok && syncToken) {
      const updateResponse = await fetch(
        buildQuickBooksApiUrl({
          realmId: connection.realmId,
          environment,
          path: "/customer",
          queryParams: { operation: "update" },
        }),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            ...customerPayload,
            Id: contact.quickBooksCustomerId,
            SyncToken: syncToken,
            sparse: true,
          }),
          cache: "no-store",
        },
      );

      if (updateResponse.ok) {
        return { success: true, customerId: contact.quickBooksCustomerId };
      }
    }
  }

  const createdCustomer = await createQuickBooksCustomer({
    connection,
    environment,
    displayName: contact.displayName,
    firstName: contact.firstName || undefined,
    lastName: contact.lastName || undefined,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
    addressLine1: contact.addressLine1 ?? undefined,
    city: contact.city ?? undefined,
    state: contact.state ?? undefined,
    zip: contact.zip ?? undefined,
  });

  if (!createdCustomer.success) {
    return createdCustomer;
  }

  await db.contact.update({
    where: { id: contact.id },
    data: { quickBooksCustomerId: createdCustomer.customerId },
  });

  return { success: true, customerId: createdCustomer.customerId };
}

/** Helper to log a contact activity using the shared logger. */
function logContactActivity(
  contactId: string,
  userId: string | undefined,
  action: string,
  metadata?: Record<string, unknown>,
) {
  void logActivity({
    contactId,
    userId,
    entityType: "contact",
    entityId: contactId,
    action,
    metadata,
  });
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
  const displayName = buildDisplayName(data.firstName, data.lastName, data.businessName);

  try {
    let quickBooksCustomerId: string | undefined;

    // If QuickBooks is connected, create the customer there first so we can
    // store the linked QuickBooks customer ID directly on the new contact.
    const quickBooksConnection = await getFreshQuickBooksConnection();
    if (!quickBooksConnection.success) {
      return { success: false, error: quickBooksConnection.error };
    }

    if (quickBooksConnection.connection) {
      const quickBooksCustomer = await createQuickBooksCustomer({
        connection: quickBooksConnection.connection,
        environment: quickBooksConnection.environment,
        displayName,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        email: data.email,
        phone: data.phone,
        addressLine1: data.addressLine1,
        city: data.city,
        state: data.state,
        zip: data.zip,
      });

      if (!quickBooksCustomer.success) {
        return {
          success: false,
          error: `Contact was not saved because QuickBooks customer creation failed: ${quickBooksCustomer.error}`,
        };
      }

      quickBooksCustomerId = quickBooksCustomer.customerId;
    }

    const contact = await db.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        businessName: data.businessName,
        displayName,
        email: data.email,
        phone: data.phone,
        altPhone: data.altPhone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        website: data.website,
        linkedinUrl: data.linkedinUrl,
        facebookUrl: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        twitterUrl: data.twitterUrl,
        quickBooksCustomerId,
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

    logContactActivity(contact.id, auth.user.id, "contact.created", {
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
        linkedinUrl: data.linkedinUrl,
        facebookUrl: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        twitterUrl: data.twitterUrl,
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

    const quickBooksSync = await syncContactRecordToQuickBooks({
      id: contact.id,
      displayName: contact.displayName,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      addressLine1: contact.addressLine1,
      city: contact.city,
      state: contact.state,
      zip: contact.zip,
      quickBooksCustomerId: contact.quickBooksCustomerId,
    });

    if (!quickBooksSync.success) {
      logContactActivity(id, auth.user.id, "contact.quickbooks_sync_failed", {
        error: quickBooksSync.error,
      });
    }

    // Log stage change if it happened
    if (current.stage !== data.stage) {
      logContactActivity(id, auth.user.id, "stage.changed", {
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
// syncAllContactsToQuickBooks
// ---------------------------------------------------------------------------

export async function syncAllContactsToQuickBooks(): Promise<
  ActionResult<{ synced: number; failed: number; skipped: number; errors: string[] }>
> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only workspace owners can run a full QuickBooks contact sync." };
  }

  const contacts = await db.contact.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      addressLine1: true,
      city: true,
      state: true,
      zip: true,
      quickBooksCustomerId: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let synced = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const contact of contacts) {
    const result = await syncContactRecordToQuickBooks(contact);
    if (!result.success) {
      failed++;
      if (errors.length < QUICKBOOKS_SYNC_MAX_ERRORS) {
        errors.push(`${contact.displayName}: ${result.error}`);
      }
      continue;
    }

    if (result.customerId) synced++;
    else skipped++;
  }

  revalidatePath("/contacts");
  revalidatePath("/dashboard");

  return { success: true, data: { synced, failed, skipped, errors } };
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

    void logActivity({
      contactId: id,
      userId: auth.user.id,
      entityType: "contact",
      action: "stage.changed",
      metadata: {
        from: current.stage,
        to: newStage,
      },
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

    logContactActivity(id, auth.user.id, "contact.archived");

    revalidatePath("/contacts");
    revalidatePath("/dashboard");
    revalidatePath("/pipeline");

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

    logContactActivity(id, auth.user.id, "contact.restored");

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${id}`);
    revalidatePath("/dashboard");
    revalidatePath("/pipeline");

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

    logContactActivity(contactId, auth.user.id, "note.added", { type: validated.data.type });

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
