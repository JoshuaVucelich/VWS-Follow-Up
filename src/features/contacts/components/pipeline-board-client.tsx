/**
 * src/features/contacts/components/pipeline-board-client.tsx
 *
 * PipelineBoardClient — interactive kanban board with grouped columns.
 *
 * Key behaviors:
 *   - Groups 10 backend stages into 7 visual columns.
 *   - Supports drag-and-drop between columns.
 *   - Supports in-column stage toggles for grouped columns.
 *   - Keeps optimistic local state with rollback on server failure.
 *   - Adds a larger desktop horizontal scrollbar above the board.
 */

"use client";

import { useState, useMemo, useRef, useTransition, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import type { ContactStage } from "@prisma/client";
import type { PipelineContact } from "@/server/queries/contacts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineBoardClientProps {
  contacts: PipelineContact[];
}

interface PipelineColumn {
  id: string;
  label: string;
  stages: ContactStage[];
  defaultStage: ContactStage;
  colorClass: string;
}

// ---------------------------------------------------------------------------
// Visual columns (grouped)
// ---------------------------------------------------------------------------

const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: "NEW_LEAD",
    label: PIPELINE_STAGE_LABELS.NEW_LEAD,
    stages: ["NEW_LEAD"],
    defaultStage: "NEW_LEAD",
    colorClass: "bg-blue-500",
  },
  {
    id: "CONTACTED",
    label: PIPELINE_STAGE_LABELS.CONTACTED,
    stages: ["CONTACTED"],
    defaultStage: "CONTACTED",
    colorClass: "bg-violet-500",
  },
  {
    id: "QUOTE",
    label: "Quote",
    stages: ["QUOTE_REQUESTED", "QUOTE_SENT"],
    defaultStage: "QUOTE_REQUESTED",
    colorClass: "bg-amber-500",
  },
  {
    id: "RESPONSE",
    label: "Response / Follow-Up",
    stages: ["WAITING_ON_RESPONSE", "FOLLOW_UP_NEEDED"],
    defaultStage: "WAITING_ON_RESPONSE",
    colorClass: "bg-orange-500",
  },
  {
    id: "BOOKED_PROGRESS",
    label: "Booked / In Progress",
    stages: ["BOOKED", "IN_PROGRESS"],
    defaultStage: "BOOKED",
    colorClass: "bg-emerald-500",
  },
  {
    id: "COMPLETED",
    label: PIPELINE_STAGE_LABELS.COMPLETED,
    stages: ["COMPLETED"],
    defaultStage: "COMPLETED",
    colorClass: "bg-green-600",
  },
  {
    id: "LOST",
    label: PIPELINE_STAGE_LABELS.LOST,
    stages: ["LOST"],
    defaultStage: "LOST",
    colorClass: "bg-gray-400",
  },
];

const TOGGLE_STAGE_LABELS: Partial<Record<ContactStage, string>> = {
  QUOTE_REQUESTED: "Requested",
  QUOTE_SENT: "Sent",
  WAITING_ON_RESPONSE: "Waiting",
  FOLLOW_UP_NEEDED: "Follow-Up",
  BOOKED: "Booked",
  IN_PROGRESS: "In Progress",
};

const STAGE_TO_COLUMN_ID: Record<ContactStage, string> =
  PIPELINE_COLUMNS.reduce(
    (acc, column) => {
      for (const stage of column.stages) {
        acc[stage] = column.id;
      }
      return acc;
    },
    {} as Record<ContactStage, string>,
  );

// ---------------------------------------------------------------------------
// PipelineBoardClient
// ---------------------------------------------------------------------------

