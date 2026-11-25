# Peace Staff — Studio Workspace Portal

A free, self-hosted **internal staff workspace** for a production house or small
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
git clone https://github.com/<you>/peace-staff.git
cd peace-staff
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

## Make it yours (rebranding)

- **Name, tagline, footer credit:** edit `src/config/brand.js`
  (`BRAND.name`, `BRAND.legalName`, `BRAND.tagline`, `BRAND.footerCredit`).
- **Logo:** sign in as admin → **Administration → Branding & Theme** → upload
  your logo. (The default logo is bundled in `src/lib/peaceLogo.js`.)
- **Colours / theme:** same Branding section — pick an accent and light/dark mode,
  optionally forced for everyone.

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
