/**
 * src/features/appointments/components/appointment-form.tsx
 *
 * AppointmentForm — shared form for creating and editing appointments.
 *
 * Used inside CreateAppointmentDialog (new) and a future edit dialog.
 * Calls createAppointment or updateAppointment server actions on submit.
 *
 * Props:
 *   appointment     — When provided, the form pre-fills in edit mode.
 *   users           — Active users for the "Assigned to" dropdown.
 *   contacts        — Contact list for the contact picker dropdown.
 *   defaultContactId — Pre-select and lock the contact field.
 *   onSuccess       — Called after a successful save (used to close the dialog).
 */

"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { appointmentFormSchema, type AppointmentFormInput, type AppointmentFormValues } from "@/lib/validations/appointments";
import { createAppointment, updateAppointment } from "@/server/actions/appointments";
import { APPOINTMENT_TYPE_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppointmentType, AppointmentStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppointmentFormAppt {
  id: string;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  notes: string | null;
  assignedUserId: string | null;
  contactId: string;
}

interface AppointmentFormUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface AppointmentFormContact {
  id: string;
  displayName: string;
}

interface AppointmentFormProps {
  appointment?: AppointmentFormAppt;
  users?: AppointmentFormUser[];
  contacts?: AppointmentFormContact[];
  defaultContactId?: string;
  onSuccess?: () => void;
}

// Converts a Date to "YYYY-MM-DDTHH:MM" for datetime-local input
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// AppointmentForm
// ---------------------------------------------------------------------------

export function AppointmentForm({
  appointment,
  users = [],
  contacts = [],
  defaultContactId,
  onSuccess,
}: AppointmentFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!appointment;

  // Default startAt: next full hour from now
  const defaultStart = new Date();
  defaultStart.setHours(defaultStart.getHours() + 1, 0, 0, 0);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      title: appointment?.title ?? "",
      type: appointment?.type ?? "SERVICE_APPOINTMENT",
      status: appointment?.status ?? "SCHEDULED",
      startAt: appointment?.startAt ? toDatetimeLocal(appointment.startAt) : toDatetimeLocal(defaultStart),
      endAt: appointment?.endAt ? toDatetimeLocal(appointment.endAt) : "",
      location: appointment?.location ?? "",
      notes: appointment?.notes ?? "",
      assignedUserId: appointment?.assignedUserId ?? "",
      contactId: appointment?.contactId ?? defaultContactId ?? "",
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  function onSubmit(data: AppointmentFormValues) {
    // zodResolver transforms the values (strings → Dates) before calling here,
    // so we cast to the output type for the server action.
    const transformed = data as unknown as AppointmentFormInput;
    startTransition(async () => {
      const result = isEditing
        ? await updateAppointment(appointment!.id, transformed)
        : await createAppointment(transformed);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEditing ? "Appointment updated." : "Appointment scheduled.");
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="appt-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="appt-title"
          placeholder="Spring lawn care — initial visit"
          autoFocus
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Type + Status row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="appt-type">Type</Label>
          <Select
            value={watch("type")}
            onValueChange={(v) => setValue("type", v as AppointmentType, { shouldValidate: true })}
          >
            <SelectTrigger id="appt-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPOINTMENT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="appt-assigned">Assigned to</Label>
          <Select
            value={watch("assignedUserId") ?? ""}
            onValueChange={(v) => setValue("assignedUserId", v || undefined, { shouldValidate: true })}
          >
            <SelectTrigger id="appt-assigned">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name ?? u.email ?? u.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Start + End date/time row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="appt-start">
            Start <span className="text-destructive">*</span>
          </Label>
          <Input
            id="appt-start"
            type="datetime-local"
            {...register("startAt")}
          />
          {errors.startAt && (
            <p className="text-xs text-destructive">{errors.startAt.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="appt-end">End (optional)</Label>
          <Input
            id="appt-end"
            type="datetime-local"
            {...register("endAt")}
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label htmlFor="appt-location">Location (optional)</Label>
        <Input
          id="appt-location"
          placeholder="123 Main St, Austin, TX"
          {...register("location")}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="appt-notes">Notes (optional)</Label>
        <Textarea
          id="appt-notes"
          placeholder="Any details about this appointment…"
          rows={2}
          {...register("notes")}
        />
      </div>

      {/* Contact — only show when not locked in */}
      {!defaultContactId && contacts.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="appt-contact">
            Contact <span className="text-destructive">*</span>
          </Label>
          <Select
            value={watch("contactId") ?? ""}
            onValueChange={(v) => setValue("contactId", v, { shouldValidate: true })}
          >
            <SelectTrigger id="appt-contact">
              <SelectValue placeholder="Select a contact" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.contactId && (
            <p className="text-xs text-destructive">{errors.contactId.message}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEditing ? "Saving…" : "Scheduling…"
            : isEditing ? "Save changes" : "Schedule appointment"}
        </Button>
      </div>
    </form>
  );
}
