# EduFlow — School Management SaaS

A multi-school management platform for private school groups: students, teachers, classes, attendance, fees, exams, timetable, homework, admissions and more. Built with Next.js, Postgres (via Drizzle ORM) and Better Auth sign-in (web and mobile).

The UI started as a Google Stitch design export (kept for reference in [`stitch_eduflow_design_system_shell/`](./stitch_eduflow_design_system_shell)).

## Getting started

You need Node.js and a Postgres database (Supabase or any other Postgres works).

```bash
npm install
cp .env.example .env.local     # then set DATABASE_URL and BETTER_AUTH_SECRET
npm run db:migrate             # create the tables
npm run db:seed                # load the demo data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with one of the demo accounts below.

## Demo data

`npm run db:seed` loads one school ("EduFlow Academy") with three campuses, 14 teachers, 11 classes and ~100 students, plus activity behind every screen: about 8 weeks of attendance, a few months of fee invoices and payments (paid, partial and overdue), exams with marks, a published timetable, homework with submissions, classwork, syllabus, admission inquiries, leave requests and announcements. Finance also has expenses (a few awaiting approval, one rejected), recurring bills (one overdue, two due this week), salaries for every teacher and four support staff, and three months of payroll (the latest with an unpaid-leave deduction and two salaries still to pay).

- It produces the same data every time, but dates are counted back from the day you run it, so dashboards always show "today" and "this month".
- It refuses to run on a database that already has data. To wipe **every table** and start fresh, run `npm run db:reset`. Development databases only.

There is exactly one login per role, all with the password `Password123!` (also listed on the login page):

| Role | Email | Notes |
|---|---|---|
| Platform Admin | platform@eduflow.dev | Manages schools |
| School Owner | owner@eduflow.dev | |
| School Admin | admin@eduflow.dev | |
| Campus Admin | campus.admin@eduflow.dev | Clifton Campus only |
| Accountant | accountant@eduflow.dev | |
| Teacher | teacher@eduflow.dev | Ayesha Khan, class teacher of Grade 1-A (Main) |
| Parent | parent@eduflow.dev | Two children: Ahmed Raza (Grade 1-A) and Ayaan Raza (Grade 5-A) |
| Receptionist *(custom role)* | reception@eduflow.dev | Dashboard, Admissions, Students, Announcements |
| Exam Coordinator *(custom role)* | exams@eduflow.dev | Exams and results, syllabus, timetable, reports |
| Clifton Front Desk *(custom role)* | frontdesk@eduflow.dev | Based on Campus Admin — Clifton Campus only |

The seed also fills in recent features: student religion, B-Form, medical notes and guardians, and a few weeks of Audit Log history.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Postgres** + **Drizzle ORM** (migrations in `drizzle/migrations`)
- **Better Auth** — database sessions (revocable, per device), cookie for the web app, bearer token for the mobile app (see [docs/mobile-api.md](docs/mobile-api.md))
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
    api/           — Better Auth endpoints (/api/auth/*), mobile API (/api/v1/*), authenticated file downloads
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

**Finance.** Fees (money in), Expenses and recurring bills (money out, with an approval step: entries by someone without "Approve Expenses" wait for an approver), Salaries (monthly payroll that copies each person's salary into a payslip, deducts approved *unpaid* leave, can be adjusted while a draft, then is finalized and marked paid), and Income & Expenses (fee income against approved expenses and paid salaries, by month and campus, counted when money is received or paid).

**Sign-in.** `src/auth.ts` (Better Auth). Passwords are bcrypt hashes on `users`; our own sign-in endpoint (`POST /api/auth/sign-in/password`) applies the per-account lockout and per-IP limits (`lib/login-throttle.ts`). Each signed-in browser or phone is a row in `auth_sessions`, so My Account can list and sign out devices, and changing or resetting a password signs out the others. "Forgot password?" emails a one-time link (needs `RESEND_API_KEY`; see `.env.example`).

**Access control.** Every service call checks who is signed in, whether their role has the permission (per-school roles in `school_roles` / `school_role_permissions`, editable in Settings → Users & Roles; see `lib/authorization.ts`), and which campuses they can touch (`services/scope.ts`). A Campus Admin only ever sees their own campus. The top bar's campus switcher only narrows the overview lists; it never widens what a role can access.

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
