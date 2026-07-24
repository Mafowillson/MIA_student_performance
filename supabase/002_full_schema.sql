-- Run this once in the Supabase Dashboard: SQL Editor > New query > paste > Run.
-- Requires 001_profiles.sql to have been run already (profiles table + RLS).
--
-- Moves every entity in src/data/mockData.js into real tables. Primary keys
-- are TEXT and match the IDs already used in mockData.js (e.g. "region-nw",
-- "stu-001") — no ID remapping, so profiles.ref_id (from 001) keeps pointing
-- at the right rows unchanged.
--
-- Deliberate deviation from strict FKs: students.mentor_id, follow_up_notes.mentor_id,
-- outcomes.recorded_by, and scores.entered_by are plain text, NOT foreign keys.
-- The app's deleteMentor() intentionally leaves these pointing at a
-- since-deleted mentor (rendered as "—" in the UI) rather than cascading or
-- blocking the delete — a real FK would force one or the other.

-- ---------------------------------------------------------------------------
-- Tables (FK-safe creation order)
-- ---------------------------------------------------------------------------
create table if not exists public.regions (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.hods (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  region_id text not null references public.regions (id),
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id text primary key,
  name text not null,
  category_id text not null references public.categories (id),
  hod_id text references public.hods (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.centers (
  id text primary key,
  name text not null,
  location text,
  region_id text not null references public.regions (id),
  created_at timestamptz not null default now()
);

create table if not exists public.regional_supervisors (
  id text primary key,
  name text not null,
  region_id text references public.regions (id),
  created_at timestamptz not null default now()
);
create unique index if not exists regional_supervisors_region_unique
  on public.regional_supervisors (region_id) where region_id is not null;

create table if not exists public.regional_coordinators (
  id text primary key,
  name text not null,
  category_id text not null references public.categories (id),
  created_at timestamptz not null default now()
);

create table if not exists public.center_coordinators (
  id text primary key,
  name text not null,
  center_id text not null references public.centers (id),
  created_at timestamptz not null default now()
);

create table if not exists public.mentors (
  id text primary key,
  name text not null,
  center_id text not null references public.centers (id),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id text primary key,
  student_code text not null,
  name text not null,
  center_id text not null references public.centers (id),
  category_id text not null references public.categories (id),
  mentor_id text, -- NOT a FK — see file header
  enrollment_date date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id text primary key,
  subject_id text not null references public.subjects (id),
  week int not null,
  date date not null,
  term_id text not null,
  max_score numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.scores (
  id text primary key,
  student_id text not null references public.students (id),
  assessment_id text not null references public.assessments (id),
  subject_id text not null references public.subjects (id),
  week int not null,
  marks_obtained numeric not null,
  max_score numeric not null,
  entered_by text, -- NOT a FK — see file header
  entered_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.follow_up_notes (
  id text primary key,
  student_id text not null references public.students (id),
  mentor_id text, -- NOT a FK — see file header
  date date not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.outcomes (
  id text primary key,
  student_id text not null references public.students (id),
  outcome_type text not null,
  institution_or_program text,
  date date,
  note text,
  recorded_by text, -- NOT a FK — see file header
  created_at timestamptz not null default now()
);

create table if not exists public.at_risk_config (
  id text primary key default 'default',
  sudden_drop_pct numeric not null,
  sustained_low_pct numeric not null,
  sustained_low_weeks int not null,
  trend_weeks int not null,
  trend_slope_threshold numeric not null,
  incomplete_data_weeks int not null
);

-- ---------------------------------------------------------------------------
-- RLS: enable on everything
-- ---------------------------------------------------------------------------
alter table public.regions enable row level security;
alter table public.hods enable row level security;
alter table public.categories enable row level security;
alter table public.subjects enable row level security;
alter table public.centers enable row level security;
alter table public.regional_supervisors enable row level security;
alter table public.regional_coordinators enable row level security;
alter table public.center_coordinators enable row level security;
alter table public.mentors enable row level security;
alter table public.students enable row level security;
alter table public.assessments enable row level security;
alter table public.scores enable row level security;
alter table public.follow_up_notes enable row level security;
alter table public.outcomes enable row level security;
alter table public.at_risk_config enable row level security;

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so they can read profiles/role tables
-- regardless of the caller's own RLS visibility into those tables)
-- ---------------------------------------------------------------------------
create or replace function public.is_national_supervisor() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'national_supervisor'
  );
$$;

-- Null if the caller isn't a regional_supervisor (or has no region yet).
create or replace function public.acting_regional_supervisor_region() returns text
language sql stable security definer as $$
  select rs.region_id from public.profiles p
  join public.regional_supervisors rs on rs.id = p.ref_id
  where p.id = auth.uid() and p.role = 'regional_supervisor';
$$;

-- Null if the caller isn't a center_coordinator.
create or replace function public.acting_center_coordinator_center() returns text
language sql stable security definer as $$
  select cc.center_id from public.profiles p
  join public.center_coordinators cc on cc.id = p.ref_id
  where p.id = auth.uid() and p.role = 'center_coordinator';
$$;

-- Shared visibility rule for the student-scoped tables (students, scores,
-- follow_up_notes, outcomes) — one definition, reused by every policy below
-- so the "who can see this student" logic can't drift between tables.
create or replace function public.can_view_student(sid text) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.profiles p
    join public.students s on s.id = sid
    join public.centers c on c.id = s.center_id
    left join public.regional_supervisors rs
      on rs.id = p.ref_id and p.role = 'regional_supervisor'
    left join public.regional_coordinators rc
      on rc.id = p.ref_id and p.role = 'regional_coordinator'
    left join public.hods h
      on h.id = p.ref_id and p.role = 'hod'
    left join public.subjects hsub
      on hsub.hod_id = h.id
    left join public.center_coordinators cc
      on cc.id = p.ref_id and p.role = 'center_coordinator'
    where p.id = auth.uid() and (
      p.role = 'national_supervisor'
      or (p.role = 'regional_supervisor' and rs.region_id = c.region_id)
      or (p.role = 'regional_coordinator' and rc.category_id = s.category_id)
      or (p.role = 'hod' and hsub.category_id = s.category_id)
      or (p.role = 'center_coordinator' and cc.center_id = s.center_id)
      or (p.role = 'mentor' and p.ref_id = s.mentor_id)
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Org/staff tables — SELECT open to any signed-in user (staff-directory
-- data, not sensitive); writes scoped to match the app's existing
-- client-side authorization.
-- ---------------------------------------------------------------------------
create policy "authenticated read regions" on public.regions for select using (auth.role() = 'authenticated');
create policy "national_supervisor writes regions" on public.regions for all
  using (public.is_national_supervisor()) with check (public.is_national_supervisor());

create policy "authenticated read categories" on public.categories for select using (auth.role() = 'authenticated');
-- No client write policy — categories are never created/edited/deleted from
-- the UI; only the seed script (service_role, bypasses RLS) writes them.

create policy "authenticated read subjects" on public.subjects for select using (auth.role() = 'authenticated');
-- Only hod_id reassignment happens from the client (via updateAdmin/deleteAdmin
-- for HODs) — scoped to the acting Regional Supervisor's own region.
create policy "regional_supervisor reassigns hod within own region" on public.subjects for update
  using (public.acting_regional_supervisor_region() = (select region_id from public.categories where id = subjects.category_id))
  with check (public.acting_regional_supervisor_region() = (select region_id from public.categories where id = subjects.category_id));

create policy "authenticated read centers" on public.centers for select using (auth.role() = 'authenticated');
create policy "regional_supervisor writes own-region centers" on public.centers for all
  using (public.acting_regional_supervisor_region() = region_id)
  with check (public.acting_regional_supervisor_region() = region_id);

create policy "authenticated read regional_supervisors" on public.regional_supervisors for select using (auth.role() = 'authenticated');
create policy "national_supervisor writes regional_supervisors" on public.regional_supervisors for all
  using (public.is_national_supervisor()) with check (public.is_national_supervisor());

create policy "authenticated read regional_coordinators" on public.regional_coordinators for select using (auth.role() = 'authenticated');
create policy "regional_supervisor writes own-region coordinators" on public.regional_coordinators for all
  using (public.acting_regional_supervisor_region() = (select region_id from public.categories where id = regional_coordinators.category_id))
  with check (public.acting_regional_supervisor_region() = (select region_id from public.categories where id = regional_coordinators.category_id));

create policy "authenticated read hods" on public.hods for select using (auth.role() = 'authenticated');
-- A bare hods row (just a name) carries no region of its own — the
-- region-sensitive part is which subject it gets attached to, already
-- enforced by the subjects policy above. So any Regional Supervisor may
-- create/rename/remove a HOD person record; only an already-region-assigned
-- HOD (via subjects.hod_id) additionally requires that subject's region to
-- match before edits/removal are allowed.
create policy "regional_supervisor writes hods" on public.hods for all
  using (
    public.acting_regional_supervisor_region() is not null
    and (
      not exists (select 1 from public.subjects where hod_id = hods.id)
      or exists (
        select 1 from public.subjects s join public.categories c on c.id = s.category_id
        where s.hod_id = hods.id and c.region_id = public.acting_regional_supervisor_region()
      )
    )
  )
  with check (public.acting_regional_supervisor_region() is not null);

create policy "authenticated read center_coordinators" on public.center_coordinators for select using (auth.role() = 'authenticated');
create policy "regional_supervisor writes own-region center_coordinators" on public.center_coordinators for all
  using (public.acting_regional_supervisor_region() = (select region_id from public.centers where id = center_coordinators.center_id))
  with check (public.acting_regional_supervisor_region() = (select region_id from public.centers where id = center_coordinators.center_id));

create policy "authenticated read mentors" on public.mentors for select using (auth.role() = 'authenticated');
create policy "center_coordinator writes own-center mentors" on public.mentors for all
  using (public.acting_center_coordinator_center() = center_id)
  with check (public.acting_center_coordinator_center() = center_id);

create policy "authenticated read assessments" on public.assessments for select using (auth.role() = 'authenticated');
-- Created automatically by manual mark entry / Excel upload confirm, both
-- Center-Coordinator-only flows. Assessments aren't center-specific, so any
-- center_coordinator may create one (the sensitive part — which student got
-- which score — is enforced by the scores policy below).
create policy "center_coordinator creates assessments" on public.assessments for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'center_coordinator'));

create policy "authenticated read at_risk_config" on public.at_risk_config for select using (auth.role() = 'authenticated');
-- No client write policy — not editable from the UI yet.

-- ---------------------------------------------------------------------------
-- Student-scoped tables
-- ---------------------------------------------------------------------------
create policy "scoped read students" on public.students for select using (public.can_view_student(id));

create policy "scoped read scores" on public.scores for select using (public.can_view_student(student_id));
create policy "center_coordinator inserts own-center scores" on public.scores for insert
  with check (exists (select 1 from public.students s where s.id = scores.student_id and s.center_id = public.acting_center_coordinator_center()));
create policy "center_coordinator updates own-center scores" on public.scores for update
  using (exists (select 1 from public.students s where s.id = scores.student_id and s.center_id = public.acting_center_coordinator_center()))
  with check (exists (select 1 from public.students s where s.id = scores.student_id and s.center_id = public.acting_center_coordinator_center()));

create policy "scoped read follow_up_notes" on public.follow_up_notes for select using (public.can_view_student(student_id));
create policy "mentor adds own follow-up note" on public.follow_up_notes for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'mentor' and ref_id = follow_up_notes.mentor_id));

create policy "scoped read outcomes" on public.outcomes for select using (public.can_view_student(student_id));
-- No write policy — nothing in the UI records an outcome today.

-- ---------------------------------------------------------------------------
-- Shared (no-login) student view — /share/:studentId is intentionally public
-- (a WhatsApp-style share link), so an anonymous request has no
-- `profiles` row and every policy above (correctly) returns nothing for it.
-- Rather than opening any table's SELECT policy to anon — which would let
-- anyone read every student's data via the publishable key, not just the
-- one being shared — expose exactly the one bundle this feature needs
-- through a SECURITY DEFINER function, which bypasses RLS internally but
-- only ever returns the single requested student's own data.
create or replace function public.get_shared_student_bundle(sid text) returns jsonb
language sql stable security definer as $$
  select jsonb_build_object(
    'student', (
      select jsonb_build_object('id', s.id, 'name', s.name, 'categoryName', cat.name)
      from public.students s join public.categories cat on cat.id = s.category_id
      where s.id = sid
    ),
    'subjects', (
      select coalesce(jsonb_agg(jsonb_build_object('id', sub.id, 'name', sub.name)), '[]'::jsonb)
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
grant execute on function public.get_shared_student_bundle(text) to anon, authenticated;

-- Same reasoning, for the pre-login screen's "preview a shared student page"
-- dropdown (Login.jsx) — a minimal, non-scored roster (id/name/code only)
-- so that picker can be populated with zero session, without opening the
-- full `students` table's SELECT policy to anon.
create or replace function public.list_students_for_share() returns jsonb
language sql stable security definer as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'name', name, 'studentCode', student_code) order by name),
    '[]'::jsonb
  )
  from public.students;
$$;
grant execute on function public.list_students_for_share() to anon, authenticated;
