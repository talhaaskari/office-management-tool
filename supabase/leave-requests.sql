-- Peace Staff — Leave (chhutti) requests (run once in Supabase → SQL Editor)
--
-- New members file a leave request (type + dates + reason); an admin
-- approves or rejects it. Approved leave shows on the Studio Wall as
-- "On leave today". Leave reasons are personal: a member reads only their
-- own rows (plus approved rows, so the team can see who's away); only an
-- admin decides.

-- helpers (same as gmail-auth.sql — safe to re-run)
create or replace function public.has_profile()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('annual', 'sick', 'casual', 'emergency')),
  start_date date not null,
  end_date date not null,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table leave_requests enable row level security;

drop policy if exists "leave read" on leave_requests;
create policy "leave read" on leave_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or status = 'approved');

drop policy if exists "leave request own" on leave_requests;
create policy "leave request own" on leave_requests
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_profile());

drop policy if exists "leave decide admin" on leave_requests;
create policy "leave decide admin" on leave_requests
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "leave cancel own pending" on leave_requests;
create policy "leave cancel own pending" on leave_requests
  for delete to authenticated
  using (user_id = auth.uid() and status = 'pending');

drop policy if exists "leave delete admin" on leave_requests;
create policy "leave delete admin" on leave_requests
  for delete to authenticated
  using (public.is_admin());

-- Verify: should show the table and its 5 policies
select table_name from information_schema.tables
where table_name = 'leave_requests';

select policyname, cmd from pg_policies
where tablename = 'leave_requests'
order by policyname;
