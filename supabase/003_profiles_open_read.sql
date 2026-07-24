-- Run this once in the Supabase Dashboard: SQL Editor > New query > paste > Run.
--
-- 001_profiles.sql only let a user read their OWN profile row. Now that
-- Manage Admins / Manage Mentors / Manage Regional Supervisors need to show
-- every account's email (via a `profiles` cache in api.js, replacing the old
-- mock `_users` lookups), every signed-in user needs read access to the
-- whole table — same "staff directory, not sensitive" reasoning already
-- used for regions/centers/etc. in 002_full_schema.sql. Writes are still
-- untouched: only the manage-staff-account Edge Function (service_role,
-- bypasses RLS) ever inserts/updates/deletes a profiles row.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "authenticated read profiles" on public.profiles
  for select using (auth.role() = 'authenticated');


