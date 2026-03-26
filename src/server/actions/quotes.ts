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
import {
  QUICKBOOKS_TOKEN_URL,
  getQuickBooksApiBaseUrl,
  getQuickBooksBasicAuthHeader,
  getQuickBooksServerConfig,
} from "@/lib/quickbooks";
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

type QuickBooksConnectionRecord = {
  id: string;
  realmId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date | null;
};

function parseQuickBooksError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const fault = (payload as { Fault?: { Error?: Array<{ Message?: string; Detail?: string }> } }).Fault;
  const errors = fault?.Error;
  if (!errors || errors.length === 0) return null;
  const parts = errors
    .map((entry) => entry.Detail || entry.Message)
    .filter((value): value is string => Boolean(value?.trim()));
  return parts.length > 0 ? parts.join(" | ") : null;
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildQuickBooksApiUrl(
  input: {
    realmId: string;
    environment: "sandbox" | "production";
    path: string;
    queryParams?: Record<string, string>;
  },
): string {
  const { realmId, environment, path, queryParams } = input;
  const url = new URL(`/v3/company/${realmId}${path}`, getQuickBooksApiBaseUrl(environment));
  url.searchParams.set("minorversion", "75");
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function refreshQuickBooksConnectionToken(
  connection: QuickBooksConnectionRecord,
): Promise<{ success: true; connection: QuickBooksConnectionRecord } | { success: false; error: string }> {
  const quickBooks = getQuickBooksServerConfig();
  if (!quickBooks.isConfigured) {
    return { success: false, error: "QuickBooks is not configured on this server." };
  }

  const response = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: getQuickBooksBasicAuthHeader(quickBooks.clientId, quickBooks.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return { success: false, error: "QuickBooks token refresh failed. Please reconnect your QuickBooks account." };
  }

  const payload = await readResponsePayload(response) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    x_refresh_token_expires_in?: number;
  };

  if (!payload?.access_token || !payload?.refresh_token || !payload?.expires_in) {
    return { success: false, error: "QuickBooks token refresh returned an invalid payload." };
  }

  const updated = await db.quickBooksConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + payload.expires_in * 1000),
      refreshTokenExpiresAt: typeof payload.x_refresh_token_expires_in === "number"
        ? new Date(Date.now() + payload.x_refresh_token_expires_in * 1000)
        : connection.refreshTokenExpiresAt,
    },
    select: {
      id: true,
      realmId: true,
      accessToken: true,
      refreshToken: true,
      accessTokenExpiresAt: true,
      refreshTokenExpiresAt: true,
    },
  });

  return { success: true, connection: updated };
}

async function getFreshQuickBooksConnection(
  requireConnection = true,
): Promise<
  { success: true; connection: QuickBooksConnectionRecord | null; environment: "sandbox" | "production" }
  | { success: false; error: string }
> {
  const quickBooks = getQuickBooksServerConfig();
  if (!quickBooks.isConfigured) {
    if (!requireConnection) {
      return { success: true, connection: null, environment: quickBooks.environment };
    }
    return { success: false, error: "QuickBooks is not configured on this server." };
  }

  const connection = await db.quickBooksConnection.findFirst({
    select: {
      id: true,
      realmId: true,
      accessToken: true,
      refreshToken: true,
      accessTokenExpiresAt: true,
      refreshTokenExpiresAt: true,
    },
  });

  if (!connection) {
    if (!requireConnection) {
      return { success: true, connection: null, environment: quickBooks.environment };
    }
    return { success: false, error: "No QuickBooks account is connected. Connect QuickBooks in Settings first." };
  }

  // Refresh if expired (or about to expire in the next minute).
  if (connection.accessTokenExpiresAt.getTime() - Date.now() <= 60_000) {
    const refreshed = await refreshQuickBooksConnectionToken(connection);
    if (!refreshed.success) return refreshed;
    return { success: true, connection: refreshed.connection, environment: quickBooks.environment };
  }

  return { success: true, connection, environment: quickBooks.environment };
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
      error: "Please fix the errors below.",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { contactId, sentAt, ...rest } = validated.data;
  try {
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

    await syncQuoteToQuickBooksInternal(quote.id, auth.user.id, false);

    revalidateQuotePaths(contactId);

    return { success: true, data: quote };
  } catch (error) {
    console.error("[createQuote]", error);
    return { success: false, error: "Failed to create quote. Please try again." };
  }
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
      error: "Please fix the errors below.",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { contactId: _contactId, ...rest } = validated.data;
  try {
    const quote = await db.quote.update({
      where: { id },
      data: { ...rest },
    });

    await syncQuoteToQuickBooksInternal(quote.id, auth.user.id, false);

    revalidateQuotePaths(quote.contactId);

    return { success: true, data: quote };
  } catch (error) {
    console.error("[updateQuote]", error);
    return { success: false, error: "Failed to update quote. Please try again." };
  }
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

  try {
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

    await syncQuoteToQuickBooksInternal(quote.id, auth.user.id, false);

    revalidateQuotePaths(quote.contactId);

    return { success: true, data: quote };
  } catch (error) {
    console.error("[updateQuoteStatus]", error);
    return { success: false, error: "Failed to update quote status." };
  }
}

