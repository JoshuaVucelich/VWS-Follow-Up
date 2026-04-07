/**
 * src/server/lib/quickbooks-api.ts
 *
 * Shared QuickBooks API utilities used by contacts and quotes server actions.
 * Centralises token refresh, API URL building, error parsing, and response reading.
 */

import { db } from "@/lib/db";
import {
  QUICKBOOKS_TOKEN_URL,
  getQuickBooksApiBaseUrl,
  getQuickBooksBasicAuthHeader,
  getQuickBooksServerConfig,
} from "@/lib/quickbooks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuickBooksConnectionRecord = {
  id: string;
  realmId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date | null;
};

export type QuickBooksConnectionState =
  | { success: true; connection: QuickBooksConnectionRecord; environment: "sandbox" | "production" }
  | { success: true; connection: null; environment: "sandbox" | "production" }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Buffer (ms) before token expiry at which we proactively refresh. */
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a human-readable error message from a QuickBooks API fault payload.
 * Returns null if the payload doesn't contain a recognisable fault structure.
 */
export function parseQuickBooksError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const fault = (payload as { Fault?: { Error?: Array<{ Message?: string; Detail?: string }> } }).Fault;
  const errors = fault?.Error;
  if (!errors || errors.length === 0) return null;
  const parts = errors
    .map((entry) => entry.Detail || entry.Message)
    .filter((value): value is string => Boolean(value?.trim()));
  return parts.length > 0 ? parts.join(" | ") : null;
}

/**
 * Safely reads a Response body — returns parsed JSON when possible, raw text otherwise.
 */
export async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Builds a fully-qualified QuickBooks API v3 URL.
 */
export function buildQuickBooksApiUrl(input: {
  realmId: string;
  environment: "sandbox" | "production";
  path: string;
  queryParams?: Record<string, string>;
}): string {
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

/**
 * Refreshes a QuickBooks OAuth access token using the stored refresh token.
 */
export async function refreshQuickBooksConnectionToken(
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
    return {
      success: false,
      error: "QuickBooks token refresh failed. Please reconnect QuickBooks in Settings.",
    };
  }

  const payload = (await readResponsePayload(response)) as {
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
      refreshTokenExpiresAt:
        typeof payload.x_refresh_token_expires_in === "number"
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

/**
 * Returns a fresh (non-expired) QuickBooks connection, refreshing the token if needed.
 *
 * @param requireConnection When true, returns an error if no connection exists.
 *   When false (default), returns `{ connection: null }` instead.
 */
export async function getFreshQuickBooksConnection(
  requireConnection = false,
): Promise<QuickBooksConnectionState> {
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
    return {
      success: false,
      error: "No QuickBooks account is connected. Connect QuickBooks in Settings first.",
    };
  }

  if (connection.accessTokenExpiresAt.getTime() - Date.now() <= TOKEN_EXPIRY_BUFFER_MS) {
    const refreshed = await refreshQuickBooksConnectionToken(connection);
    if (!refreshed.success) return refreshed;
    return { success: true, connection: refreshed.connection, environment: quickBooks.environment };
  }

  return { success: true, connection, environment: quickBooks.environment };
}
