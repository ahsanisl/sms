# EduFlow — School Management SaaS

A multi-school management platform for private school groups: students, teachers, classes, attendance, fees, exams, timetable, homework, admissions and more. Built with Next.js, Postgres (via Drizzle ORM) and Auth.js email/password login.

The UI started as a Google Stitch design export (kept for reference in [`stitch_eduflow_design_system_shell/`](./stitch_eduflow_design_system_shell)).

## Getting started

You need Node.js and a Postgres database (Supabase or any other Postgres works).

```bash
npm install
cp .env.example .env.local     # then set DATABASE_URL and AUTH_SECRET
npm run db:migrate             # create the tables
npm run db:seed                # load the demo data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with one of the demo accounts below.

## Demo data

`npm run db:seed` loads one school ("EduFlow Academy") with three campuses, 14 teachers, 11 classes and ~100 students, plus activity behind every screen: about 8 weeks of attendance, a few months of fee invoices and payments (paid, partial and overdue), exams with marks, a published timetable, homework with submissions, classwork, syllabus, admission inquiries, leave requests and announcements.

- It produces the same data every time, but dates are counted back from the day you run it, so dashboards always show "today" and "this month".
- It refuses to run on a database that already has data. To wipe **every table** and start fresh, run `npm run db:reset`. Development databases only.

All demo accounts use the password `Password123!`:

| Role | Email | Notes |
|---|---|---|
| Platform Admin | platform@eduflow.dev | Manages schools |
| School Owner | owner@eduflow.dev | |
| School Admin | admin@eduflow.dev | |
| Campus Admin | campus.admin@eduflow.dev | Clifton Campus only |
| Accountant | accountant@eduflow.dev | |
| Teacher | teacher@eduflow.dev | Ayesha Khan, class teacher of Grade 1-A (Main) |
| Parent | parent@eduflow.dev | Two children: Ahmed Raza (Grade 1-A) and Ayaan Raza (Grade 5-A) |

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Postgres** + **Drizzle ORM** (migrations in `drizzle/migrations`)
- **Auth.js** (next-auth v5) credentials login, JWT sessions
- **Tailwind CSS v4** — design tokens ported from the Stitch export (`src/app/globals.css`)
- **Radix UI primitives**, **Lucide icons**, **Recharts**

## Architecture

```
src/
  app/
    (auth)/        — login / forgot-password
    (onboarding)/  — first-run setup wizard for a new school's owner
    (app)/...      — every signed-in route; each page.tsx loads data on the server,
                     each *-client.tsx renders it, each actions.ts handles form submits
    api/           — Auth.js handler, authenticated file downloads, permissions for the client
  services/        — business logic + authorization (every function takes the session)
  repositories/    — database queries (the only code that talks to Drizzle)
  db/              — schema, migration runner, seed script
  components/      — ui/ primitives, shared/ building blocks, layout/, feature forms
  lib/
    tenancy.ts, authorization.ts — session + role-permission checks (server-only)
    constants.ts   — fixed reference values and labels (grades, statuses, defaults)
    validation/    — zod schemas for every form input
    storage/       — file storage for attachments (local disk by default)
  proxy.ts         — redirects signed-out requests to /login
```

**Access control.** Every service call checks who is signed in, whether their role has the permission (the `role_permissions` table, editable in Settings → Users & Roles), and which campuses they can touch (`services/scope.ts`). A Campus Admin only ever sees their own campus. The top bar's campus switcher only narrows the overview lists; it never widens what a role can access.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm start` — production build and server
- `npm run lint` — ESLint
- `npm run db:generate` — generate a migration after changing `src/db/schema`
- `npm run db:migrate` — apply migrations
- `npm run db:seed` — load demo data into an empty database (dev only — demo accounts share a public password)
- `npm run db:reset` — empty every table, then load demo data (dev only)
- `npm run db:bootstrap -- --email you@yourcompany.com --name "Your Name"` — **production:** create the first Platform Admin on a freshly migrated database (one-time; prints a temporary password)
- `npm run db:studio` — browse the database in Drizzle Studio

`db:seed` and `db:reset` refuse to run when `NODE_ENV=production`, and against any database not on `localhost` unless you add `-- --confirm=<host>/<database>`. Going live? See [docs/go-live-checklist.md](docs/go-live-checklist.md).
