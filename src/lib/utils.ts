/**
 * src/lib/utils.ts
 *
 * General utility functions used throughout the application.
 *
 * Keep this file focused on small, pure helper functions. If a utility
 * grows large or becomes domain-specific, move it to a more specific
 * location (e.g., src/lib/format.ts, src/features/contacts/utils.ts).
 *
 * Utilities in this file:
 *   - cn()           — Tailwind class merging (shadcn/ui convention)
 *   - formatDate()   — Human-readable date formatting
 *   - formatPhone()  — Basic phone number display formatting
 *   - getInitials()  — Extract initials from a name string
 *   - truncate()     — Safely truncate a string with ellipsis
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow } from "date-fns";

// =============================================================================
// CLASS MERGING
// =============================================================================

/**
 * Merges Tailwind CSS class names intelligently.
 *
 * Combines clsx (for conditional classes) and tailwind-merge (for deduplication
 * of conflicting Tailwind classes). This is the standard shadcn/ui pattern.
 *
 * @example
 *   cn("px-4 py-2", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// =============================================================================
// DATE FORMATTING
// =============================================================================

/**
 * Formats a date for display in the UI.
 *
 * Uses relative language for near dates (today, yesterday, tomorrow),
 * then falls back to a short absolute date for older/future dates.
 *
 * @example
 *   formatDate(new Date())           // "Today"
 *   formatDate(yesterday)            // "Yesterday"
 *   formatDate(tomorrow)             // "Tomorrow"
 *   formatDate(someOldDate)          // "Mar 15, 2024"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "Invalid date";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isTomorrow(d)) return "Tomorrow";

  return format(d, "MMM d, yyyy");
}

/**
 * Formats a date with time for display (e.g., in appointment cards).
 *
 * @example
 *   formatDateTime(date)  // "Mar 15, 2024 at 2:30 PM"
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "Invalid date";

  return format(d, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Formats a date as a relative time string for activity feeds and notes.
 *
 * @example
 *   formatRelativeTime(date)  // "3 days ago", "about 2 hours ago"
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "—";

  return formatDistanceToNow(d, { addSuffix: true });
}

// =============================================================================
// STRING FORMATTING
// =============================================================================

/**
 * Formats a phone number string for display.
 * Handles 10-digit US numbers. Passes other formats through unchanged.
 *
 * @example
 *   formatPhone("5550101234")   // "(555) 010-1234"
 *   formatPhone("555-010-1234") // "555-010-1234" (already formatted)
 *   formatPhone(null)           // "—"
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

/**
 * Extracts initials from a name string.
 * Returns up to 2 characters for use in avatar fallbacks.
 *
 * @example
 *   getInitials("Maria Gonzalez")  // "MG"
 *   getInitials("Alex")            // "AL"
 *   getInitials("")                // "?"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

/**
 * Truncates a string to a maximum length, adding an ellipsis if truncated.
 *
 * @example
 *   truncate("This is a long note", 10)  // "This is a…"
 *   truncate("Short", 10)                // "Short"
 */
export function truncate(str: string | null | undefined, maxLength: number): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

/**
 * Formats a currency amount for display.
 *
 * @example
 *   formatCurrency(850)     // "$850.00"
 *   formatCurrency(1200.5)  // "$1,200.50"
 *   formatCurrency(null)    // "—"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "USD"
): string {
  if (amount === null || amount === undefined || amount === "") return "—";

  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(num)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// =============================================================================
// OBJECT / ARRAY HELPERS
// =============================================================================

/**
 * Type-safe version of Object.entries that preserves key types.
 */
export function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Returns true if a value is not null or undefined.
 * Useful as a type guard in array filters.
 *
 * @example
 *   const values = [1, null, 2, undefined, 3];
 *   values.filter(isDefined); // [1, 2, 3]
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
