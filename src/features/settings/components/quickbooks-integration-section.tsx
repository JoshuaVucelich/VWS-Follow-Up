/**
 * src/features/settings/components/quickbooks-integration-section.tsx
 *
 * Server wrapper for QuickBooks integration status + controls.
 */

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getAppBaseUrl, getQuickBooksCallbackUrl, getQuickBooksServerConfig } from "@/lib/quickbooks";
import { QuickBooksIntegrationSectionClient } from "./quickbooks-integration-section-client";

interface QuickBooksIntegrationSectionProps {
  oauthStatus?: string;
  oauthError?: string;
}

export async function QuickBooksIntegrationSection({
  oauthStatus,
  oauthError,
}: QuickBooksIntegrationSectionProps) {
  const [currentUser, connection] = await Promise.all([
    getCurrentUser(),
    db.quickBooksConnection.findFirst({
      include: {
        connectedByUser: {
          select: { name: true, email: true },
        },
      },
    }),
  ]);

  const quickBooks = getQuickBooksServerConfig();
  const callbackUrl = getQuickBooksCallbackUrl(getAppBaseUrl());

  return (
    <QuickBooksIntegrationSectionClient
      isOwner={currentUser.role === "OWNER"}
      isConfigured={quickBooks.isConfigured}
      environment={quickBooks.environment}
      callbackUrl={callbackUrl}
      oauthStatus={oauthStatus}
      oauthError={oauthError}
      connection={connection ? {
        companyName: connection.companyName,
        realmId: connection.realmId,
        connectedBy: connection.connectedByUser?.name ?? connection.connectedByUser?.email ?? null,
        accessTokenExpiresAt: connection.accessTokenExpiresAt.toISOString(),
        createdAt: connection.createdAt.toISOString(),
      } : null}
    />
  );
}
