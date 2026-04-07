"use server";

import { requireAuthForAction } from "@/lib/session";
import { globalSearch, type SearchResult } from "@/server/queries/search";

export async function searchAction(query: string): Promise<SearchResult[]> {
  const auth = await requireAuthForAction();
  if (!auth.success) return [];
  return globalSearch(query);
}
