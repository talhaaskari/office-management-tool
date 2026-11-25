-- Peace Staff portal — Gmail-only login (PART 1 ONLY)
-- Supabase Dashboard → SQL Editor → New query → ye poora text paste karo → Run
-- (Part 2 baad me hoga, Google se sign in karne ke baad)

create or replace function public.has_profile()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

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

create policy "request own approval" on pending_approvals
  for insert to authenticated with check (auth_user_id = auth.uid());

create policy "read own or admin" on pending_approvals
  for select to authenticated using (auth_user_id = auth.uid() or public.is_admin());

create policy "admin decides" on pending_approvals
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin deletes" on pending_approvals
  for delete to authenticated using (public.is_admin());

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

drop policy if exists "staff read branding" on workspace_settings;
create policy "approved members read branding" on workspace_settings
  for select to authenticated using (public.has_profile());
