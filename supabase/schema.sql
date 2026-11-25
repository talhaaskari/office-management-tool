-- ─────────────────────────────────────────────────────────────
-- Peace Staff portal — Supabase schema (v1)
-- Paste this into Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────

-- 1) profiles: one row per staff member, linked to Supabase Auth
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  title text not null default 'Staff',
  role text not null default 'staff' check (role in ('admin', 'core', 'staff')),
  email text not null,
  permissions jsonb, -- null = use role preset; object = per-member overrides
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  project text not null,
  title text not null,
  detail text not null default '',
  assignee_id uuid references profiles(id) on delete set null,
  priority text not null default 'Medium',
  status text not null default 'todo',
  progress int not null default 0 check (progress between 0 and 100),
  due_date date,
  created_at timestamptz not null default now()
);

-- 3) task notes
create table if not exists task_notes (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  text text not null,
  created_at timestamptz not null default now()
);

-- 4) announcements
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- 5) announcement read receipts (per user)
create table if not exists announcement_reads (
  announcement_id uuid not null references announcements(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- 6) suggestions (anonymous by design — no user link stored)
create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  text text not null,
  created_at timestamptz not null default now()
);

-- 7) daily reports
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  date date not null,
  work text not null,
  blockers text not null default '',
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: this is an internal trusted portal.
-- Any signed-in staff member can read/write; the app's own
-- permission system (roles + per-member toggles) gates the UI.
-- ─────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table task_notes enable row level security;
alter table announcements enable row level security;
alter table announcement_reads enable row level security;
alter table suggestions enable row level security;
alter table reports enable row level security;

drop policy if exists "staff full access" on profiles;
drop policy if exists "staff full access" on tasks;
drop policy if exists "staff full access" on task_notes;
drop policy if exists "staff full access" on announcements;
drop policy if exists "staff full access" on announcement_reads;
drop policy if exists "staff full access" on suggestions;
drop policy if exists "staff full access" on reports;

create policy "staff full access" on profiles          for all to authenticated using (true) with check (true);
create policy "staff full access" on tasks             for all to authenticated using (true) with check (true);
create policy "staff full access" on task_notes        for all to authenticated using (true) with check (true);
create policy "staff full access" on announcements    for all to authenticated using (true) with check (true);
create policy "staff full access" on announcement_reads for all to authenticated using (true) with check (true);
create policy "staff full access" on suggestions       for all to authenticated using (true) with check (true);
create policy "staff full access" on reports           for all to authenticated using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- Example: seed the first admin profile. Create the user first in
-- Dashboard → Authentication → Users → "Add user" (check
-- "Auto Confirm user"), then run this, replacing the values.
-- Repeat the insert for each team member.
-- ─────────────────────────────────────────────────────────────
insert into profiles (id, name, title, role, email)
select id, 'Your Name', 'Administrator', 'admin', email from auth.users where email = 'admin@company.internal'
on conflict (id) do update set name = excluded.name, title = excluded.title, role = excluded.role;
