/**
 * src/app/api/integrations/quickbooks/connect/route.ts
 *
 * GET /api/integrations/quickbooks/connect
 *
 * Starts the Intuit OAuth flow for a workspace owner.
 */

import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  QUICKBOOKS_AUTHORIZATION_URL,
  getAppBaseUrl,
  getQuickBooksCallbackUrl,
  getQuickBooksServerConfig,
} from "@/lib/quickbooks";

const QUICKBOOKS_OAUTH_STATE_COOKIE = "quickbooks_oauth_state";
const STATE_MAX_AGE_SECONDS = 10 * 60;

function buildSettingsUrl(request: NextRequest, params: Record<string, string>): URL {
  const url = new URL("/settings", getAppBaseUrl(request.url));
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    const loginUrl = new URL("/login", getAppBaseUrl(request.url));
    loginUrl.searchParams.set("callbackUrl", "/settings");
    return NextResponse.redirect(loginUrl);
  }

  if (session.user.role !== "OWNER") {
    return NextResponse.redirect(
      buildSettingsUrl(request, {
        quickbooks_error: "Only workspace owners can connect QuickBooks.",
      }),
    );
  }

  const quickBooks = getQuickBooksServerConfig();
  if (!quickBooks.isConfigured) {
    return NextResponse.redirect(
      buildSettingsUrl(request, {
        quickbooks_error: "QuickBooks is not configured on this server.",
      }),
    );
  }

  const baseUrl = getAppBaseUrl(request.url);
  const callbackUrl = getQuickBooksCallbackUrl(baseUrl);

  const statePayload = {
    nonce: randomBytes(16).toString("hex"),
    userId: session.user.id,
    issuedAt: Date.now(),
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  const authorizeUrl = new URL(QUICKBOOKS_AUTHORIZATION_URL);
  authorizeUrl.searchParams.set("client_id", quickBooks.clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", quickBooks.scope);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set({
    name: QUICKBOOKS_OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_MAX_AGE_SECONDS,
  });

  return response;
}
