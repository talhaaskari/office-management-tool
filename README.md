# Office Management Tool — Staff Workspace Portal

A free, self-hosted **office management tool** for a production house or small
studio: Google sign-in, role-based access, task board, personal schedule, leave
requests, announcements, anonymous suggestions, daily reports (with PDF export),
a live studio wall, a mascot, and gamification (XP, levels, badges, leaderboard).

Built with **Vite + React 19 + Tailwind CSS**, backed by **Supabase** (Postgres +
Auth + Realtime). No backend server of your own to run. Deploy free on Vercel.

> This is the open-source edition. Your own deployed instance, its Supabase
> project and its data stay private — anyone who deploys a copy gets an empty
> portal of their own.

---

## Features

- **Google-only sign-in** — one login for everyone; the admin approves new
  members (with name, job title and phone) before they can enter.
- **Roles & permissions** — Administrator, Core Team, Staff, plus per-person
  permission toggles.
- **Task board** — cards + table, projects, priorities, progress, due dates,
  notes, and a runaway Delete button that makes you think twice.
- **My Schedule** — week view with due counts and overdue highlights.
- **Leave (chhutti) requests** — file, approve/reject, cancel while pending;
  approved leave shows on the Studio Wall.
- **Live Studio Wall** — TV dashboard: live clock, today's shoots, who's on
  set, who's on leave, next up, announcements ticker, fullscreen Present mode.
- **Mascot "Clappy"** — a clapperboard buddy that reacts to your work, celebrates
  completions and hands out tips.
- **Gamification** — +20 XP per finished task (+10 early-finish bonus),
  +15 per daily report; levels (Rookie → Legend), badges, Crew of the Month,
  and a leaderboard (staff see only their own stats).
- **Announcements** with read tracking, **anonymous suggestion box**,
  **daily reports** (48-hour window) with **PDF download** for admins.
- **Branding & Theme** — upload your logo, pick an accent, force a theme for
  everyone; realtime sync across all devices.

---

## Quick start (local)

```bash
git clone https://github.com/<you>/office-management-tool.git
cd office-management-tool
npm install
cp .env.example .env   # then fill in your Supabase values (see below)
npm run dev
```

Build for production with `npm run build` (output in `dist/`).

---

## Setup (do once per deployment)

### 1. Create a Supabase project

Create a free project at [supabase.com](https://supabase.com), then open
**SQL Editor** and run the files in `supabase/` **in this order**:

| # | File | What it does |
|---|---|---|
| 1 | `schema.sql` | Core tables (profiles, tasks, notes, announcements, suggestions, reports, settings) + RLS |
| 2 | `gmail-auth.sql` | Google-only login, `pending_approvals`, admin helpers |
| 3 | `request-details.sql` | Name/title/phone on the approval request + re-apply rules |
| 4 | `leave-requests.sql` | Leave (chhutti) requests table + policies |
| 5 | `gamification.sql` | XP ledger (`xp_events`) + policies |
| 6 | `branding.sql` | Workspace branding settings |

Each file ends with a small `select` you can run to verify it worked.

### 2. Environment variables

Copy `.env.example` to `.env` and set:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your publishable/anon key>
```

Find both in Supabase: **Dashboard → Settings → API**. Never commit the
real `.env` (it is git-ignored).

### 3. Google sign-in

1. **Google Cloud Console** — create a project, configure the **OAuth consent
   screen** and publish the app, then create an **OAuth client (Web)** with the
   redirect URI exactly:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Providers → Google** — enable it and paste
   the Client ID + Client Secret from step 1.
3. **Supabase → Authentication → URL Configuration** — set **Site URL** to your
   deployed app URL (e.g. `https://your-app.vercel.app`) and add the same URL
   (plus `/**`) to **Redirect URLs**.

### 4. First admin

1. Deploy the app and sign in with Google using the account that should be the
   admin.
2. In Supabase, run the admin bootstrap from `supabase/gmail-auth.sql`
   (Part 2) — or simply approve the request from an existing admin account.
   The first approved member can be promoted to Administrator from
   **Administration → Staff**.

### 5. Deploy to Vercel

Import the repo in Vercel, set the two `VITE_SUPABASE_*` environment
variables in the project settings, and deploy. (Any static host works —
`npm run build` produces a plain `dist/` folder.)

---

## Make it your business

Everything that makes the portal feel like *your* business lives in **one
file: `src/config/brand.js`**. Change only the values there (never the keys)
and the whole portal follows — sidebar, home, wall, leaderboard, mascot.
No database change is needed.

| What | Where in `brand.js` | Peace default | Generic example |
|---|---|---|---|
| Business name, tagline, footer credit | `BRAND` | Peace Staff / Studio Workspace | Office Management Tool / Office Workspace |
| Logo | Admin → Branding & Theme (upload) | Peace P-mark | Your logo |
| Role display names | `ROLES` / `ROLE_LABELS` | Administrator / Core Team / Staff | Administrator / Manager / Employee |
| Role permissions | `PERMISSIONS` | (see file) | Tick what each role may do |
| Home "worlds" per role | `ROLE_WORLDS` | Director's Console / Edit Suite / Shoot Floor | Manager's Desk / Team Board / My Workspace |
| Navigation labels | `NAV_LABELS` | Studio Home / Studio Wall | Dashboard / Team Wall |
| Level names | `LEVELS` | Rookie / Crew / Shooter / Director / Star / Legend | Starter / Member / Pro / Expert / Star / Legend |
| Monthly award label | `TOP_PERFORMER_LABEL` | Crew of the Month | Star of the Month |
| Mascot name | `MASCOT` | Clappy | Buddy |
| Suggestion categories | `SUGGESTION_CATEGORIES` | (see file) | Your own categories |

Notes:
- **Role labels are display names only.** The role keys (`admin` / `core` /
  `staff`) stay the same in the database — relabelling "Core Team" to
  "Manager" changes nothing else. Renaming a key needs a database migration.
- **XP values** (`+20` task, `+10` early, `+15` report) live in
  `src/lib/gamification.js` (`XP`).
- **Leave types** (annual / sick / casual / emergency) live in
  `src/components/LeavePanel.jsx`.

---

## Project structure

```
src/
  components/   views (StudioHome, StudioWall, TasksBoard, LeavePanel,
                Leaderboard, Mascot, AdminPanel, …) and shared ui.jsx
  store/        AppContext.jsx — Supabase data, auth, permissions, XP, toasts
  lib/          supabase.js, dates.js, gamification.js, reportPdf.js, …
  config/       brand.js — name, roles, permissions, accents
supabase/       SQL setup files (run in order, see above)
public/         favicon.svg, privacy.html
```

---

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Talha Askari.
