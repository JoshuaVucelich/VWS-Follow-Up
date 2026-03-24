/**
 * src/features/contacts/components/contact-notes.tsx
 *
 * ContactNotes — notes list and "add note" form for a contact.
 *
 * Shows a reverse-chronological list of notes (call logs, meeting notes,
 * general notes, etc.) with the author's name, note type, and timestamp.
 *
 * The "Add Note" form is a client sub-component that calls the addNote
 * server action without navigating away from the page.
 *
 * Props:
 *   contactId — The contact whose notes to display.
 *   notes     — Pre-fetched notes with author info.
 */

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, Phone, Users, FileText, Calendar, GitBranch } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { addNote } from "@/server/actions/contacts";
import { addNoteSchema, type AddNoteInput } from "@/lib/validations/contacts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NoteType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NoteWithAuthor {
  id: string;
  content: string;
  type: NoteType;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface ContactNotesProps {
  contactId: string;
  notes: NoteWithAuthor[];
}

// ---------------------------------------------------------------------------
// Note type meta
// ---------------------------------------------------------------------------

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  GENERAL: "Note",
  CALL_LOG: "Call log",
  MEETING_NOTE: "Meeting note",
  QUOTE_NOTE: "Quote note",
  APPOINTMENT_NOTE: "Appointment note",
  STATUS_CHANGE: "Status change",
};

const NOTE_TYPE_ICONS: Record<NoteType, React.ElementType> = {
  GENERAL: MessageSquare,
  CALL_LOG: Phone,
  MEETING_NOTE: Users,
  QUOTE_NOTE: FileText,
  APPOINTMENT_NOTE: Calendar,
  STATUS_CHANGE: GitBranch,
};

// ---------------------------------------------------------------------------
// AddNoteForm
// ---------------------------------------------------------------------------

function AddNoteForm({
  contactId,
  onSuccess,
}: {
  contactId: string;
  onSuccess: (note: { id: string; content: string; createdAt: Date }) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<AddNoteInput>({
    resolver: zodResolver(addNoteSchema),
    defaultValues: { content: "", type: "GENERAL" },
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = form;

  function onSubmit(data: AddNoteInput) {
    startTransition(async () => {
      const result = await addNote(contactId, data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Note added.");
      onSuccess(result.data);
      reset();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-1.5">
        <Textarea
          placeholder="Add a note, call log, or meeting summary…"
          rows={3}
          {...register("content")}
          disabled={isPending}
        />
        {errors.content && (
          <p className="text-xs text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="noteType" className="text-xs text-muted-foreground whitespace-nowrap">
            Type:
          </Label>
          <Select
            value={watch("type")}
            onValueChange={(v) => setValue("type", v as NoteType)}
          >
            <SelectTrigger id="noteType" className="h-7 text-xs w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {NOTE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// ContactNotes
// ---------------------------------------------------------------------------

export function ContactNotes({ contactId, notes: initialNotes }: ContactNotesProps) {
  // Optimistically add new notes to the top of the list on success
  const [notes, setNotes] = useState(initialNotes);

  function handleNoteAdded(note: { id: string; content: string; createdAt: Date }) {
    setNotes((prev) => [
      {
        ...note,
        type: "GENERAL" as NoteType,
        author: null,
      },
      ...prev,
    ]);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Notes
          {notes.length > 0 && (
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {notes.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add note form */}
        <AddNoteForm contactId={contactId} onSuccess={handleNoteAdded} />

        {/* Notes list */}
        {notes.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border">
            {notes.map((note) => {
              const Icon = NOTE_TYPE_ICONS[note.type];
              return (
                <div key={note.id} className="flex gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-medium text-foreground">
                        {note.author?.name ?? "Team member"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {NOTE_TYPE_LABELS[note.type]}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatRelativeTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">
                      {note.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {notes.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No notes yet. Add the first one above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
