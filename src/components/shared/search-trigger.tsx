"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Client component that opens the global search palette (Cmd+K) when clicked.
 * Used in the app header for both mobile icon and desktop search input.
 */
function triggerSearch() {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
  );
}

export function SearchTrigger() {
  return (
    <div className="flex flex-1 items-center gap-2">
      {/* Mobile search icon */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        className="sm:hidden"
        onClick={triggerSearch}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Desktop search bar — read-only, opens command palette on click */}
      <button
        type="button"
        onClick={triggerSearch}
        className="relative hidden w-full max-w-sm sm:block"
      >
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <div className="flex h-9 w-full items-center rounded-md border border-input bg-background pl-8 pr-3 text-sm text-muted-foreground cursor-pointer hover:border-ring transition-colors">
          Search contacts, tasks...
          <kbd className="ml-auto hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </div>
      </button>
    </div>
  );
}
