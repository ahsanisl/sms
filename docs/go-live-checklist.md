# EduFlow Go-Live Checklist

Reviewed 2026-11-04 against commit `d956f9f` ("final"); blockers fixed the same day (not yet committed). Type-check, lint and production build pass on Next.js 16.4.5.

Work through the sections in order. **Blockers** were code changes required before launch — all done. **Launch-day setup** is infrastructure and accounts; the rest can follow.

---

## 🔴 Blockers — code changes required before launch ✅ all done

- [x] **Upgrade Next.js 16.3.3 → 16.4.5 and Zod → 4.6.7.**
  Cleared 1 critical and 3 high-severity advisories (including two *unauthenticated remote code execution* issues in Next.js and a Server Actions denial-of-service). `npm audit --omit=dev` now reports **0 vulnerabilities**.
  *Remaining:* 18 moderate advisories in **development-only** tools (esbuild via drizzle-kit, minimatch). They never run in the deployed app; fixing them needs major tool upgrades — revisit later.
- [x] **Safe way to create the first Platform Admin** — new `npm run db:bootstrap`.
  Creates one Platform Admin on a freshly migrated database, generates and prints a temporary password once, and forces a password change at first sign-in. Refuses if a Platform Admin already exists, and tells you to migrate first if the database isn't set up.
- [x] **Guard `db:reset` and `db:seed` against production.**
  Both refuse when `NODE_ENV=production`, and against any database not on `localhost` unless the exact target is typed: `-- --confirm=<host>/<database>`. Local development works as before.
- [x] **Limit sign-in attempts.**
  - Per account (stored in the database): 5 wrong passwords in a row lock the account for 15 minutes — even the right password is refused while locked. A successful sign-in, a password change or an admin reset clears it.
  - Per IP address (in server memory): 20 failed attempts in 15 minutes blocks that address, against guessing across many accounts. Uses the last `X-Forwarded-For` entry, so it can't be dodged by adding fake entries.
  - Unknown emails are checked against a decoy password hash, so response timing doesn't reveal which emails have accounts. Locked users see one generic "too many attempts" message.
  - *Note:* the per-IP counter is per server process — fine for one server; move it to a shared store (e.g. Redis) if you ever run several.
- [x] **Security headers** on every response: HSTS (2 years), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` + `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By` removed.
  *Later:* HSTS `includeSubDomains`/`preload` once every subdomain is HTTPS; a full script Content-Security-Policy (needs per-request nonces).
- [x] **Dashboard month fixed** — now calculated on every request instead of once at server start.

**Verified:** 46 live checks against a production build (headers, lockout and its reset, IP limit and spoofing, every role's pages on Next 16.4.5), plus the bootstrap and guard scripts on a fresh database, and an upgrade from `d956f9f`'s database through the new migration.

## 🟠 Launch-day setup

- [ ] **Commit and deploy** the blocker fixes (currently uncommitted on `main`).
- [ ] **Database:** restore the Supabase project (it was unreachable as of 2026-10-26: "tenant/user not found"), or provision a new Postgres database.
- [ ] **Back up**, then run `npm run db:migrate`. Pending migrations on the existing database: `0004` student profile fields, `0005` per-school roles, `0006` password changes, `0007` sign-in lockout, `0008` expenses, bills and payroll (adds default expense categories and the four new finance permissions to every existing role; custom roles get them switched off). All tested as upgrades with existing data preserved.
- [ ] **Never run `npm run db:seed` or `db:reset` on production** (now blocked, but don't override the guard).
- [ ] **Automatic backups:** enable Supabase point-in-time recovery or daily backups, and test one restore.
- [ ] **Environment variables:** set a fresh random `AUTH_SECRET` (`openssl rand -base64 33`) and `DATABASE_URL` in the hosting environment — never in a committed file. Set `NODE_ENV=production`.
- [ ] **Hosting — decide with uploads in mind.** Homework/classwork attachments are saved to the server's own disk (`storage/uploads`).
  - VPS / always-on server: works as-is. Include `storage/uploads` in backups. Put it behind one reverse proxy (e.g. nginx) that sets `X-Forwarded-For`, so the per-IP sign-in limit sees real addresses.
  - Vercel or other serverless: uploads would be lost and files over ~4.5 MB would fail. Needs an S3-compatible storage driver first.
- [ ] **HTTPS** on the production domain.
- [ ] **Accounts:**
  1. On a **new** database: `npm run db:bootstrap -- --email you@yourcompany.com --name "Your Name"` → sign in with the printed temporary password and choose your own.
  2. Create each school and its Owner (Settings → Schools).
  3. Each Owner adds staff (Settings → Users & Roles) and parent logins (each student's profile). Everyone receives a temporary password and must choose their own at first sign-in.

## 🟡 Check before announcing

- [ ] **Browser walkthrough** of every screen. No visual testing has been done yet: desktop, collapsed sidebar, mobile drawer, and each role's dashboard and menu.
- [ ] **Forced password change:** sign in with a temporary password and confirm you're sent to My Account (server side tested; browser redirect not yet).
- [ ] **Lockout message:** enter a wrong password 5 times and check the "too many attempts" message on the login screen (server side tested).
- [ ] **Realistic data volume** (e.g. 1,000+ students). The Students page makes 2 database queries per student (~2,000 per page load), so it may be slow.
- [ ] **Privacy review.** EduFlow now stores children's medical notes, religion and B-Form numbers, visible to any staff member who can open a student's profile. Confirm that's intended, consider a privacy notice for parents, and check local data-protection requirements.
- [ ] **Finance setup per school:** check the expense categories, add recurring bills, and enter every staff salary (Salaries → Staff Salaries) before running the first payroll. Decide who approves expenses ("Approve Expenses" is on for Owner and School Admin only).
- [ ] **Staff briefing on passwords:** there is no email, so the school office resets passwords from Users & Roles — which also unlocks a locked account.

## 🔵 Soon after launch

- [ ] **Error monitoring** (e.g. Sentry) — none today.
- [ ] **Automated tests** — the project has none; all testing so far used throwaway scripts.
- [ ] **Performance:** batch the Students page's per-student queries; notifications are recomputed every 5 minutes for each signed-in user.
- [ ] **Emailed password resets** — needs an email provider (e.g. Resend or SMTP).
- [ ] **next-auth is a beta** (`5.0.0-beta.32`) — track releases.
- [ ] **Development-only advisories** (18 moderate) — upgrade drizzle-kit and friends when convenient.
- [ ] **Time zone:** "today" is calculated in UTC, so between midnight and 5 a.m. Pakistan time default dates show yesterday. Harmless during school hours.
