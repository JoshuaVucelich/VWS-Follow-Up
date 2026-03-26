/**
 * src/features/settings/components/quickbooks-integration-section-client.tsx
 *
 * Client UI for QuickBooks connection status and actions.
 */

"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { disconnectQuickBooks } from "@/server/actions/settings";
import { syncAllContactsToQuickBooks } from "@/server/actions/contacts";
import { syncAllQuotesToQuickBooks } from "@/server/actions/quotes";

interface QuickBooksConnectionView {
  companyName: string | null;
  realmId: string;
  connectedBy: string | null;
  accessTokenExpiresAt: string;
  createdAt: string;
}

interface QuickBooksIntegrationSectionClientProps {
  isOwner: boolean;
  isConfigured: boolean;
  environment: "sandbox" | "production";
  callbackUrl: string;
  oauthStatus?: string;
  oauthError?: string;
  connection: QuickBooksConnectionView | null;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QuickBooksIntegrationSectionClient({
  isOwner,
  isConfigured,
  environment,
  callbackUrl,
  oauthStatus,
  oauthError,
  connection,
}: QuickBooksIntegrationSectionClientProps) {
  const router = useRouter();
  const [disconnectPending, startDisconnectTransition] = useTransition();
  const [syncPending, startSyncTransition] = useTransition();
  const autoSyncStarted = useRef(false);

  function runFullSync(showSuccessToast: boolean) {
    startSyncTransition(async () => {
      const contactsResult = await syncAllContactsToQuickBooks();
      const quotesResult = await syncAllQuotesToQuickBooks();

      if (!contactsResult.success) {
        toast.error(contactsResult.error);
        return;
      }

      if (!quotesResult.success) {
        toast.error(quotesResult.error);
        return;
      }

      if (showSuccessToast) {
        toast.success(
          `QuickBooks sync complete: ${contactsResult.data.synced} contacts, ${quotesResult.data.synced} quotes.`,
        );
      }

      if (contactsResult.data.failed > 0 || quotesResult.data.failed > 0) {
        toast.error(
          `Some records failed: ${contactsResult.data.failed + quotesResult.data.failed}. Use Sync all now to retry.`,
        );
      }

      router.refresh();
    });
  }

  useEffect(() => {
    if (oauthStatus !== "connected" || !isConfigured || autoSyncStarted.current) return;
    autoSyncStarted.current = true;
    runFullSync(false);
  }, [oauthStatus, isConfigured]);

  function handleDisconnect() {
    if (!confirm("Disconnect QuickBooks from this workspace?")) return;

    startDisconnectTransition(async () => {
      const result = await disconnectQuickBooks();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("QuickBooks disconnected.");
      router.refresh();
    });
  }

  if (!isOwner) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Only workspace owners can manage QuickBooks integrations.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xl">
      {oauthStatus === "connected" && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
          QuickBooks was connected successfully.
        </div>
      )}

      {oauthError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {oauthError}
        </div>
      )}

      {!isConfigured && (
        <div className="rounded-lg border border-dashed border-border p-4 space-y-2">
          <p className="text-sm font-medium">QuickBooks API keys are not configured yet</p>
          <p className="text-xs text-muted-foreground">
            Add <code>QUICKBOOKS_CLIENT_ID</code> and <code>QUICKBOOKS_CLIENT_SECRET</code> in your
            environment settings, then reconnect.
          </p>
          <p className="text-xs text-muted-foreground">
            Redirect URI to add in Intuit developer settings: <code>{callbackUrl}</code>
          </p>
        </div>
      )}

      {isConfigured && (
        <div className="rounded-lg border border-border p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">QuickBooks Online</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect once so this workspace can sync with your company file.
              </p>
            </div>
            <Badge variant="outline">
              {environment === "production" ? "Production" : "Sandbox"}
            </Badge>
          </div>

          {connection ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1.5 text-xs">
              <p>
                <span className="text-muted-foreground">Company:</span>{" "}
                <span className="font-medium">{connection.companyName ?? "Unknown company"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Realm ID:</span>{" "}
                <span className="font-medium">{connection.realmId}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Connected:</span>{" "}
                <span className="font-medium">{formatDateTime(connection.createdAt)}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Connected by:</span>{" "}
                <span className="font-medium">{connection.connectedBy ?? "Unknown user"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Access token expires:</span>{" "}
                <span className="font-medium">{formatDateTime(connection.accessTokenExpiresAt)}</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No QuickBooks account is connected yet.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/api/integrations/quickbooks/connect">
                {connection ? "Reconnect QuickBooks" : "Connect QuickBooks"}
              </a>
            </Button>
            {connection && (
              <Button
                variant="secondary"
                onClick={() => runFullSync(true)}
                disabled={syncPending || disconnectPending}
              >
                {syncPending ? "Syncing…" : "Sync all now"}
              </Button>
            )}
            {connection && (
              <Button variant="outline" onClick={handleDisconnect} disabled={disconnectPending}>
                {disconnectPending ? "Disconnecting…" : "Disconnect"}
              </Button>
            )}
          </div>

          {syncPending && (
            <p className="text-xs text-muted-foreground">
              Sync in progress. Existing contacts and quotes are being pushed to QuickBooks.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
