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

import { useState, useMemo, useRef, useTransition, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [openMenuContactId, setOpenMenuContactId] = useState<string | null>(null);
  // Keep a stable reference to the last confirmed server state for rollback
  const confirmedContacts = useRef<PipelineContact[]>(initialContacts);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; contactId: string } | null>(null);
  const suppressClickContactIdRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

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

  function moveContactToStage(contactId: string, newStage: ContactStage) {
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
        toast.success(`Moved to ${PIPELINE_STAGE_LABELS[newStage]}.`);
      }
    });
  }

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;

    // Dropped outside a column or in the same column
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStage = destination.droppableId as ContactStage;
    const contactId = draggableId;

    moveContactToStage(contactId, newStage);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DragDropContext
      onDragStart={() => {
        clearLongPressTimer();
        touchStartRef.current = null;
        setOpenMenuContactId(null);
      }}
      onDragEnd={handleDragEnd}
    >
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
                          <DropdownMenu
                            open={openMenuContactId === contact.id}
                            onOpenChange={(open) =>
                              setOpenMenuContactId(open ? contact.id : null)
                            }
                          >
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="relative"
                              onContextMenu={(event) => {
                                event.preventDefault();
                                clearLongPressTimer();
                                setOpenMenuContactId(contact.id);
                              }}
                              onPointerDown={(event) => {
                                if (event.pointerType !== "touch") return;
                                clearLongPressTimer();
                                touchStartRef.current = {
                                  x: event.clientX,
                                  y: event.clientY,
                                  contactId: contact.id,
                                };
                                longPressTimerRef.current = setTimeout(() => {
                                  suppressClickContactIdRef.current = contact.id;
                                  setOpenMenuContactId(contact.id);
                                }, 500);
                              }}
                              onPointerUp={() => {
                                clearLongPressTimer();
                                touchStartRef.current = null;
                              }}
                              onPointerCancel={() => {
                                clearLongPressTimer();
                                touchStartRef.current = null;
                              }}
                              onPointerMove={(event) => {
                                if (event.pointerType !== "touch") return;
                                if (touchStartRef.current?.contactId !== contact.id) return;

                                const deltaX = Math.abs(event.clientX - touchStartRef.current.x);
                                const deltaY = Math.abs(event.clientY - touchStartRef.current.y);
                                if (deltaX > 8 || deltaY > 8) clearLongPressTimer();
                              }}
                              onClickCapture={(event) => {
                                if (suppressClickContactIdRef.current !== contact.id) return;
                                event.preventDefault();
                                event.stopPropagation();
                                suppressClickContactIdRef.current = null;
                              }}
                            >
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  aria-hidden="true"
                                  className="pointer-events-none absolute h-0 w-0 opacity-0"
                                />
                              </DropdownMenuTrigger>
                              <PipelineCard
                                contact={contact}
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                            <DropdownMenuContent align="start" className="w-56">
                              <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {PIPELINE_STAGES.map((stageOption) => (
                                <DropdownMenuItem
                                  key={`${contact.id}-${stageOption}`}
                                  disabled={
                                    stageOption === contact.stage ||
                                    isPending ||
                                    snapshot.isDragging
                                  }
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    setOpenMenuContactId(null);
                                    if (stageOption === contact.stage) return;
                                    moveContactToStage(contact.id, stageOption);
                                  }}
                                >
                                  {PIPELINE_STAGE_LABELS[stageOption]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
