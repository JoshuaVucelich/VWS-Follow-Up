/**
 * src/features/contacts/components/pipeline-board.tsx
 *
 * PipelineBoard — server component shell for the kanban board.
 *
 * Receives pre-fetched contacts from the page and passes them to the
 * PipelineBoardClient which handles all drag-and-drop interactivity.
 *
 * Keeping the data fetching in the page (not here) means the pipeline
 * page can pass the same contacts array to both PipelineStats and
 * PipelineBoard without fetching twice.
 *
 * Props:
 *   contacts — Pre-fetched pipeline contacts from getPipelineContacts().
 */

import { PipelineBoardClient } from "@/features/contacts/components/pipeline-board-client";
import type { PipelineContact } from "@/server/queries/contacts";

interface PipelineBoardProps {
  contacts: PipelineContact[];
}

export function PipelineBoard({ contacts }: PipelineBoardProps) {
  return <PipelineBoardClient contacts={contacts} />;
}
