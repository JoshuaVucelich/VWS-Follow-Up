/**
 * src/features/contacts/components/pipeline-board-client.tsx
 *
 * PipelineBoardClient — the interactive kanban board with drag-and-drop.
 *
 * Architecture:
 *   - Receives a flat array of contacts from the server component.
 *   - Groups them into columns by stage using useMemo.
 *   - Wraps the board in DragDropContext from @hello-pangea/dnd.
 *   - Each column is a Droppable; each card is a Draggable.
 *   - On drop: optimistically moves the card in local state, then calls
 *     the updateContactStage server action in a transition.
 *   - If the server action fails, local state is reverted and a toast shown.
 *
 * Stages displayed:
 *   All PIPELINE_STAGES are shown as columns in order. Empty columns are
 *   shown as drop targets. LOST is shown as the last column.
 *
 * Optimistic update strategy:
 *   We maintain a local `contacts` state (derived from props on mount).
 *   On drag end, we immediately mutate that state. If the action fails,
 *   we reset to the last known-good state stored in a ref.
 */

"use client";

import { useState, useMemo, useRef, useTransition } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { toast } from "sonner";
import { updateContactStage } from "@/server/actions/contacts";
import { PipelineCard } from "@/features/contacts/components/pipeline-card";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from "@/lib/constants";
import type { ContactStage } from "@prisma/client";
import type { PipelineContact } from "@/server/queries/contacts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineBoardClientProps {
  contacts: PipelineContact[];
}

// ---------------------------------------------------------------------------
// Stage color accents for column headers
// ---------------------------------------------------------------------------

const STAGE_HEADER_COLORS: Record<ContactStage, string> = {
  NEW_LEAD: "bg-blue-500",
  CONTACTED: "bg-violet-500",
  QUOTE_REQUESTED: "bg-cyan-500",
  QUOTE_SENT: "bg-amber-500",
  WAITING_ON_RESPONSE: "bg-orange-500",
  FOLLOW_UP_NEEDED: "bg-rose-500",
  BOOKED: "bg-green-500",
  IN_PROGRESS: "bg-teal-500",
  COMPLETED: "bg-emerald-500",
  LOST: "bg-gray-400",
};

// ---------------------------------------------------------------------------
// PipelineBoardClient
// ---------------------------------------------------------------------------

export function PipelineBoardClient({ contacts: initialContacts }: PipelineBoardClientProps) {
  const [contacts, setContacts] = useState<PipelineContact[]>(initialContacts);
  // Keep a stable reference to the last confirmed server state for rollback
  const confirmedContacts = useRef<PipelineContact[]>(initialContacts);
  const [isPending, startTransition] = useTransition();

  // Group contacts into columns by stage
  const columns = useMemo(() => {
    const grouped: Record<ContactStage, PipelineContact[]> = {} as Record<
      ContactStage,
      PipelineContact[]
    >;
    for (const stage of PIPELINE_STAGES) {
      grouped[stage] = [];
    }
    for (const contact of contacts) {
      if (grouped[contact.stage]) {
        grouped[contact.stage].push(contact);
      }
    }
    return grouped;
  }, [contacts]);

  // -------------------------------------------------------------------------
  // Drag-and-drop handler
  // -------------------------------------------------------------------------

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;

    // Dropped outside a column or in the same column
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStage = destination.droppableId as ContactStage;
    const contactId = draggableId;

    // Optimistically update local state
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, stage: newStage } : c))
    );

    // Call server action inside transition
    startTransition(async () => {
      const result = await updateContactStage(contactId, { stage: newStage });

      if (!result.success) {
        // Revert on failure
        toast.error(result.error ?? "Failed to update stage.");
        setContacts(confirmedContacts.current);
      } else {
        // Commit: update the confirmed snapshot
        confirmedContacts.current = confirmedContacts.current.map((c) =>
          c.id === contactId ? { ...c, stage: newStage } : c
        );
        toast.success("Stage updated.");
      }
    });
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Horizontal scroll container */}
      <div className="flex gap-3 overflow-x-auto pb-4 h-full scrollbar-thin">
        {PIPELINE_STAGES.map((stage) => {
          const cards = columns[stage] ?? [];

          return (
            <div
              key={stage}
              className="flex flex-col flex-shrink-0 w-[260px] rounded-xl border border-border bg-muted/20"
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${STAGE_HEADER_COLORS[stage]}`}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {PIPELINE_STAGE_LABELS[stage]}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums bg-muted rounded-full px-2 py-0.5 min-w-[24px] text-center">
                  {cards.length}
                </span>
              </div>

              {/* Droppable card list */}
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px] transition-colors scrollbar-thin ${
                      snapshot.isDraggingOver ? "bg-primary/5" : ""
                    }`}
                  >
                    {cards.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border">
                        <p className="text-xs text-muted-foreground/60">Drop here</p>
                      </div>
                    )}

                    {cards.map((contact, index) => (
                      <Draggable
                        key={contact.id}
                        draggableId={contact.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <PipelineCard
                              contact={contact}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
