/**
 * src/server/actions/import.ts
 *
 * Server action for bulk CSV contact import.
 *
 * The client parses the CSV with PapaParse, maps the columns, and sends
 * an array of row objects here. This action validates and creates contacts.
 *
 * Returns a summary: { created, skipped, errors }.
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/session";
import type { ActionResult } from "@/types";
import type { ContactSource, ContactStage } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportContactRow {
  firstName?: string;
  lastName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  altPhone?: string;
  city?: string;
  state?: string;
  zip?: string;
  source?: string;
  stage?: string;
  notes?: string;
  nextFollowUpAt?: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_SOURCES: ContactSource[] = [
  "WEBSITE_FORM", "PHONE_CALL", "REFERRAL", "FACEBOOK",
  "INSTAGRAM", "GOOGLE", "IN_PERSON", "REPEAT_CUSTOMER", "OTHER",
];

const VALID_STAGES: ContactStage[] = [
  "NEW_LEAD", "CONTACTED", "QUOTE_REQUESTED", "QUOTE_SENT",
  "WAITING_ON_RESPONSE", "FOLLOW_UP_NEEDED", "BOOKED",
  "IN_PROGRESS", "COMPLETED", "LOST",
];

function parseSource(val: string | undefined): ContactSource {
  if (!val) return "OTHER";
  const upper = val.toUpperCase().replace(/\s+/g, "_") as ContactSource;
  return VALID_SOURCES.includes(upper) ? upper : "OTHER";
}

function parseStage(val: string | undefined): ContactStage {
  if (!val) return "NEW_LEAD";
  const upper = val.toUpperCase().replace(/\s+/g, "_") as ContactStage;
  return VALID_STAGES.includes(upper) ? upper : "NEW_LEAD";
}

// ---------------------------------------------------------------------------
// importContacts
// ---------------------------------------------------------------------------

export async function importContacts(
  rows: ImportContactRow[]
): Promise<ActionResult<ImportResult>> {
  const auth = await requireAuthForAction();
  if (!auth.success) return auth;

  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: "No rows to import." };
  }

  if (rows.length > 1000) {
    return { success: false, error: "Maximum 1,000 contacts per import." };
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-based, +1 for header row

    const firstName = row.firstName?.trim();
    const lastName = row.lastName?.trim();

    // Require at least a first name
    if (!firstName) {
      skipped++;
      if (errors.length < 10) {
        errors.push(`Row ${rowNum}: skipped — firstName is required`);
      }
      continue;
    }

    // Parse next follow-up date
    let nextFollowUpAt: Date | undefined;
    if (row.nextFollowUpAt) {
      const d = new Date(row.nextFollowUpAt);
      if (!isNaN(d.getTime())) nextFollowUpAt = d;
    }

    const displayName = [firstName, lastName].filter(Boolean).join(" ");

    try {
      await db.contact.create({
        data: {
          firstName,
          lastName: lastName ?? "",
          displayName,
          businessName: row.businessName?.trim() || null,
          email: row.email?.trim().toLowerCase() || null,
          phone: row.phone?.trim() || null,
          altPhone: row.altPhone?.trim() || null,
          city: row.city?.trim() || null,
          state: row.state?.trim() || null,
          zip: row.zip?.trim() || null,
          source: parseSource(row.source),
          stage: parseStage(row.stage),
          notes: row.notes?.trim() || null,
          nextFollowUpAt: nextFollowUpAt ?? null,
          type: "LEAD",
          status: "ACTIVE",
          createdById: auth.user.id,
        },
      });
      created++;
    } catch {
      skipped++;
      if (errors.length < 10) {
        errors.push(`Row ${rowNum}: failed to create contact "${displayName}"`);
      }
    }
  }

  revalidatePath("/contacts");

  return { success: true, data: { created, skipped, errors } };
}
