/**
 * src/lib/validations/pipeline.ts
 *
 * Zod schemas for the pipeline board page filters.
 *
 * These are parsed from URL search params on the server and passed down
 * to the PipelineFilters (client) and PipelineBoard (server→client).
 *
 * Keeping pipeline filters separate from contact filters because the
 * pipeline board has a different set of filter controls and display
 * requirements (no pagination, no sort — all active contacts always visible).
 */

import { z } from "zod";
import { ContactSource, ContactType } from "@prisma/client";

export const pipelineFiltersSchema = z.object({
  search: z.string().optional(),
  assignedUserId: z.string().optional(),
  source: z.nativeEnum(ContactSource).optional(),
  type: z.nativeEnum(ContactType).optional(),
});

export type PipelineFiltersInput = z.infer<typeof pipelineFiltersSchema>;
