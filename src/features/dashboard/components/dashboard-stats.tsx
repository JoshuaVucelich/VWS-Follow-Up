/**
 * src/features/dashboard/components/dashboard-stats.tsx
 *
 * Summary stat cards displayed at the top of the dashboard.
 *
 * Each card shows a count with a label and subtext.
 * Server component — fetches its own data via getDashboardStats().
 *
 * Stats shown:
 *   - New leads this week
 *   - Open tasks (with overdue count highlighted)
 *   - Quotes awaiting response
 *   - Jobs booked this week
 */

import { Users, CheckSquare, FileText, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDashboardStats } from "@/server/queries/dashboard";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export async function DashboardStats() {
  const stats = await getDashboardStats();

  const cards = [
    {
      label: "New Leads",
      value: stats.newLeadsThisWeek,
      subtext: "this week",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
      highlight: false,
    },
    {
      label: "Open Tasks",
      value: stats.openTaskCount,
      subtext:
        stats.overdueTaskCount > 0
          ? `${stats.overdueTaskCount} overdue`
          : "no overdue tasks",
      icon: CheckSquare,
      color: stats.overdueTaskCount > 0 ? "text-destructive" : "text-amber-600",
      bg: stats.overdueTaskCount > 0 ? "bg-destructive/10" : "bg-amber-50 dark:bg-amber-950",
      highlight: stats.overdueTaskCount > 0,
    },
    {
      label: "Quotes Awaiting",
      value: stats.quotesAwaitingResponse,
      subtext: "waiting on response",
      icon: FileText,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950",
      highlight: false,
    },
    {
      label: "Jobs This Week",
      value: stats.jobsBookedThisWeek,
      subtext: "booked or in progress",
      icon: CalendarDays,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950",
      highlight: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={cn(
              "rounded-xl border border-border bg-card p-4 shadow-sm",
              card.highlight && "border-destructive/30"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <div className={cn("rounded-md p-1.5", card.bg)}>
                <Icon className={cn("h-4 w-4", card.color)} />
              </div>
            </div>

            <div className="mt-3">
              <p className={cn("text-2xl font-bold", card.highlight ? "text-destructive" : "text-foreground")}>
                {card.value}
              </p>
              <p className={cn("text-xs mt-0.5", card.highlight ? "text-destructive" : "text-muted-foreground")}>
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
