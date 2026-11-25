-- Peace Staff — Request details (run once in Supabase → SQL Editor)
--
-- WHAT CHANGES: after "Continue with Google", a new member fills in their
-- name, job title and phone BEFORE the request reaches the admin — so the
-- admin approves the full profile, not just a Gmail address.
--
-- 1. two new columns on pending_approvals (title, phone)
-- 2. "own pending request details" policy: a user may fill in ONLY their
--    own PENDING row (status must stay 'pending' — nobody can approve
--    themselves, and nobody can touch anyone else's row)
-- 3. "re-apply after decision" policy (same as reapply-policy.sql, included
--    here so ONE run covers everything — safe to run even if you already
--    ran reapply-policy.sql): a rejected/removed member may flip ONLY their
--    own decided row back to 'pending'
alter table pending_approvals add column if not exists title text;
alter table pending_approvals add column if not exists phone text;

drop policy if exists "own pending request details" on pending_approvals;
create policy "own pending request details" on pending_approvals
  for update to authenticated
  using (auth_user_id = auth.uid() and status = 'pending')
  with check (auth_user_id = auth.uid() and status = 'pending');

drop policy if exists "re-apply after decision" on pending_approvals;
create policy "re-apply after decision" on pending_approvals
  for update to authenticated
  using (auth_user_id = auth.uid() and status in ('rejected', 'approved'))
  with check (auth_user_id = auth.uid() and status = 'pending');

-- Verify: should show the two new columns and the policies
select column_name, data_type
from information_schema.columns
where table_name = 'pending_approvals' and column_name in ('title', 'phone');

select policyname, cmd
from pg_policies
where tablename = 'pending_approvals'
order by policyname;
