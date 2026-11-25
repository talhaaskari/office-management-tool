-- Peace Staff — Gamification XP ledger (run once in Supabase → SQL Editor)
--
-- Every XP-earning action writes one row: task completed (+20), task
-- finished before its due date (+10), daily report submitted (+15).
-- The (user_id, kind, ref_id) unique key means the same action can never
-- pay twice, even if the task is toggled done → undone → done.
-- The ledger is append-only: no update/delete policies.
-- Points are READ by everyone with a profile (the leaderboard is public
-- inside the team); the app only writes rows for real actions, and the
-- portal trusts signed-in members the same way it trusts task writes.

-- helpers (same as gmail-auth.sql — safe to re-run)
create or replace function public.has_profile()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create table if not exists xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  ref_id text not null,
  points int not null check (points > 0),
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);

alter table xp_events enable row level security;

drop policy if exists "xp read" on xp_events;
create policy "xp read" on xp_events
  for select to authenticated
  using (public.has_profile());

drop policy if exists "xp award" on xp_events;
create policy "xp award" on xp_events
  for insert to authenticated
  with check (public.has_profile());

-- Verify: should show the table, its 2 policies, and the unique key
select table_name from information_schema.tables
where table_name = 'xp_events';

select policyname, cmd from pg_policies
where tablename = 'xp_events'
order by policyname;

select indexname from pg_indexes
where tablename = 'xp_events' and indexdef like '%user_id%kind%ref_id%';
