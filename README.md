# EduFlow — School Management SaaS (Frontend Prototype)

A functional Next.js/TypeScript/Tailwind frontend for **EduFlow**, a school management platform for private school groups. This is a **frontend-only prototype**: there is no backend, no database, and no real authentication. All data lives in a typed mock-data layer and a client-side store, seeded with realistic Pakistani school data.

Converted from a Google Stitch design export (kept for reference in [`stitch_eduflow_design_system_shell/`](./stitch_eduflow_design_system_shell)) into reusable React components and wired-up routes.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the login screen. Click any of the four demo account chips (School Admin, Campus Admin, Teacher, Parent) to sign in; no password is checked.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** — design tokens ported from the Stitch export (`src/app/globals.css`)
- **Radix UI primitives** (Dialog, DropdownMenu, Tabs, Checkbox, Label) restyled to the app's own palette, not shadcn's default theme
- **Lucide icons** (mapped from the original Material Symbols names — see `src/lib/icon-map.ts`)
- **Recharts** for dashboard/report charts

## Architecture

```
src/
  app/
    (auth)/login, (auth)/forgot-password        — centered auth screens, no app shell
    (app)/...                                    — every authenticated route, behind AuthGuard + AppShell
  components/
    ui/        — restyled Radix primitives (button, dialog, dropdown-menu, tabs, input, select, ...)
    shared/    — PageHeader, StatCard, DataTable, SearchBar, FilterBar, StatusBadge, ConfirmDialog,
                 EmptyState, FormField, Modal, ChartCard, Avatar, Icon
    layout/    — Sidebar (role-aware nav), Topbar, AppShell, AuthGuard
    students/ teachers/ classes/ fees/ exams/ dashboard/ reports/ — feature-specific components/forms
  lib/
    types.ts              — every domain type (Student, Teacher, ClassSection, AttendanceRecord, ...)
    mock/                  — seed data generators (deterministic, seeded RNG) + lookup helpers
    store/                 — AppDataProvider (Context + useReducer), persisted to localStorage
    auth/session-context.tsx — mock session (role/name/campus), persisted to localStorage
    nav-config.ts, icon-map.ts, typography.ts, format.ts, utils.ts
```

State updates from forms (add/edit a student, mark attendance, record a payment, enter marks, post an announcement, ...) go through `AppDataProvider`'s reducer and persist to `localStorage`, so a demo walkthrough survives a page refresh — but nothing ever leaves the browser.

## Demo accounts

| Role | Email |
|---|---|
| School Admin | admin@eduflow.pk |
| Campus Admin | campus.admin@eduflow.pk |
| Teacher | (shown on the login screen — generated from seed data) |
| Parent | parent@eduflow.pk |

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
