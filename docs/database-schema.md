# Database Schema

VWS FollowUp uses PostgreSQL with Prisma as the ORM. The schema is defined in `prisma/schema.prisma`.

---

## Design principles

- **Single workspace per install.** All data belongs to one business. No tenant IDs needed.
- **Unified Contact model.** Leads and customers are the same table, differentiated by `type` and `stage` fields. This avoids complex migrations when a lead converts to a customer.
- **UTC everywhere.** All timestamps are stored in UTC. Timezone conversion happens in the UI layer using the workspace timezone setting.
- **Soft deletes.** Contacts are archived (`archived: true`) rather than hard-deleted. This preserves history and prevents accidental data loss.
- **Activity log.** Important events are auto-logged to the `activities` table for the contact timeline. Separate `audit_logs` table tracks admin/security actions.

---

## Tables

### `users`
Staff accounts that can log into the workspace.

| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | Display name |
| email | String | Unique, used for login |
| emailVerified | DateTime? | Null until email verified |
| passwordHash | String? | bcrypt hash, null for OAuth users |
| image | String? | Profile photo URL |
| role | UserRole | OWNER or STAFF |
| isActive | Boolean | Soft-disable without deleting |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### `accounts` / `sessions` / `verification_tokens`
Auth.js tables for OAuth and session management. Do not modify these manually — Auth.js manages them.

---

### `business_settings`
Global workspace settings. Should always have exactly one row.

| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | |
| businessName | String | Default: "My Business" |
| logoUrl | String? | |
| timezone | String | IANA timezone string |
| primaryColor | String? | Hex for light branding |

---

### `quickbooks_connections`
Workspace-level QuickBooks Online OAuth credentials.

| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| realmId | String | Intuit company realm ID (unique) |
| companyName | String? | Best-effort company display name |
| accessToken | Text | Current OAuth access token |
| refreshToken | Text | OAuth refresh token |
| tokenType | String? | Usually `bearer` |
| scope | String? | Granted OAuth scope |
| accessTokenExpiresAt | DateTime | Access token expiration time |
| refreshTokenExpiresAt | DateTime? | Refresh token expiration if provided |
| connectedByUserId | String? | FK → users (who connected the account) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### `contacts`
The central record. Represents both leads and customers.

| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | |
| firstName | String | |
| lastName | String | |
| businessName | String? | |
| displayName | String | Computed or manually set |
| email | String? | |
| phone | String? | |
| altPhone | String? | |
| addressLine1-2 | String? | |
| city, state, zip | String? | |
| website | String? | |
| quickBooksCustomerId | String? | Linked QuickBooks customer ID |
| source | ContactSource | Where the lead came from |
| stage | ContactStage | Current pipeline position |
| type | ContactType | LEAD or CUSTOMER |
| status | ContactStatus | ACTIVE, ARCHIVED, BLOCKED |
| assignedUserId | String? | FK → users |
| createdById | String? | FK → users |
| lastContactedAt | DateTime? | Last time someone reached out |
| nextFollowUpAt | DateTime? | Drives dashboard follow-up widget |
| customerSinceAt | DateTime? | Set when type becomes CUSTOMER |
| archivedAt | DateTime? | Set when archived |
| notes | String? | Short summary note |

**Indexes:** stage, type, status, assignedUserId, nextFollowUpAt

---

### `tags` / `contact_tags`
Tags for flexible contact categorization. Many-to-many via `contact_tags` join table.

---

### `tasks`
To-dos and reminders, optionally linked to a contact.

| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | |
| title | String | |
| description | String? | |
| dueAt | DateTime? | Used for due-today and overdue queries |
| priority | TaskPriority | LOW, MEDIUM, HIGH, URGENT |
| status | TaskStatus | OPEN, COMPLETED, CANCELED |
| assignedUserId | String? | FK → users |
| contactId | String? | FK → contacts |
| appointmentId | String? | FK → appointments |
| createdById | String? | FK → users |
| completedAt | DateTime? | Set when status → COMPLETED |

---

### `notes`
Text notes attached to a contact. Intended to be append-only (no editing).

| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | |
| contactId | String | FK → contacts |
| authorId | String? | FK → users |
| type | NoteType | GENERAL, CALL_LOG, MEETING_NOTE, etc. |
| content | Text | |

---

### `activities`
Auto-generated timeline events for the contact detail page. Created by server actions, not manually by users.

| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | |
| contactId | String? | FK → contacts |
| userId | String? | Who triggered the event |
| entityType | String | "contact", "task", "quote", etc. |
| entityId | String? | The affected record's ID |
| action | String | e.g., "stage.changed", "task.created" |
| metadata | Json? | Event-specific data (old/new values, etc.) |

---

### `quotes`
Lightweight estimate status tracking.

| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | |
| contactId | String | FK → contacts |
| title | String | |
| amount | Decimal? | Optional dollar amount |
| description | Text? | |
| quickBooksEstimateId | String? | Linked QuickBooks estimate ID |
| quickBooksLastSyncedAt | DateTime? | Last successful QuickBooks sync |
| quickBooksSyncError | Text? | Last QuickBooks sync error, if any |
| status | QuoteStatus | DRAFT through EXPIRED |
| sentAt | DateTime? | When the quote was sent |
| followUpAt | DateTime? | Drives "quotes awaiting" dashboard widget |
| acceptedAt | DateTime? | |
| declinedAt | DateTime? | |

---

### `appointments`
Scheduled visits and jobs.

| Column | Type | Notes |
|---|---|---|
| id | String (cuid) | |
| contactId | String | FK → contacts |
| title | String | |
| type | AppointmentType | ESTIMATE_VISIT, SERVICE_APPOINTMENT, etc. |
| startAt | DateTime | |
| endAt | DateTime? | |
| location | String? | |
| status | AppointmentStatus | SCHEDULED through RESCHEDULED |
| assignedUserId | String? | FK → users |
| notes | Text? | |

---

### `audit_logs`
Security and admin event log. Separate from `activities` (which is for users to see). Used for tracking important system-level changes.

| Column | Type | Notes |
|---|---|---|
| userId | String? | Who performed the action |
| action | String | e.g., "contact.deleted", "user.role_changed" |
| entityType | String | |
| entityId | String? | |
| metadata | Json? | Context data |
| ipAddress | String? | |
| userAgent | String? | |

---

## Enum reference

### ContactStage
`NEW_LEAD` → `CONTACTED` → `QUOTE_REQUESTED` → `QUOTE_SENT` → `WAITING_ON_RESPONSE` → `FOLLOW_UP_NEEDED` → `BOOKED` → `IN_PROGRESS` → `COMPLETED` / `LOST`

### ContactSource
`WEBSITE_FORM`, `PHONE_CALL`, `REFERRAL`, `FACEBOOK`, `INSTAGRAM`, `GOOGLE`, `IN_PERSON`, `REPEAT_CUSTOMER`, `OTHER`

### TaskPriority
`LOW`, `MEDIUM`, `HIGH`, `URGENT`

### QuoteStatus
`DRAFT` → `BEING_PREPARED` → `SENT` → `WAITING_ON_RESPONSE` → `ACCEPTED` / `DECLINED` / `EXPIRED`

### AppointmentStatus
`SCHEDULED` → `CONFIRMED` → `COMPLETED` / `CANCELED` / `RESCHEDULED`

---

## Running migrations

```bash
# Development — creates a migration file and applies it
npm run db:migrate

# Production — applies pending migrations only (no new files)
npm run db:migrate:prod

# Generate Prisma client after schema changes
npm run db:generate

# Open Prisma Studio (visual database browser)
npm run db:studio
```
