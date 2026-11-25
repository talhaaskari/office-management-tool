-- ─────────────────────────────────────────────────────────────
-- Peace Staff portal — Gmail-only login + Admin approval (v2)
-- Paste this into Supabase Dashboard → SQL Editor → New query → Run
--
-- PART 1 (run NOW, before the new app version goes live):
--   * pending_approvals table — Google sign-in requests wait here
--   * RLS tightening — ONLY users with a staff profile (i.e. Admin
--     approved) can read/write any portal data. Unapproved Google
--     sign-ins can only see their own approval request.
--   * helper functions has_profile() / is_admin() are SECURITY
--     DEFINER so RLS policies never recurse.
--
-- PART 2 (run AFTER Talha signs in with Google the first time):
--   * links Talha's existing ADMIN profile (and all his data) to his
--     new Google account, so he can approve everyone else.
--   * Fill in his Gmail address where marked, then run.
-- ─────────────────────────────────────────────────────────────

-- ═══════════════ PART 1 ═══════════════

-- helpers (security definer = bypass RLS, no recursion)
create or replace function public.has_profile()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- pending approval requests (one per Google sign-in)
create table if not exists pending_approvals (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  avatar_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz
);

alter table pending_approvals enable row level security;

drop policy if exists "request own approval" on pending_approvals;
drop policy if exists "read own or admin" on pending_approvals;
drop policy if exists "admin decides" on pending_approvals;
drop policy if exists "admin deletes" on pending_approvals;

-- any signed-in user can file their OWN request
create policy "request own approval" on pending_approvals
  for insert to authenticated with check (auth_user_id = auth.uid());

-- read your own request; admins read all
create policy "read own or admin" on pending_approvals
  for select to authenticated using (auth_user_id = auth.uid() or public.is_admin());

-- only admins can approve / reject / delete
create policy "admin decides" on pending_approvals
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin deletes" on pending_approvals
  for delete to authenticated using (public.is_admin());

-- Re-apply: a rejected user, or a removed member (row still 'approved' but
-- profile gone), may flip ONLY their own row back to 'pending'. The
-- WITH CHECK forces pending, so nobody can approve themselves.
drop policy if exists "re-apply after decision" on pending_approvals;
create policy "re-apply after decision" on pending_approvals
  for update to authenticated
  using (auth_user_id = auth.uid() and status in ('rejected', 'approved'))
  with check (auth_user_id = auth.uid() and status = 'pending');

-- Request details: name/title/phone a new member fills in after Google
-- sign-in, so the admin approves the full profile.
alter table pending_approvals add column if not exists title text;
alter table pending_approvals add column if not exists phone text;

drop policy if exists "own pending request details" on pending_approvals;
create policy "own pending request details" on pending_approvals
  for update to authenticated
  using (auth_user_id = auth.uid() and status = 'pending')
  with check (auth_user_id = auth.uid() and status = 'pending');

-- ── tighten every data table: approved members only ──
-- (replaces the old "staff full access" = any authenticated user)
drop policy if exists "staff full access" on profiles;
drop policy if exists "staff full access" on tasks;
drop policy if exists "staff full access" on task_notes;
drop policy if exists "staff full access" on announcements;
drop policy if exists "staff full access" on announcement_reads;
drop policy if exists "staff full access" on suggestions;
drop policy if exists "staff full access" on reports;

create policy "approved members only" on profiles
  for all to authenticated using (public.has_profile()) with check (public.has_profile());
create policy "approved members only" on tasks
  for all to authenticated using (public.has_profile()) with check (public.has_profile());
create policy "approved members only" on task_notes
  for all to authenticated using (public.has_profile()) with check (public.has_profile());
create policy "approved members only" on announcements
  for all to authenticated using (public.has_profile()) with check (public.has_profile());
create policy "approved members only" on announcement_reads
  for all to authenticated using (public.has_profile()) with check (public.has_profile());
create policy "approved members only" on suggestions
  for all to authenticated using (public.has_profile()) with check (public.has_profile());
create policy "approved members only" on reports
  for all to authenticated using (public.has_profile()) with check (public.has_profile());

-- branding read: approved members only (was: any authenticated user)
drop policy if exists "staff read branding" on workspace_settings;
create policy "approved members read branding" on workspace_settings
  for select to authenticated using (public.has_profile());

-- ═══════════════ PART 2 — ADMIN BOOTSTRAP ═══════════════
-- Run this ONLY after the admin has signed in with Google once (their
-- request will be sitting in pending_approvals). Steps:
--   1. Sign OUT of the old @peacestaff.internal account everywhere.
--   2. Sign in with Google (you'll see "waiting for approval").
--   3. Replace 'YOUR_GMAIL_HERE' below with that Gmail address.
--   4. Run this whole block. Then refresh the portal — you're Admin.
-- Safe to run: if the Gmail isn't found in pending_approvals, it
-- does nothing and reports "no pending request".
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_gmail text := 'YOUR_GMAIL_HERE'; -- ←←← apni Gmail yahan likho
  v_new_id uuid;
  v_old_id uuid;
  v_old_email text := 'admin@company.internal';
  v_name text := 'Your Name';
  v_title text := 'Administrator';
  v_role text := 'admin';
  v_perms jsonb := null;
begin
  select auth_user_id into v_new_id
  from pending_approvals where email = v_gmail and status = 'pending';

  if v_new_id is null then
    raise notice 'No pending Google request found for %. Sign in with Google first, then re-run.', v_gmail;
    return;
  end if;

  select id, name, title, role, permissions
    into v_old_id, v_name, v_title, v_role, v_perms
  from profiles where email = v_old_email;

  if v_old_id is not null and v_old_id <> v_new_id then
    -- 1. create the new profile FIRST (FK targets must exist before references move)
    insert into profiles (id, name, title, role, email, permissions, must_change_password)
    values (v_new_id, v_name, v_title, v_role, v_gmail, v_perms, false);
    -- 2. move every reference from the old profile to the new Google id
    update tasks set assignee_id = v_new_id where assignee_id = v_old_id;
    update task_notes set author_id = v_new_id where author_id = v_old_id;
    update announcements set author_id = v_new_id where author_id = v_old_id;
    update announcement_reads set user_id = v_new_id where user_id = v_old_id;
    update reports set user_id = v_new_id where user_id = v_old_id;
    update workspace_settings set updated_by = v_new_id where updated_by = v_old_id;
    update pending_approvals set decided_by = v_new_id where decided_by = v_old_id;
    -- 3. now the old profile can go
    delete from profiles where id = v_old_id;
  elsif v_old_id is null then
    -- no old profile (fresh install) — just create the admin profile
    insert into profiles (id, name, title, role, email, must_change_password)
    values (v_new_id, 'Talha Askari', 'Administrator', 'admin', v_gmail, false)
    on conflict (id) do nothing;
  end if;

  update pending_approvals
  set status = 'approved', decided_by = v_new_id, decided_at = now()
  where auth_user_id = v_new_id;

  raise notice 'Done — % is now the Admin. Refresh the portal.', v_gmail;
end $$;
