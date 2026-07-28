-- Run this once in the Supabase Dashboard: SQL Editor > New query > paste > Run.
--
-- Adds per-subject max score, and lets Regional Supervisors CRUD categories
-- (displayed in the UI as "Program") and Regional Coordinators CRUD subjects
-- within their own category — both were read-only until now.

alter table public.subjects add column if not exists max_score numeric not null default 20;

-- Null if the caller isn't a regional_coordinator.
create or replace function public.acting_regional_coordinator_category() returns text
language sql stable security definer as $$
  select rc.category_id from public.profiles p
  join public.regional_coordinators rc on rc.id = p.ref_id
  where p.id = auth.uid() and p.role = 'regional_coordinator';
$$;

-- Additive: the existing "authenticated read categories"/"authenticated read
-- subjects" SELECT policies and the "regional_supervisor reassigns hod
-- within own region" UPDATE policy from 002_full_schema.sql are untouched;
-- multiple permissive policies for the same command just OR together.
create policy "regional_supervisor writes own-region categories" on public.categories for all
  using (public.acting_regional_supervisor_region() = region_id)
  with check (public.acting_regional_supervisor_region() = region_id);

create policy "regional_coordinator writes own-category subjects" on public.subjects for all
  using (public.acting_regional_coordinator_category() = category_id)
  with check (public.acting_regional_coordinator_category() = category_id);

-- Re-published to also expose each subject's own max_score (needed so the
-- shared/no-login student view shows the right "out of X" for a
-- not-yet-entered week, same as the signed-in views) — everything else
-- about this function is unchanged from 002_full_schema.sql.
create or replace function public.get_shared_student_bundle(sid text) returns jsonb
language sql stable security definer as $$
  select jsonb_build_object(
    'student', (
      select jsonb_build_object('id', s.id, 'name', s.name, 'categoryName', cat.name)
      from public.students s join public.categories cat on cat.id = s.category_id
      where s.id = sid
    ),
    'subjects', (
      select coalesce(jsonb_agg(jsonb_build_object('id', sub.id, 'name', sub.name, 'maxScore', sub.max_score)), '[]'::jsonb)
      from public.subjects sub
      where sub.category_id = (select category_id from public.students where id = sid)
    ),
    'scores', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'subjectId', sc.subject_id, 'week', sc.week,
        'marksObtained', sc.marks_obtained, 'maxScore', sc.max_score
      )), '[]'::jsonb)
      from public.scores sc where sc.student_id = sid
    )
  );
$$;
