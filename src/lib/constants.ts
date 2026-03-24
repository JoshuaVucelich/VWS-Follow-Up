/**
 * src/lib/constants.ts
 *
 * Application-wide constants for VWS FollowUp.
 *
 * Keep magic strings and shared configuration values here so they have
 * a single definition point. Import from this file instead of duplicating
 * string literals across the codebase.
 */

import type { SelectOption } from "@/types";
import type { ContactStage, ContactSource, TaskPriority, QuoteStatus, AppointmentType, AppointmentStatus } from "@prisma/client";

// =============================================================================
// PIPELINE STAGES
// =============================================================================

/**
 * All pipeline stages in the order they appear on the kanban board.
 * This order also determines the visual left-to-right column order.
 */
export const PIPELINE_STAGES: ContactStage[] = [
  "NEW_LEAD",
  "CONTACTED",
  "QUOTE_REQUESTED",
  "QUOTE_SENT",
  "WAITING_ON_RESPONSE",
  "FOLLOW_UP_NEEDED",
  "BOOKED",
  "IN_PROGRESS",
  "COMPLETED",
  "LOST",
];

export const PIPELINE_STAGE_LABELS: Record<ContactStage, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  QUOTE_REQUESTED: "Quote Requested",
  QUOTE_SENT: "Quote Sent",
  WAITING_ON_RESPONSE: "Waiting on Response",
  FOLLOW_UP_NEEDED: "Follow-Up Needed",
  BOOKED: "Booked",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  LOST: "Lost",
};

/** Which stages count as "active" (not lost or completed) */
export const ACTIVE_STAGES: ContactStage[] = [
  "NEW_LEAD",
  "CONTACTED",
  "QUOTE_REQUESTED",
  "QUOTE_SENT",
  "WAITING_ON_RESPONSE",
  "FOLLOW_UP_NEEDED",
  "BOOKED",
  "IN_PROGRESS",
];

// =============================================================================
// CONTACT SOURCES
// =============================================================================

export const CONTACT_SOURCE_OPTIONS: SelectOption<ContactSource>[] = [
  { label: "Website Form", value: "WEBSITE_FORM" },
  { label: "Phone Call", value: "PHONE_CALL" },
  { label: "Referral", value: "REFERRAL" },
  { label: "Facebook", value: "FACEBOOK" },
  { label: "Instagram", value: "INSTAGRAM" },
  { label: "Google", value: "GOOGLE" },
  { label: "In Person", value: "IN_PERSON" },
  { label: "Repeat Customer", value: "REPEAT_CUSTOMER" },
  { label: "Other", value: "OTHER" },
];

// =============================================================================
// TASK PRIORITIES
// =============================================================================

export const TASK_PRIORITY_OPTIONS: SelectOption<TaskPriority>[] = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

// =============================================================================
// QUOTE STATUSES
// =============================================================================

export const QUOTE_STATUS_OPTIONS: SelectOption<QuoteStatus>[] = [
  { label: "Draft", value: "DRAFT" },
  { label: "Being Prepared", value: "BEING_PREPARED" },
  { label: "Sent", value: "SENT" },
  { label: "Waiting on Response", value: "WAITING_ON_RESPONSE" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Declined", value: "DECLINED" },
  { label: "Expired", value: "EXPIRED" },
];

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  BEING_PREPARED: "bg-blue-100 text-blue-700",
  SENT: "bg-purple-100 text-purple-700",
  WAITING_ON_RESPONSE: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-600",
};

// =============================================================================
// APPOINTMENT TYPES
// =============================================================================

export const APPOINTMENT_STATUS_OPTIONS: SelectOption<AppointmentStatus>[] = [
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Canceled", value: "CANCELED" },
  { label: "Rescheduled", value: "RESCHEDULED" },
];

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELED: "bg-gray-100 text-gray-500",
  RESCHEDULED: "bg-amber-100 text-amber-700",
};

export const APPOINTMENT_TYPE_OPTIONS: SelectOption<AppointmentType>[] = [
  { label: "Estimate Visit", value: "ESTIMATE_VISIT" },
  { label: "Phone Call", value: "PHONE_CALL" },
  { label: "Photo Session", value: "PHOTO_SESSION" },
  { label: "Service Appointment", value: "SERVICE_APPOINTMENT" },
  { label: "Consultation", value: "CONSULTATION" },
  { label: "Installation", value: "INSTALLATION" },
  { label: "Follow-Up Visit", value: "FOLLOW_UP_VISIT" },
  { label: "Other", value: "OTHER" },
];

// =============================================================================
// PAGINATION
// =============================================================================

/** Default number of items per page in all list views */
export const DEFAULT_PAGE_SIZE = 25;

/** Options for the "items per page" dropdown */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// =============================================================================
// IMPORT / EXPORT
// =============================================================================

/**
 * CSV columns for contact export.
 * The order here determines the column order in the exported file.
 */
export const CONTACT_CSV_COLUMNS = [
  "id",
  "firstName",
  "lastName",
  "businessName",
  "email",
  "phone",
  "altPhone",
  "city",
  "state",
  "zip",
  "source",
  "stage",
  "type",
  "assignedUser",
  "nextFollowUpAt",
  "createdAt",
] as const;
