-- Peace Staff — Re-apply policy (run once in Supabase → SQL Editor)
--
-- PROBLEM: pending_approvals has ONE row per Google account (auth_user_id is
-- unique). A rejected request stayed "rejected" forever, and a REMOVED
-- member's row stayed "approved" — so signing in again never put them back
-- in the admin's pending queue. They could never come back.
--
-- FIX: let a user flip ONLY their own decided row back to 'pending'.
-- The WITH CHECK forces status = 'pending', so nobody can approve
-- themselves — only an admin can do that. Other people's rows are untouched.
create policy "re-apply after decision" on pending_approvals
  for update to authenticated
  using (auth_user_id = auth.uid() and status in ('rejected', 'approved'))
  with check (auth_user_id = auth.uid() and status = 'pending');

-- Verify: should list the new policy
select policyname, cmd
from pg_policies
where tablename = 'pending_approvals'
order by policyname;
