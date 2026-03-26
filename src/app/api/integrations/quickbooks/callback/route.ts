/**
 * src/app/api/integrations/quickbooks/callback/route.ts
 *
 * GET /api/integrations/quickbooks/callback
 *
 * Handles Intuit OAuth callback and saves workspace token credentials.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  QUICKBOOKS_TOKEN_URL,
  fetchQuickBooksCompanyName,
  getAppBaseUrl,
  getQuickBooksBasicAuthHeader,
  getQuickBooksCallbackUrl,
  getQuickBooksServerConfig,
} from "@/lib/quickbooks";

const QUICKBOOKS_OAUTH_STATE_COOKIE = "quickbooks_oauth_state";
const STATE_MAX_AGE_MS = 10 * 60 * 1000;

type QuickBooksTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  scope?: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
};

function buildSettingsUrl(request: NextRequest, params: Record<string, string>): URL {
  const url = new URL("/settings", getAppBaseUrl(request.url));
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

function redirectToSettings(
  request: NextRequest,
  params: Record<string, string>,
  clearStateCookie = true,
): NextResponse {
  const response = NextResponse.redirect(buildSettingsUrl(request, params));
  if (clearStateCookie) {
    response.cookies.set({
      name: QUICKBOOKS_OAUTH_STATE_COOKIE,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
  }
  return response;
}

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const oauthError = search.get("error");
  if (oauthError) {
    const detail = search.get("error_description") ?? oauthError;
    return redirectToSettings(request, { quickbooks_error: detail });
  }

  const session = await auth();
  if (!session?.user) {
    const loginUrl = new URL("/login", getAppBaseUrl(request.url));
    loginUrl.searchParams.set("callbackUrl", "/settings");
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.role !== "OWNER") {
    return redirectToSettings(request, {
      quickbooks_error: "Only workspace owners can connect QuickBooks.",
    });
  }

  const quickBooks = getQuickBooksServerConfig();
  if (!quickBooks.isConfigured) {
    return redirectToSettings(request, {
      quickbooks_error: "QuickBooks is not configured on this server.",
    });
  }

  const receivedState = search.get("state");
  const storedState = request.cookies.get(QUICKBOOKS_OAUTH_STATE_COOKIE)?.value;
  if (!receivedState || !storedState || receivedState !== storedState) {
    return redirectToSettings(request, {
      quickbooks_error: "QuickBooks OAuth state validation failed.",
    });
  }

  let parsedState: { userId: string; issuedAt: number } | null = null;
  try {
    parsedState = JSON.parse(Buffer.from(receivedState, "base64url").toString("utf-8")) as {
      userId: string;
      issuedAt: number;
    };
  } catch {
    return redirectToSettings(request, {
      quickbooks_error: "QuickBooks OAuth state was invalid.",
    });
  }

  if (!parsedState || parsedState.userId !== session.user.id) {
    return redirectToSettings(request, {
      quickbooks_error: "QuickBooks OAuth state does not match your session.",
    });
  }

  if (Date.now() - parsedState.issuedAt > STATE_MAX_AGE_MS) {
    return redirectToSettings(request, {
      quickbooks_error: "QuickBooks authorization session expired. Try again.",
    });
  }

  const code = search.get("code");
  const realmId = search.get("realmId");
  if (!code || !realmId) {
    return redirectToSettings(request, {
      quickbooks_error: "QuickBooks did not return the authorization code or company realm ID.",
    });
  }

  const callbackUrl = getQuickBooksCallbackUrl(getAppBaseUrl(request.url));
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl,
  });

  const tokenResponse = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: getQuickBooksBasicAuthHeader(quickBooks.clientId, quickBooks.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: tokenBody,
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return redirectToSettings(request, {
      quickbooks_error: "Failed to exchange QuickBooks authorization code for tokens.",
    });
  }

  const tokenData = await tokenResponse.json() as QuickBooksTokenResponse;
  if (!tokenData.access_token || !tokenData.refresh_token || !tokenData.expires_in) {
    return redirectToSettings(request, {
      quickbooks_error: "QuickBooks returned an incomplete token payload.",
    });
  }

  const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  const refreshTokenExpiresAt = typeof tokenData.x_refresh_token_expires_in === "number"
    ? new Date(Date.now() + tokenData.x_refresh_token_expires_in * 1000)
    : null;

  const companyName = await fetchQuickBooksCompanyName({
    accessToken: tokenData.access_token,
    realmId,
    environment: quickBooks.environment,
  });

  const existingConnection = await db.quickBooksConnection.findFirst({
    select: { id: true },
  });

  if (existingConnection) {
    await db.quickBooksConnection.update({
      where: { id: existingConnection.id },
      data: {
        realmId,
        companyName,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type ?? null,
        scope: tokenData.scope ?? quickBooks.scope,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        connectedByUserId: session.user.id,
      },
    });
  } else {
    await db.quickBooksConnection.create({
      data: {
        realmId,
        companyName,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type ?? null,
        scope: tokenData.scope ?? quickBooks.scope,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        connectedByUserId: session.user.id,
      },
    });
  }

  return redirectToSettings(request, { quickbooks: "connected" });
}