export function PipelineBoardClient({
  contacts: initialContacts,
}: PipelineBoardClientProps) {
  const [contacts, setContacts] = useState<PipelineContact[]>(initialContacts);
  const [openMenuContactId, setOpenMenuContactId] = useState<string | null>(
    null,
  );
  const [boardContentWidth, setBoardContentWidth] = useState(0);
  const [boardViewportWidth, setBoardViewportWidth] = useState(0);
  const [boardScrollLeft, setBoardScrollLeft] = useState(0);

  // Keep a stable reference to the last confirmed server state for rollback
  const confirmedContacts = useRef<PipelineContact[]>(initialContacts);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{
    x: number;
    y: number;
    contactId: string;
  } | null>(null);
  const suppressClickContactIdRef = useRef<string | null>(null);
  const boardScrollbarRef = useRef<HTMLDivElement | null>(null);
  const boardContentRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();

  const maxScrollLeft = Math.max(0, boardContentWidth - boardViewportWidth);
  const canScrollLeft = boardScrollLeft > 0;
  const canScrollRight = boardScrollLeft < maxScrollLeft;
  const SCROLL_STEP_PX = 292; // One column width (280) + gap (12)

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function updateBoardContentWidth() {
    setBoardContentWidth(boardContentRef.current?.scrollWidth ?? 0);
    const boardEl = boardScrollbarRef.current;
    setBoardViewportWidth(boardEl?.clientWidth ?? 0);
    setBoardScrollLeft(boardEl?.scrollLeft ?? 0);
  }

  function handleSliderScroll(value: number) {
    const boardEl = boardScrollbarRef.current;
    if (!boardEl) return;
    boardEl.scrollTo({ left: value, behavior: "auto" });
    setBoardScrollLeft(value);
  }

  function scrollByColumn(direction: "left" | "right") {
    const boardEl = boardScrollbarRef.current;
    if (!boardEl) return;

    const delta = direction === "left" ? -SCROLL_STEP_PX : SCROLL_STEP_PX;
    const target = Math.max(
      0,
      Math.min(maxScrollLeft, boardEl.scrollLeft + delta),
    );

    boardEl.scrollTo({ left: target, behavior: "smooth" });
  }

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    updateBoardContentWidth();
  }, [contacts]);

  useEffect(() => {
    updateBoardContentWidth();

    const boardEl = boardScrollbarRef.current;
    const handleBoardScroll = () => {
      setBoardScrollLeft(boardEl?.scrollLeft ?? 0);
    };
    boardEl?.addEventListener("scroll", handleBoardScroll, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateBoardContentWidth())
        : null;

    if (resizeObserver && boardContentRef.current) {
      resizeObserver.observe(boardContentRef.current);
    }
    if (resizeObserver && boardScrollbarRef.current) {
      resizeObserver.observe(boardScrollbarRef.current);
    }

    const handleWindowResize = () => updateBoardContentWidth();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      boardEl?.removeEventListener("scroll", handleBoardScroll);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, []);

  // Group contacts into visual columns
  const columns = useMemo(() => {
    const grouped: Record<string, PipelineContact[]> = {};
    for (const column of PIPELINE_COLUMNS) {
      grouped[column.id] = [];
    }

    for (const contact of contacts) {
      const columnId = STAGE_TO_COLUMN_ID[contact.stage];
      if (columnId) {
        grouped[columnId].push(contact);
      }
    }

    return grouped;
  }, [contacts]);

  // -------------------------------------------------------------------------
  // Drag-and-drop and stage update helpers
  // -------------------------------------------------------------------------

  function moveContactToStage(contactId: string, newStage: ContactStage) {
    // Optimistically update local state
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, stage: newStage } : c)),
    );

    // Call server action inside transition
    startTransition(async () => {
      const result = await updateContactStage(contactId, { stage: newStage });

      if (!result.success) {
        toast.error(result.error ?? "Failed to update stage.");
        setContacts(confirmedContacts.current);
      } else {
        confirmedContacts.current = confirmedContacts.current.map((c) =>
          c.id === contactId ? { ...c, stage: newStage } : c,
        );
        toast.success(`Moved to ${PIPELINE_STAGE_LABELS[newStage]}.`);
      }
    });
  }

  function resolveDropStage(droppableId: string): ContactStage | null {
    const targetColumn = PIPELINE_COLUMNS.find(
      (column) => column.id === droppableId,
    );
    return targetColumn?.defaultStage ?? null;
  }

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStage = resolveDropStage(destination.droppableId);
    if (!newStage) return;

    const contact = contacts.find((c) => c.id === draggableId);
    if (!contact || contact.stage === newStage) return;

    moveContactToStage(draggableId, newStage);
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
      <div className="flex h-full flex-col gap-2">
        {/* Always-visible desktop slider for horizontal board navigation */}
        <div className="hidden items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 md:flex">
          <span className="text-xs font-medium text-muted-foreground">
            Scroll pipeline
          </span>
          <input
            type="range"
            min={0}
            max={maxScrollLeft}
            step={1}
            value={Math.min(boardScrollLeft, maxScrollLeft)}
            onChange={(event) =>
              handleSliderScroll(Number(event.currentTarget.value))
            }
            className="h-2 w-full cursor-pointer accent-primary"
            aria-label="Pipeline horizontal slider"
          />
        </div>

        <div className="relative h-full">
          {/* Side arrows (desktop): jump one column at a time */}
          <button
            type="button"
            onClick={() => scrollByColumn("left")}
            disabled={!canScrollLeft}
            className="absolute left-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 shadow-sm backdrop-blur disabled:opacity-40 md:flex"
            aria-label="Scroll left one column"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByColumn("right")}
            disabled={!canScrollRight}
            className="absolute right-1 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 shadow-sm backdrop-blur disabled:opacity-40 md:flex"
            aria-label="Scroll right one column"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Horizontal scroll container for columns */}
          <div
            ref={boardScrollbarRef}
            className="h-full overflow-x-auto pb-4 scrollbar-none"
          >
            <div ref={boardContentRef} className="flex h-full min-w-max gap-3">
              {PIPELINE_COLUMNS.map((column) => {
                const cards = columns[column.id] ?? [];
                const isToggleColumn = column.stages.length > 1;

                return (
                  <div
                    key={column.id}
                    className="flex w-[280px] flex-shrink-0 flex-col rounded-xl border border-border bg-muted/20"
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${column.colorClass}`}
                        />
                        <span className="text-sm font-semibold text-foreground">
                          {column.label}
                        </span>
                      </div>
                      <span className="min-w-[24px] rounded-full bg-muted px-2 py-0.5 text-center text-xs tabular-nums text-muted-foreground">
                        {cards.length}
                      </span>
                    </div>

                    {/* Droppable card list */}
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[80px] flex-1 space-y-2 overflow-y-auto p-2 transition-colors scrollbar-thin ${
                            snapshot.isDraggingOver ? "bg-primary/5" : ""
                          }`}
                        >
                          {cards.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border">
                              <p className="text-xs text-muted-foreground/60">
                                Drop here
                              </p>
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
                                    setOpenMenuContactId(
                                      open ? contact.id : null,
                                    )
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
                                      longPressTimerRef.current = setTimeout(
                                        () => {
                                          suppressClickContactIdRef.current =
                                            contact.id;
                                          setOpenMenuContactId(contact.id);
                                        },
                                        500,
                                      );
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
                                      if (
                                        touchStartRef.current?.contactId !==
                                        contact.id
                                      )
                                        return;

                                      const deltaX = Math.abs(
                                        event.clientX - touchStartRef.current.x,
                                      );
                                      const deltaY = Math.abs(
                                        event.clientY - touchStartRef.current.y,
                                      );
                                      if (deltaX > 8 || deltaY > 8)
                                        clearLongPressTimer();
                                    }}
                                    onClickCapture={(event) => {
                                      if (
                                        suppressClickContactIdRef.current !==
                                        contact.id
                                      )
                                        return;
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

                                    {isToggleColumn && (
                                      <div className="mt-1 rounded-lg border border-border/80 bg-background p-1">
                                        <div className="grid grid-cols-2 gap-1">
                                          {column.stages.map((stageOption) => {
                                            const isCurrent =
                                              contact.stage === stageOption;
                                            const buttonLabel =
                                              TOGGLE_STAGE_LABELS[
                                                stageOption
                                              ] ??
                                              PIPELINE_STAGE_LABELS[
                                                stageOption
                                              ];

                                            return (
                                              <Button
                                                key={`${contact.id}-${stageOption}-toggle`}
                                                type="button"
                                                size="sm"
                                                variant={
                                                  isCurrent
                                                    ? "secondary"
                                                    : "ghost"
                                                }
                                                className="h-6 px-2 text-[10px] font-medium"
                                                disabled={
                                                  isCurrent ||
                                                  isPending ||
                                                  snapshot.isDragging
                                                }
                                                onClick={(event) => {
                                                  event.preventDefault();
                                                  event.stopPropagation();
                                                  if (isCurrent) return;
                                                  moveContactToStage(
                                                    contact.id,
                                                    stageOption,
                                                  );
                                                }}
                                              >
                                                {buttonLabel}
                                              </Button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <DropdownMenuContent
                                    align="start"
                                    className="w-56"
                                  >
                                    <DropdownMenuLabel>
                                      Move to stage
                                    </DropdownMenuLabel>
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
                                          if (stageOption === contact.stage)
                                            return;
                                          moveContactToStage(
                                            contact.id,
                                            stageOption,
                                          );
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
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}
