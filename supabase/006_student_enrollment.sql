-- Run this once in the Supabase Dashboard: SQL Editor > New query > paste > Run.
--
-- Lets a Center Coordinator enroll a new student (auto-generated matricule,
-- see src/data/api.js's generateMatricule) at their own center, and adds
-- 'withdrawn' as a valid status (soft-delete — see README "Student
-- enrollment" for why there's no hard delete).
alter table public.students add constraint students_status_check
  check (status in ('active', 'withdrawn'));

-- Defense in depth for matricule uniqueness: the app computes the next
-- sequence number by scanning existing codes with the same generated
-- prefix, but a unique index guarantees it at the database level too (a
-- collision just makes the insert fail — the coordinator retries and gets
-- a fresh number).
create unique index if not exists students_student_code_unique
  on public.students (student_code);

-- No new UPDATE policy needed — the existing "center_coordinator assigns
-- own-center students to a mentor" policy from 005_student_mentor_assignment.sql
-- is row-level, not column-level: it already permits editing name/category_id/
-- status on the coordinator's own-center rows, not just mentor_id.
create policy "center_coordinator enrolls own-center students" on public.students
  for insert with check (center_id = public.acting_center_coordinator_center());
