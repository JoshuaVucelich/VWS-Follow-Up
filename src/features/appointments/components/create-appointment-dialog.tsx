/**
 * src/features/appointments/components/create-appointment-dialog.tsx
 *
 * CreateAppointmentDialog — modal dialog for scheduling a new appointment.
 *
 * Used on the appointments page header and the contact detail page.
 * Accepts an optional defaultContactId to pre-link the appointment.
 *
 * Props:
 *   users           — Active users for the assignment dropdown.
 *   contacts        — Contact list for the picker (pass [] to hide).
 *   defaultContactId — Pre-selects and locks the contact field.
 *   trigger         — Custom trigger element (defaults to "Schedule Appointment").
 */

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Contact {
  id: string;
  displayName: string;
}

interface CreateAppointmentDialogProps {
  users?: User[];
  contacts?: Contact[];
  defaultContactId?: string;
  trigger?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// CreateAppointmentDialog
// ---------------------------------------------------------------------------

export function CreateAppointmentDialog({
  users = [],
  contacts = [],
  defaultContactId,
  trigger,
}: CreateAppointmentDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Schedule Appointment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
        </DialogHeader>
        <AppointmentForm
          users={users}
          contacts={contacts}
          defaultContactId={defaultContactId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
