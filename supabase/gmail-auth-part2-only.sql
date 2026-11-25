-- Peace Staff portal — Gmail-only login (PART 2 ONLY — ADMIN BOOTSTRAP) — FIXED v2
-- Fix: nayi profile PEHLE banti hai, phir purani entries us par move hoti hain
-- (pehle version me order ulta tha — foreign key error aata tha).
-- Run this ONLY after signing in with Google once at the portal
-- (you will see "Waiting for approval"). Your Gmail is already filled in.
-- Supabase Dashboard → SQL Editor → New query → ye poora text paste karo → Run
-- Phir portal refresh karo — tum Admin ban jao ge, purana data bhi link ho jayega.

do $$
declare
  v_gmail text := 'peaceproduction93@gmail.com';
  v_new_id uuid;
  v_old_id uuid;
  v_old_email text := 'talha.askari@peacestaff.internal';
  v_name text := 'Talha Askari';
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
