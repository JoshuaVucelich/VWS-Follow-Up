# Contributing to VWS FollowUp

Thank you for your interest in contributing. This document explains how to contribute effectively to the project.

---

## Before you start

- For small bug fixes or typos, just open a PR — no need to file an issue first.
- For larger features or changes to the architecture, please **open an issue first** to discuss the approach. This prevents wasted effort if the direction doesn't align.
- Check the [open issues](https://github.com/your-org/vws-followup/issues) to see if someone is already working on what you have in mind.

---

## Getting the project running locally

See [README.md](README.md) for full local setup instructions.

```bash
git clone https://github.com/your-org/vws-followup.git
cd vws-followup
npm install
cp .env.example .env
# Edit .env with your database details
docker compose up db -d
npm run db:migrate
npm run db:seed
npm run dev
```

---

## How to contribute

### 1. Fork and clone

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/vws-followup.git
```

### 2. Create a branch

Use a descriptive branch name that follows this pattern:

```
type/short-description
```

Examples:
```
feature/contact-import-csv
fix/overdue-tasks-date-comparison
docs/update-deployment-guide
chore/upgrade-prisma
```

Types:
- `feature/` — new feature or functionality
- `fix/` — bug fix
- `docs/` — documentation only
- `chore/` — build, tooling, dependency updates
- `refactor/` — code changes with no behavior change
- `test/` — tests only

### 3. Make your changes

- Follow the code standards below
- Add tests for new features if applicable
- Update documentation if your change requires it

### 4. Commit your changes

Write clear, concise commit messages. Use the imperative mood:

```
Good:  "Add CSV contact import"
Good:  "Fix overdue task count on dashboard"
Bad:   "Fixed stuff"
Bad:   "Added the import thing"
```

If your commit references an issue, include it:
```
Fix overdue task count on dashboard (#42)
```

### 5. Open a pull request

- Fill out the PR description with what you changed and why
- Link any related issues
- Keep PRs focused — one feature or fix per PR is easier to review
- Make sure `npm run lint` and `npm run typecheck` pass before opening

---

## Code standards

### TypeScript

- **Strict mode is on** — no `any` unless absolutely necessary and commented
- Prefer explicit types for function return values
- Use Zod for all input validation (forms, API routes)
- Keep types in `src/types/index.ts` or co-located with their feature

### Components

- Server components by default — only add `"use client"` when the component actually needs it
- Keep the "use client" boundary as narrow as possible
- One component per file
- Name files in `kebab-case`, name components in `PascalCase`
- Co-locate feature components in `src/features/<feature>/components/`
- Shared primitives go in `src/components/ui/`

### File naming

- Pages: `page.tsx`
- Layouts: `layout.tsx`
- Components: `my-component.tsx`
- Server actions: `src/server/actions/<feature>.ts`
- Database queries: `src/server/queries/<feature>.ts`

### Styling

- Use Tailwind CSS classes — no inline styles, no CSS modules
- Follow the existing color system (CSS variables, not hardcoded hex)
- Use `cn()` from `@/lib/utils` for conditional classes
- Keep components responsive — test on mobile

### Server actions

- Always validate input with Zod before touching the database
- Return `ActionResult<T>` from `@/types` (success/error union)
- Check authorization before performing any mutation
- Log important mutations to the audit log table

### Database

- All schema changes must go through a Prisma migration — never edit the database directly
- Never select `*` — always specify the fields you need
- Add appropriate indexes for frequently filtered/sorted columns (check the schema for examples)
- Avoid N+1 queries — use Prisma's `include` or `select` to load relations in one query

---

## Issue labels

| Label | Meaning |
|---|---|
| `good first issue` | Good for newcomers |
| `bug` | Something is broken |
| `feature` | New functionality |
| `documentation` | Docs improvement |
| `help wanted` | We'd love contribution here |
| `milestone:1` through `milestone:6` | Which milestone this belongs to |

---

## Questions?

Open a [GitHub Discussion](https://github.com/your-org/vws-followup/discussions) for questions, ideas, or general conversation about the project.

For bug reports, use [GitHub Issues](https://github.com/your-org/vws-followup/issues).
