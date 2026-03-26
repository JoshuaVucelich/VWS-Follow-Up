/**
 * src/components/layout/theme-toggle.tsx
 *
 * Header toggle for light/dark mode.
 */

"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const THEME_STORAGE_KEY = "vws-followup-theme";
type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme: Theme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : document.documentElement.classList.contains("dark")
          ? "dark"
          : "light";

    setTheme(nextTheme);
    applyTheme(nextTheme);
    setMounted(true);
  }, []);

  function handleToggle(checked: boolean) {
    const nextTheme: Theme = checked ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
      <Sun
        className={cn(
          "h-3.5 w-3.5 transition-colors",
          theme === "light" ? "text-foreground" : "text-muted-foreground"
        )}
        aria-hidden="true"
      />
      <Switch
        checked={theme === "dark"}
        onCheckedChange={handleToggle}
        aria-label="Toggle dark mode"
        disabled={!mounted}
      />
      <Moon
        className={cn(
          "h-3.5 w-3.5 transition-colors",
          theme === "dark" ? "text-foreground" : "text-muted-foreground"
        )}
        aria-hidden="true"
      />
    </div>
  );
}