// ---------------------------------------------------------------------------
// syncQuoteToQuickBooks
// ---------------------------------------------------------------------------

async function syncQuoteToQuickBooksInternal(
  id: string,
  userId: string | undefined,
  requireConnection: boolean,
): Promise<ActionResult<{ quoteId: string; estimateId: string | null }>> {
  const quote = await db.quote.findUnique({
    where: { id },
    select: {
      id: true,
      contactId: true,
      title: true,
      description: true,
      amount: true,
      sentAt: true,
      quickBooksEstimateId: true,
      contact: {
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
      },
    },
  });

  if (!quote) {
    return { success: false, error: "Quote not found." };
  }

  if (!quote.contact) {
    await db.quote.update({
      where: { id: quote.id },
      data: { quickBooksSyncError: "Quote is missing a contact." },
    });
    return { success: false, error: "Quote is missing a contact." };
  }

  const quickBooksConnection = await getFreshQuickBooksConnection(requireConnection);
  if (!quickBooksConnection.success) {
    await db.quote.update({
      where: { id: quote.id },
      data: { quickBooksSyncError: quickBooksConnection.error },
    });
    revalidateQuotePaths(quote.contactId);
    return { success: false, error: quickBooksConnection.error };
  }

  const { connection, environment } = quickBooksConnection;
  if (!connection) {
    return { success: true, data: { quoteId: quote.id, estimateId: quote.quickBooksEstimateId } };
  }

  const amount = quote.amount != null ? Number.parseFloat(quote.amount.toString()) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    await db.quote.update({
      where: { id: quote.id },
      data: { quickBooksSyncError: "Quote amount must be greater than 0 before syncing to QuickBooks." },
    });
    revalidateQuotePaths(quote.contactId);
    return { success: false, error: "Quote amount must be greater than $0.00 before syncing." };
  }

  // 1) Ensure the contact has a QuickBooks customer.
  let customerId = quote.contact.quickBooksCustomerId;
  if (!customerId) {
    const customerPayload: Record<string, unknown> = {
      DisplayName: quote.contact.displayName,
    };

    if (quote.contact.firstName) customerPayload.GivenName = quote.contact.firstName;
    if (quote.contact.lastName) customerPayload.FamilyName = quote.contact.lastName;
    if (quote.contact.email) customerPayload.PrimaryEmailAddr = { Address: quote.contact.email };
    if (quote.contact.phone) customerPayload.PrimaryPhone = { FreeFormNumber: quote.contact.phone };

    const billAddress: Record<string, string> = {};
    if (quote.contact.addressLine1) billAddress.Line1 = quote.contact.addressLine1;
    if (quote.contact.city) billAddress.City = quote.contact.city;
    if (quote.contact.state) billAddress.CountrySubDivisionCode = quote.contact.state;
    if (quote.contact.zip) billAddress.PostalCode = quote.contact.zip;
    if (Object.keys(billAddress).length > 0) customerPayload.BillAddr = billAddress;

    const customerResponse = await fetch(
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
        body: JSON.stringify(customerPayload),
        cache: "no-store",
      },
    );

    const customerData = await readResponsePayload(customerResponse) as {
      Customer?: { Id?: string };
    };

    if (!customerResponse.ok || !customerData?.Customer?.Id) {
      const apiError = parseQuickBooksError(customerData) ?? "Failed to create customer in QuickBooks.";
      await db.quote.update({
        where: { id: quote.id },
        data: { quickBooksSyncError: apiError },
      });
      revalidateQuotePaths(quote.contactId);
      return { success: false, error: apiError };
    }

    customerId = customerData.Customer.Id;
    await db.contact.update({
      where: { id: quote.contact.id },
      data: { quickBooksCustomerId: customerId },
    });
  }

  // 2) Get a usable item reference for the estimate line.
  const itemQueryResponse = await fetch(
    buildQuickBooksApiUrl({
      realmId: connection.realmId,
      environment,
      path: "/query",
      queryParams: { query: "select * from Item maxresults 1" },
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
  const itemQueryData = await readResponsePayload(itemQueryResponse) as {
    QueryResponse?: { Item?: Array<{ Id?: string }> };
  };
  const itemId = itemQueryData?.QueryResponse?.Item?.[0]?.Id;

  if (!itemQueryResponse.ok || !itemId) {
    const apiError = parseQuickBooksError(itemQueryData)
      ?? "QuickBooks has no Product/Service items. Create one item in QuickBooks, then sync again.";
    await db.quote.update({
      where: { id: quote.id },
      data: { quickBooksSyncError: apiError },
    });
    revalidateQuotePaths(quote.contactId);
    return { success: false, error: apiError };
  }

  // 3) Create or update estimate.
  const baseEstimatePayload = {
    CustomerRef: { value: customerId },
    TxnDate: (quote.sentAt ?? new Date()).toISOString().slice(0, 10),
    DocNumber: `VWS-${quote.id.slice(0, 8).toUpperCase()}`,
    CustomerMemo: { value: quote.title },
    PrivateNote: quote.description ?? undefined,
    Line: [
      {
        Amount: Number(amount.toFixed(2)),
        DetailType: "SalesItemLineDetail",
        Description: quote.description ?? quote.title,
        SalesItemLineDetail: {
          ItemRef: { value: itemId },
        },
      },
    ],
  };

  let estimateId: string | null = null;

  if (quote.quickBooksEstimateId) {
    const existingEstimateResponse = await fetch(
      buildQuickBooksApiUrl({
        realmId: connection.realmId,
        environment,
        path: `/estimate/${quote.quickBooksEstimateId}`,
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

    const existingEstimateData = await readResponsePayload(existingEstimateResponse) as {
      Estimate?: { SyncToken?: string; Id?: string };
    };
    const syncToken = existingEstimateData?.Estimate?.SyncToken;

    if (existingEstimateResponse.ok && syncToken) {
      const updateResponse = await fetch(
        buildQuickBooksApiUrl({
          realmId: connection.realmId,
          environment,
          path: "/estimate",
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
            ...baseEstimatePayload,
            Id: quote.quickBooksEstimateId,
            SyncToken: syncToken,
            sparse: true,
          }),
          cache: "no-store",
        },
      );

      const updateData = await readResponsePayload(updateResponse) as {
        Estimate?: { Id?: string };
      };

      if (updateResponse.ok && updateData?.Estimate?.Id) {
        estimateId = updateData.Estimate.Id;
      }
    }
  }

  if (!estimateId) {
    const createEstimateResponse = await fetch(
      buildQuickBooksApiUrl({
        realmId: connection.realmId,
        environment,
        path: "/estimate",
      }),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(baseEstimatePayload),
        cache: "no-store",
      },
    );

    const createEstimateData = await readResponsePayload(createEstimateResponse) as {
      Estimate?: { Id?: string };
    };

    if (!createEstimateResponse.ok || !createEstimateData?.Estimate?.Id) {
      const apiError = parseQuickBooksError(createEstimateData) ?? "Failed to create estimate in QuickBooks.";
      await db.quote.update({
        where: { id: quote.id },
        data: { quickBooksSyncError: apiError },
      });
      revalidateQuotePaths(quote.contactId);
      return { success: false, error: apiError };
    }

    estimateId = createEstimateData.Estimate.Id;
  }

  await db.quote.update({
    where: { id: quote.id },
    data: {
      quickBooksEstimateId: estimateId,
      quickBooksLastSyncedAt: new Date(),
      quickBooksSyncError: null,
    },
  });

  void logQuoteActivity(quote.contactId, userId, "quote.quickbooks_synced", {
    quoteId: quote.id,
    estimateId,
  });

  revalidateQuotePaths(quote.contactId);
  return { success: true, data: { quoteId: quote.id, estimateId } };
}

export async function syncQuoteToQuickBooks(
  id: string,
): Promise<ActionResult<{ quoteId: string; estimateId: string | null }>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  return syncQuoteToQuickBooksInternal(id, auth.user.id, true);
}

// ---------------------------------------------------------------------------
// syncAllQuotesToQuickBooks
// ---------------------------------------------------------------------------

export async function syncAllQuotesToQuickBooks(): Promise<
  ActionResult<{ synced: number; failed: number; skipped: number; errors: string[] }>
> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (auth.user.role !== "OWNER") {
    return { success: false, error: "Only workspace owners can run a full QuickBooks quote sync." };
  }

  const quoteIds = await db.quote.findMany({
    where: {},
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  let synced = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const quote of quoteIds) {
    const result = await syncQuoteToQuickBooksInternal(quote.id, auth.user.id, true);
    if (!result.success) {
      failed++;
      if (errors.length < 20) {
        errors.push(`Quote ${quote.id}: ${result.error}`);
      }
      continue;
    }

    if (result.data.estimateId) synced++;
    else skipped++;
  }

  revalidatePath("/quotes");
  revalidatePath("/dashboard");

  return { success: true, data: { synced, failed, skipped, errors } };
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

  try {
    const quote = await db.quote.delete({ where: { id } });

    revalidateQuotePaths(quote.contactId);

    return { success: true, data: { id: quote.id } };
  } catch (error) {
    console.error("[deleteQuote]", error);
    return { success: false, error: "Failed to delete quote." };
  }
}
