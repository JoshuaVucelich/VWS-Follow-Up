# Architecture Overview

This document describes the technical architecture of VWS FollowUp.

---

## High-level overview

VWS FollowUp is a Next.js 14 application using the App Router. It runs as a single self-contained service with a PostgreSQL database.

```
┌─────────────────────────────────────────────────┐
│                 Browser / Client                │
└────────────────────────┬────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────┐
│              Next.js (App Router)               │
│                                                 │
│  ┌──────────────┐    ┌──────────────────────┐   │
│  │  Server      │    │  Server Components   │   │
│  │  Actions     │    │  (data fetching,     │   │
│  │  (mutations) │    │   rendering)         │   │
│  └──────┬───────┘    └──────────┬───────────┘   │
│         │                       │               │
│  ┌──────▼───────────────────────▼───────────┐   │
│  │            Prisma ORM                    │   │
│  └──────────────────────┬───────────────────┘   │
│                         │                       │
└─────────────────────────┼───────────────────────┘
                          │ TCP
┌─────────────────────────▼───────────────────────┐
│                  PostgreSQL                     │
└─────────────────────────────────────────────────┘
```

---

## Directory structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth page group (login, register)
│   │   └── layout.tsx      # Auth layout (centered card)
│   ├── (dashboard)/        # Dashboard page group
│   │   └── layout.tsx      # Dashboard layout (sidebar + header)
│   ├── api/                # API route handlers (minimal usage)
│   ├── layout.tsx          # Root layout (fonts, providers)
│   └── page.tsx            # Root redirect
│
├── components/
│   ├── ui/                 # Base UI primitives (Button, Input, etc.)
│   └── layout/             # App shell (AppSidebar, AppHeader)
│
├── features/               # Feature modules
│   ├── auth/               # Login/register forms and auth utilities
│   ├── contacts/           # Contact management components
│   ├── dashboard/          # Dashboard widgets
│   ├── tasks/              # Task components
│   ├── quotes/             # Quote components
│   ├── appointments/       # Appointment components
│   └── settings/           # Settings forms
│
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── utils.ts            # Shared utilities (cn, formatDate, etc.)
│   ├── constants.ts        # Enum labels, options, shared config
│   └── validations/        # Shared Zod schemas
│
├── server/
│   ├── actions/            # Server actions (mutating operations)
│   └── queries/            # Database queries (read operations)
│
└── types/
    └── index.ts            # Shared TypeScript types and Prisma re-exports
```

---

## Routing

The app uses Next.js App Router with two route groups:

### `(auth)` group
Routes: `/login`, `/register`, `/forgot-password`

These pages render with the centered auth layout and do not include the sidebar.

### `(dashboard)` group
Routes: `/dashboard`, `/contacts`, `/pipeline`, `/tasks`, `/quotes`, `/appointments`, `/settings`

These pages render with the full app shell (sidebar + header) and require authentication.

Middleware (`src/middleware.ts`) enforces authentication at the routing layer. It redirects unauthenticated requests to `/login`.

---

## Data fetching

### Server components (read)

Pages and feature components fetch data directly using Prisma in server components. This keeps data fetching co-located with rendering and eliminates unnecessary API round-trips.

```tsx
// Example: fetching contacts in a server component
import { db } from "@/lib/db";

export async function ContactsTable() {
  const contacts = await db.contact.findMany({
    where: { status: "ACTIVE" },
    include: { assignedUser: true, tags: { include: { tag: true } } },
    orderBy: { nextFollowUpAt: "asc" },
  });
  // ...
}
```

All read queries live in `src/server/queries/` as reusable functions.

### Server actions (write)

Mutations (create, update, delete) use Next.js Server Actions. Actions live in `src/server/actions/` and follow this pattern:

1. Validate input with Zod
2. Check authorization (user role, ownership)
3. Perform database operation
4. Log to audit trail if important
5. Revalidate affected paths with `revalidatePath()`
6. Return `ActionResult<T>` (success/error union)

```tsx
// Example server action
"use server";

export async function createContact(input: unknown): Promise<ActionResult<Contact>> {
  const validated = createContactSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: "Invalid input", fieldErrors: ... };
  }

  const contact = await db.contact.create({ data: validated.data });
  revalidatePath("/contacts");
  return { success: true, data: contact };
}
```

---

## Authentication

Auth.js v5 (NextAuth) handles authentication with the Credentials provider for email/password login.

Session checking happens in:
1. **Middleware** (`src/middleware.ts`) — redirects unauthenticated users at the Edge
2. **Dashboard layout** (`src/app/(dashboard)/layout.tsx`) — server-side session validation
3. **Server actions** — authorization checks before any mutation

Passwords are hashed with bcrypt (cost factor 12) and never stored in plaintext.

---

## Workspace model

VWS FollowUp uses a **single-workspace per installation** model:
- One install = one business
- Multiple staff users share one workspace
- All records (contacts, tasks, quotes, etc.) belong to this workspace

This is intentionally simpler than multi-tenant SaaS. It makes the schema and queries significantly easier to reason about.

---

## Client vs. server components

The app follows Next.js best practices for the server/client split:

**Server by default.** All components are server components unless they need:
- Browser APIs (window, document, localStorage)
- React hooks (useState, useEffect, useContext)
- Event handlers that need client-side state
- Third-party libraries that require the client runtime

**Minimal client surface.** When a component needs to be a client component, the `"use client"` directive is placed as deep in the tree as possible. For example, a page can be a server component that renders data, while only a small interactive sub-component (like a form or dropdown) is a client component.

---

## Error handling

Server actions return a typed `ActionResult<T>` union instead of throwing:

```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
```

Components check `result.success` before accessing `result.data`. Errors are surfaced via Sonner toast notifications or inline form errors.

Unhandled server errors are caught by Next.js error boundaries. Add `error.tsx` files to route segments to customize error UI.

---

## Database

See [database-schema.md](database-schema.md) for the full schema documentation.

Key design decisions:
- Contacts use a single unified model (not separate Lead/Customer tables)
- All timestamps are UTC
- Soft deletes via `archived` boolean (not hard deletes)
- Activities table for auto-generated timeline events
- Audit logs table for security-relevant actions
