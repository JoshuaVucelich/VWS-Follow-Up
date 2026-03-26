# VWS FollowUp

**Open-source lead tracking, follow-up management, and lightweight CRM for small service businesses.**

VWS FollowUp helps small businesses stay on top of leads, customers, follow-ups, tasks, quotes, and appointments — all in one clean dashboard. It is designed to be self-hostable, easy to use, and built around the real day-to-day workflow of small teams.

No bloat. No enterprise complexity. Just the tools you actually need.

---

## Who is this for?

Service businesses that need to track leads and follow up consistently without paying for a full CRM:

- Landscapers and lawn care companies
- Pressure washing and exterior cleaning businesses
- Contractors and home service providers
- Photographers
- Cleaning companies
- Consultants and solo operators
- Small teams of 1–10 people

---

## Key Features

- **Dashboard** — see what needs attention today at a glance
- **Contact management** — leads and customers in one unified view
- **Pipeline / Kanban board** — drag contacts through stages
- **Task and reminder system** — track follow-ups, calls, and to-dos
- **Notes and activity timeline** — full history on every contact
- **Quote status tracking** — log estimate status without full invoicing
- **Appointments and jobs** — basic scheduling and job visibility
- **CSV import / export** — bring your data in, take it out
- **QuickBooks integration** — connect a QuickBooks Online company from Settings
- **Team support** — multiple users, role-based access (Owner / Staff)
- **Self-hostable** — Docker, VPS, Railway, DigitalOcean, Vercel, and more

---

## Screenshots

> Screenshots coming once the UI is built. Contributions welcome!

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Language | TypeScript (strict mode) |
| Styling | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Database | PostgreSQL |
| ORM | [Prisma](https://www.prisma.io) |
| Auth | [Auth.js v5](https://authjs.dev) (NextAuth) |
| Forms | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| Notifications | [Sonner](https://sonner.emilkowalski.ski) |

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or Docker)
- npm or pnpm

### 1. Clone the repository

```bash
git clone https://github.com/your-org/vws-followup.git
cd vws-followup
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your database URL and auth secret. See [docs/environment-variables.md](docs/environment-variables.md) for details on every variable.

### 4. Start PostgreSQL

If you have Docker:

```bash
docker compose up db -d
```

Or use an existing PostgreSQL instance and update `DATABASE_URL` in `.env`.

### 5. Run database migrations

```bash
npm run db:migrate
```

### 6. (Optional) Seed sample data

```bash
npm run db:seed
```

This creates sample contacts, tasks, quotes, and appointments so you can explore the app immediately.

Default seed accounts:
| Email | Password | Role |
|---|---|---|
| owner@example.com | password123 | Owner |
| sam@example.com | password123 | Staff |
| jordan@example.com | password123 | Staff |

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

VWS FollowUp is designed to be easy to self-host. See the deployment guides:

- [Docker / docker-compose](docs/docker.md)
- [Full deployment guide](docs/deployment.md)
- [Environment variables reference](docs/environment-variables.md)

---

## Project Structure

```
vws-followup/
├── src/
│   ├── app/               # Next.js App Router pages and layouts
│   │   ├── (auth)/        # Login, register, forgot password
│   │   └── (dashboard)/   # All authenticated pages
│   ├── components/
│   │   ├── ui/            # Base UI primitives (Button, Input, etc.)
│   │   └── layout/        # App shell components (Sidebar, Header)
│   ├── features/          # Feature-specific components and logic
│   │   ├── auth/
│   │   ├── contacts/
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── quotes/
│   │   ├── appointments/
│   │   └── settings/
│   ├── lib/               # Utility functions, Prisma client, constants
│   ├── server/            # Server actions and database queries
│   │   ├── actions/       # Mutating operations (create, update, delete)
│   │   └── queries/       # Read operations
│   └── types/             # Shared TypeScript types
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Development seed data
├── docs/                  # Project documentation
└── public/                # Static assets
```

For architecture details, see [docs/architecture.md](docs/architecture.md).

---

## Development Scripts

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix lint issues
npm run format        # Format code with Prettier
npm run typecheck     # TypeScript type checking

npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:migrate    # Run pending migrations (dev)
npm run db:studio     # Open Prisma Studio (database GUI)
npm run db:seed       # Seed development data
npm run db:reset      # Reset database and re-run migrations + seed
```

---

## Contributing

Contributions are very welcome. VWS FollowUp is an open project and we want it to be genuinely useful for small businesses.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.

Quick summary:
- Open an issue before starting large changes
- Follow the existing code style
- Write clear commit messages
- Keep PRs focused on one thing

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the current milestone plan and future feature ideas.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org) by Vercel
- [shadcn/ui](https://ui.shadcn.com) by shadcn
- [Prisma](https://prisma.io)
- [Tailwind CSS](https://tailwindcss.com)
- [Auth.js](https://authjs.dev)
- [Radix UI](https://radix-ui.com)

---

*VWS FollowUp is a project by [VWS Digital](https://vwsdigital.com).*
