/**
 * src/server/queries/search.ts
 *
 * Global search query — searches contacts, tasks, and quotes simultaneously.
 */

import { db } from "@/lib/db";

export type SearchResult = {
  type: "contact" | "task" | "quote";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const term = query.trim();
  if (!term || term.length < 2) return [];

  const [contacts, tasks, quotes] = await Promise.all([
    db.contact.findMany({
      where: {
        status: { not: "ARCHIVED" },
        OR: [
          { displayName: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { phone: { contains: term, mode: "insensitive" } },
          { businessName: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, email: true, phone: true },
    }),
    db.task.findMany({
      where: {
        title: { contains: term, mode: "insensitive" },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, contact: { select: { displayName: true } } },
    }),
    db.quote.findMany({
      where: {
        title: { contains: term, mode: "insensitive" },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, contact: { select: { id: true, displayName: true } } },
    }),
  ]);

  const results: SearchResult[] = [];

  for (const c of contacts) {
    results.push({
      type: "contact",
      id: c.id,
      title: c.displayName,
      subtitle: c.email ?? c.phone ?? undefined,
      href: `/contacts/${c.id}`,
    });
  }

  for (const t of tasks) {
    results.push({
      type: "task",
      id: t.id,
      title: t.title,
      subtitle: t.contact?.displayName ?? t.status,
      href: "/tasks",
    });
  }

  for (const q of quotes) {
    results.push({
      type: "quote",
      id: q.id,
      title: q.title,
      subtitle: q.contact?.displayName ?? q.status,
      href: q.contact ? `/contacts/${q.contact.id}` : "/quotes",
    });
  }

  return results;
}
