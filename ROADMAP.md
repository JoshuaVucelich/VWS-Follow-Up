# VWS FollowUp Roadmap

This document describes the planned development milestones for the public open-source version.

The goal is to ship a focused, polished MVP and then incrementally add features rather than building everything at once.

---

## Current Status

> **Milestone 1 — Foundation: Complete**
> **Milestone 2 — Contacts: Complete**
> **Milestone 3 — Pipeline: Complete**
> **Milestone 4 — Tasks and Notes: Complete**
> **Milestone 5 — Quotes and Appointments: Complete**
> **Milestone 6 — Polish, Import/Export, and Deployment: Complete**

---

## Milestones

### Milestone 1: Foundation ✅

**Goal:** Get the project running end-to-end with auth and navigation.

- [x] Project scaffold (Next.js, TypeScript, Tailwind, shadcn/ui)
- [x] PostgreSQL database schema (Prisma)
- [x] Development seed data
- [x] Base app shell (sidebar, header, layout)
- [x] Auth page layouts (login, register, forgot password, reset password)
- [x] Middleware route protection (Auth.js v5)
- [x] Docker Compose setup
- [x] Documentation (README, CONTRIBUTING, architecture, env vars)
- [x] Auth.js v5 configuration (credentials provider, JWT sessions)
- [x] Password hashing (bcrypt) and user creation server action
- [x] Session management (JWT, SessionProvider, auth() helpers)
- [x] Password reset flow (token generation, SMTP email, token verification)
- [x] User invite flow (token generation, email, acceptInvite action)
- [x] First-user-becomes-owner logic
- [x] Session helper utilities (getCurrentUser, requireOwner, requireAuthForAction)

---

### Milestone 2: Contacts ✅

**Goal:** Full contact management — the core of the app.

- [x] Contact list page (table with search and filters)
- [x] Add contact form
- [x] Edit contact form
- [x] Contact detail page
- [x] Tag creation and assignment
- [x] Assign contacts to users
- [x] Archive / restore contacts
- [x] Contact source tracking
- [x] Next follow-up date setting

---

### Milestone 3: Pipeline ✅

**Goal:** Visual pipeline board and stage management.

- [x] Kanban board with drag-and-drop (hello-pangea/dnd)
- [x] Stage update server action (with optimistic rollback)
- [x] Pipeline filters (user, source, type, search)
- [x] Stage change activity log entry
- [x] Pipeline summary stats (active contacts, new leads, quoted, booked, overdue follow-ups)
- [ ] Bulk stage update (deferred to polish milestone)

---

### Milestone 4: Tasks and Notes ✅

**Goal:** The core follow-up workflow — tasks, notes, activity timeline.

- [x] Task creation (standalone and contact-linked)
- [x] Task list with filters (status, priority, assigned user, overdue)
- [x] Mark task complete / reopen / cancel / delete
- [x] Overdue task detection (visual indicator + filter)
- [x] Dashboard task widgets (tasks due today, overdue follow-ups, stats)
- [x] Note creation (text, call log, meeting note, etc.)
- [x] Activity timeline on contact detail page
- [x] Auto-activity logging for stage changes, task creation, notes

---

### Milestone 5: Quotes and Appointments ✅

**Goal:** Lightweight quote status tracking and job scheduling.

- [x] Quote record creation (standalone and contact-linked)
- [x] Quote status updates (inline on list + contact detail)
- [x] Quote list with filters (status, search) and pagination
- [x] Dashboard quote widget (quotes awaiting response, overdue follow-up highlight)
- [x] Appointment / job creation (standalone and contact-linked)
- [x] Appointment list view with filters (type, status, assigned user, upcoming toggle)
- [x] Dashboard upcoming appointments widget
- [ ] Task linked to appointment (deferred to polish milestone)

---

### Milestone 6: Polish, Import/Export, and Deployment ✅

**Goal:** Make it production-ready for self-hosting.

- [x] CSV contact export (`GET /api/export/contacts`)
- [x] CSV contact import with field mapping (client-side PapaParse + server action)
- [x] CSV task export (`GET /api/export/tasks`)
- [x] CSV quote export (`GET /api/export/quotes`)
- [x] Responsive mobile layout (slide-out nav drawer on small screens)
- [x] Loading states and skeleton screens (all major pages)
- [x] Error boundary components (`error.tsx` for dashboard + root)
- [x] Not-found pages (`not-found.tsx` for dashboard + root)
- [x] Toast notifications for all actions
- [x] Settings page (business name, timezone)
- [x] User profile settings (name, password change)
- [x] Team member management (invite, deactivate, role change)
- [x] Docker production build (multi-stage Dockerfile)
- [x] Deployment documentation (VPS, Railway, Vercel, Coolify — see `docs/deployment.md`)

---

## Future Ideas (Post-MVP)

These are features being considered for future releases or a hosted/premium version. They are not committed for the public open-source MVP.

**Reminders and notifications:**
- Email reminders for overdue tasks and follow-ups
- SMS reminders (via Twilio or similar)
- Browser push notifications

**Calendar and scheduling:**
- Calendar view for appointments
- External calendar sync (Google Calendar, iCal)
- Public booking page

**Advanced features:**
- Recurring jobs / service schedules
- File attachments on contacts and notes
- Custom pipeline stages (configurable from settings)
- Automation rules (e.g., auto-create task when stage changes)
- API access (read/write via REST API)
- Webhooks

**Reporting:**
- Lead source reporting
- Close rate by stage
- Revenue tracking by accepted quotes
- Team performance overview

**Customer-facing:**
- Customer portal (view their quote/appointment status)
- Review request automation

---

## Version history

| Version | Notes |
|---|---|
| 0.1.0 | Foundation milestone — project scaffold and schema |

---

*This roadmap is subject to change based on contributor interest and community feedback.*
