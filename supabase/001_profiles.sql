-- Run this once in the Supabase Dashboard: SQL Editor > New query > paste > Run.
--
-- Maps an auth.users row to the role + mock-data record ("actor") it plays in
-- the app. `ref_id` still points at IDs from src/data/mockData.js for now
-- (e.g. "hod-3", "center-7") — this is step 1 of the backend migration
-- (auth only); regions/centers/students etc. move to real tables in later
-- steps, at which point ref_id becomes a real foreign key.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (
    role in (
      'national_supervisor',
      'regional_supervisor',
      'regional_coordinator',
      'hod',
      'center_coordinator',
      'mentor'
    )
  ),
  ref_id text not null,
  context_label text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Every signed-in user may read only their own profile row — that's all the
-- client needs (it resolves the rest of the "actor" shape from mock data
-- using role + ref_id). No update/delete/insert policy for regular users:
-- profile rows are only ever written by the seed script via the service_role
-- key, which bypasses RLS entirely.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);
