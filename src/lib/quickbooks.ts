/**
 * src/lib/quickbooks.ts
 *
 * Shared helpers for QuickBooks OAuth configuration and API access.
 */

export type QuickBooksEnvironment = "sandbox" | "production";

export const QUICKBOOKS_AUTHORIZATION_URL = "https://appcenter.intuit.com/connect/oauth2";
export const QUICKBOOKS_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
export const QUICKBOOKS_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
export const QUICKBOOKS_DEFAULT_SCOPE = "com.intuit.quickbooks.accounting";

interface QuickBooksServerConfig {
  isConfigured: boolean;
  clientId: string;
  clientSecret: string;
  scope: string;
  environment: QuickBooksEnvironment;
}

function normalizeEnvironment(value: string | undefined): QuickBooksEnvironment {
  return value === "production" ? "production" : "sandbox";
}

/**
 * Returns the canonical app base URL.
 * Prefers NEXTAUTH_URL and falls back to the request URL origin when provided.
 */
export function getAppBaseUrl(requestUrl?: string): string {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (requestUrl) return new URL(requestUrl).origin;
  return "http://localhost:3000";
}

export function getQuickBooksServerConfig(): QuickBooksServerConfig {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET?.trim() ?? "";
  const scope = process.env.QUICKBOOKS_OAUTH_SCOPE?.trim() || QUICKBOOKS_DEFAULT_SCOPE;
  const environment = normalizeEnvironment(process.env.QUICKBOOKS_ENVIRONMENT?.trim());

  return {
    isConfigured: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    scope,
    environment,
  };
}

export function getQuickBooksCallbackUrl(baseUrl: string): string {
  return `${baseUrl}/api/integrations/quickbooks/callback`;
}

export function getQuickBooksApiBaseUrl(environment: QuickBooksEnvironment): string {
  return environment === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export function getQuickBooksBasicAuthHeader(clientId: string, clientSecret: string): string {
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Best-effort company metadata lookup for display in Settings.
 * Fails open (returns null) if Intuit's companyinfo endpoint is unavailable.
 */
export async function fetchQuickBooksCompanyName(input: {
  accessToken: string;
  realmId: string;
  environment: QuickBooksEnvironment;
}): Promise<string | null> {
  const { accessToken, realmId, environment } = input;
  const endpoint = new URL(
    `/v3/company/${realmId}/companyinfo/${realmId}`,
    getQuickBooksApiBaseUrl(environment),
  );
  endpoint.searchParams.set("minorversion", "75");

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = await response.json() as {
      CompanyInfo?: { CompanyName?: string; LegalName?: string };
    };

    return payload.CompanyInfo?.CompanyName ?? payload.CompanyInfo?.LegalName ?? null;
  } catch {
    return null;
  }
}
