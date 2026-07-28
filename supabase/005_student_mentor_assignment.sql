-- Run this once in the Supabase Dashboard: SQL Editor > New query > paste > Run.
--
-- Lets a Center Coordinator assign/reassign which mentor (at their own
-- center) is responsible for a student at their own center. Previously
-- `students` had no write policy at all — mentor_id was fixed at seed time.
create policy "center_coordinator assigns own-center students to a mentor" on public.students for update
  using (center_id = public.acting_center_coordinator_center())
  with check (center_id = public.acting_center_coordinator_center());

