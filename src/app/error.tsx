/**
 * src/app/error.tsx
 *
 * Root-level error boundary.
 *
 * Catches errors that propagate outside the dashboard layout,
 * such as errors in the root layout or auth flow.
 * Must be a client component.
 */

"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-background text-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Application Error</h1>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            A critical error occurred. Please try refreshing the page.
            {error.digest && (
              <span className="block mt-1 text-xs opacity-60">Error ID: {error.digest}</span>
            )}
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
