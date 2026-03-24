/**
 * src/server/actions/quotes.ts
 *
 * Server actions for quote mutations (create, update status, delete).
 *
 * All actions:
 *   1. Verify the user is authenticated
 *   2. Validate input with Zod
 *   3. Perform the database operation
 *   4. Log an activity entry on the linked contact
 *   5. Revalidate affected Next.js cache paths
 *   6. Return ActionResult<T>
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/session";
import { quoteFormSchema, updateQuoteStatusSchema } from "@/lib/validations/quotes";
import type { ActionResult } from "@/types";
import type { Quote } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logQuoteActivity(
  contactId: string | null | undefined,
  userId: string | undefined,
  action: string,
  metadata?: Record<string, unknown>
) {
  if (!contactId) return;
  try {
    await db.activity.create({
      data: {
        contactId,
        userId,
        entityType: "quote",
        action,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });
  } catch {
    // Fire-and-forget — activity logging never blocks the primary action
  }
}

function revalidateQuotePaths(contactId?: string) {
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

// ---------------------------------------------------------------------------
// createQuote
// ---------------------------------------------------------------------------

export async function createQuote(input: unknown): Promise<ActionResult<Quote>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = quoteFormSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { contactId, sentAt, ...rest } = validated.data;

  const quote = await db.quote.create({
    data: {
      ...rest,
      contactId,
      sentAt: sentAt ?? null,
      createdById: auth.user.id,
    },
  });

  void logQuoteActivity(contactId, auth.user.id, "quote.created", {
    quoteId: quote.id,
    title: quote.title,
    status: quote.status,
  });

  revalidateQuotePaths(contactId);

  return { success: true, data: quote };
}

// ---------------------------------------------------------------------------
// updateQuote
// ---------------------------------------------------------------------------

export async function updateQuote(
  id: string,
  input: unknown
): Promise<ActionResult<Quote>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = quoteFormSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      error: "Invalid input",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { contactId, ...rest } = validated.data;

  const quote = await db.quote.update({
    where: { id },
    data: { ...rest },
  });

  revalidateQuotePaths(quote.contactId);

  return { success: true, data: quote };
}

// ---------------------------------------------------------------------------
// updateQuoteStatus
// ---------------------------------------------------------------------------

export async function updateQuoteStatus(
  id: string,
  input: unknown
): Promise<ActionResult<Quote>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  const validated = updateQuoteStatusSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: "Invalid status" };
  }

  const { status } = validated.data;

  // Set timestamps based on status transition
  const now = new Date();
  const statusTimestamps: Record<string, object> = {
    SENT: { sentAt: now },
    ACCEPTED: { acceptedAt: now },
    DECLINED: { declinedAt: now },
  };

  const quote = await db.quote.update({
    where: { id },
    data: {
      status,
      ...((statusTimestamps[status] as object | undefined) ?? {}),
    },
  });

  void logQuoteActivity(quote.contactId, auth.user.id, "quote.status_changed", {
    quoteId: quote.id,
    title: quote.title,
    status,
  });

  revalidateQuotePaths(quote.contactId);

  return { success: true, data: quote };
}

// ---------------------------------------------------------------------------
// deleteQuote
// ---------------------------------------------------------------------------

export async function deleteQuote(id: string): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  // Only owners can delete quotes
  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only owners can delete quotes." };
  }

  const quote = await db.quote.delete({ where: { id } });

  revalidateQuotePaths(quote.contactId);

  return { success: true, data: { id: quote.id } };
}
