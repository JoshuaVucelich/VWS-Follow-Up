/**
 * src/types/index.ts
 *
 * Shared TypeScript type definitions for VWS FollowUp.
 *
 * This file re-exports and extends Prisma-generated types with
 * application-level types that are used across multiple features.
 *
 * Organization:
 *   - Re-exports from Prisma for convenience (avoids deep imports)
 *   - Extended types (Prisma models + relations)
 *   - UI-specific types (form state, filter state, etc.)
 *   - Utility types
 *
 * Keep this file focused on truly shared types. Feature-specific types
 * should live in their respective feature directories.
 */

// Re-export enums from Prisma for use in the app layer.
// This way, features import from "@/types" rather than "@prisma/client".
export {
  UserRole,
  ContactStage,
  ContactType,
  ContactStatus,
  ContactSource,
  TaskStatus,
  TaskPriority,
  NoteType,
  QuoteStatus,
  AppointmentType,
  AppointmentStatus,
} from "@prisma/client";

// Re-export Prisma model types
export type {
  User,
  Contact,
  Task,
  Note,
  Quote,
  Appointment,
  Activity,
  Tag,
  BusinessSettings,
} from "@prisma/client";

// =============================================================================
// EXTENDED MODEL TYPES
// (Prisma models + frequently joined relations)
// =============================================================================

import type {
  User,
  Contact,
  Task,
  Note,
  Quote,
  Appointment,
  Tag,
  ContactTag,
  Activity,
} from "@prisma/client";

/**
 * A Contact with its tags and assigned user pre-loaded.
 * Used in the contacts list and pipeline board.
 */
export type ContactWithRelations = Contact & {
  tags: (ContactTag & { tag: Tag })[];
  assignedUser: Pick<User, "id" | "name" | "image"> | null;
  _count?: {
    tasks: number;
    quotes: number;
    appointments: number;
  };
};

/**
 * A Task with its related contact and assigned user.
 * Used in task lists and dashboard widgets.
 */
export type TaskWithRelations = Task & {
  contact: Pick<Contact, "id" | "displayName" | "phone"> | null;
  assignedUser: Pick<User, "id" | "name"> | null;
};

/**
 * A Quote with its related contact.
 * Used in quote lists and the contact detail page.
 */
export type QuoteWithContact = Quote & {
  contact: Pick<Contact, "id" | "displayName">;
  createdBy: Pick<User, "id" | "name"> | null;
};

/**
 * An Appointment with its related contact and assigned user.
 */
export type AppointmentWithRelations = Appointment & {
  contact: Pick<Contact, "id" | "displayName" | "phone">;
  assignedUser: Pick<User, "id" | "name"> | null;
};

/**
 * A Note with its author.
 */
export type NoteWithAuthor = Note & {
  author: Pick<User, "id" | "name" | "image"> | null;
};

/**
 * An Activity with its triggering user.
 */
export type ActivityWithUser = Activity & {
  user: Pick<User, "id" | "name" | "image"> | null;
};

// =============================================================================
// PAGINATION
// =============================================================================

/**
 * Standard pagination parameters for list queries.
 */
export interface PaginationParams {
  page: number;
  perPage: number;
}

/**
 * Standard paginated response wrapper.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

/**
 * Filter parameters for the contacts list query.
 * All fields are optional — omitting a field means no filter applied.
 */
export interface ContactFilters {
  search?: string;
  stage?: import("@prisma/client").ContactStage[];
  type?: import("@prisma/client").ContactType;
  source?: import("@prisma/client").ContactSource;
  assignedUserId?: string;
  tagIds?: string[];
  archived?: boolean;
  /** Show only contacts with a follow-up due on or before this date */
  followUpBefore?: Date;
}

/**
 * Filter parameters for the tasks list query.
 */
export interface TaskFilters {
  search?: string;
  status?: import("@prisma/client").TaskStatus[];
  priority?: import("@prisma/client").TaskPriority[];
  assignedUserId?: string;
  contactId?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  overdue?: boolean;
}

/**
 * Filter parameters for the quotes list query.
 */
export interface QuoteFilters {
  search?: string;
  status?: import("@prisma/client").QuoteStatus[];
  contactId?: string;
  followUpBefore?: Date;
}

// =============================================================================
// SERVER ACTION RESULT
// =============================================================================

/**
 * Standard return type for all server actions.
 *
 * Every action returns either a success result or an error result.
 * Components should check `result.success` before accessing `result.data`.
 *
 * @example
 *   const result = await createContact(formData);
 *   if (!result.success) {
 *     toast.error(result.error);
 *     return;
 *   }
 *   router.push(`/contacts/${result.data.id}`);
 */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// =============================================================================
// UI TYPES
// =============================================================================

/**
 * A generic option for select inputs and dropdowns.
 */
export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}
