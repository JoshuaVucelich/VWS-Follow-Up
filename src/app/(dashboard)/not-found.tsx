/**
 * src/app/(dashboard)/not-found.tsx
 *
 * 404 page for dashboard routes (e.g., /contacts/unknown-id).
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        <SearchX className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-2">Not found</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        This page or record doesn&apos;t exist, or you may not have permission to view it.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/contacts">Contacts</Link>
        </Button>
      </div>
    </div>
  );
}
