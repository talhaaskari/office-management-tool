-- ─────────────────────────────────────────────────────────────
-- Peace Staff — Branding & Theme settings (admin-controlled)
-- Paste into Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────

create table if not exists workspace_settings (
  id int primary key default 1 check (id = 1), -- single row
  logo_url text,                               -- public URL of uploaded logo (null = default letter mark)
  theme_mode text not null default 'dark' check (theme_mode in ('dark', 'light')),
  theme_accent text not null default 'cobalt',
  force_theme boolean not null default false,  -- true = everyone sees admin theme
  event_name text,                             -- optional label e.g. "Eid ul Fitr"
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null
);

alter table workspace_settings enable row level security;

drop policy if exists "staff read branding" on workspace_settings;
drop policy if exists "admin write branding" on workspace_settings;

-- everyone signed in can read (so the theme/logo apply to all)
create policy "staff read branding" on workspace_settings
  for select to authenticated using (true);

-- writes go through the app with service-role-free RLS: allow admins only.
-- (The app checks role client-side too; this is defense in depth.)
create policy "admin write branding" on workspace_settings
  for all to authenticated
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- seed the single row
insert into workspace_settings (id) values (1)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- Storage: public "branding" bucket for the logo.
-- (Bucket itself is created via API/dashboard; policies below.)
-- ─────────────────────────────────────────────────────────────
drop policy if exists "public read branding" on storage.objects;
drop policy if exists "admin upload branding" on storage.objects;
drop policy if exists "admin delete branding" on storage.objects;

create policy "public read branding" on storage.objects
  for select to anon, authenticated using (bucket_id = 'branding');

create policy "admin upload branding" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'branding'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "admin delete branding" on storage.objects
  for delete to authenticated using (
    bucket_id = 'branding'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
