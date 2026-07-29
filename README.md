# MIA — Model Initiative of Africa

A Vite + React frontend for MIA's public website, backed end-to-end by a
real Supabase project: Auth, plus every entity (regions, categories/programs,
subjects, centers, the five staff-role tables, students, assessments,
scores, follow-up notes, outcomes) as real Postgres tables with row-level
security. See "Authentication" and "Data layer" below.

**This is a live system now, not a demo dataset.** The database was wiped
of all mock/seed content (see "Getting started with real data" below) —
there is exactly one account in it, the National Supervisor, and every
other region/center/program/subject/staff member/student gets created
through the app itself from here on. `src/data/mockData.js` still exists
(the seed script's source, kept for reference/local dev re-seeding) but the
running app no longer reads from it except for a few fixed schedule
constants (weeks, term, max score) that nothing in the UI edits yet.

The **Student Performance Platform is one feature of the broader MIA site**,
not the whole app: `/`, `/about`, `/programs`, and `/contact` are a public
marketing site anyone can browse with no login; the platform (role login +
dashboards) lives behind a "Platform Login" button in the header, at
`/login` onward. More MIA functionality is expected to land here over time.

## Running it

```bash
npm install
npm run dev
```

Open the printed local URL and you'll land on the **public site** —
Home / About / Programs / Contact, with a "Platform Login" button in the
header. Click it (or go to `/login`) to sign in — there's no demo-accounts
picker anymore (removed along with the mock data it depended on); sign in
with a real account's email/password. Use "Log out" in the dashboard header
to return to `/login`; clicking the MIA logo/name from inside the platform
takes you back out to the public site at `/`.

`/share/:studentId` (the read-only, no-login WhatsApp-style report a
mentor sends a parent) is still a real feature, generated from inside the
platform via each mentee's "Copy share link" — but the login page no longer
has a public "browse all students" picker for trying it out anonymously;
that discovery UI was removed on request (a public list of every student's
name shouldn't be one click away from the login screen).

## Getting started with real data

The database starts with **one row**: the National Supervisor. Bootstrap
everything else from there, top-down through the role hierarchy — each
role creates the next:

1. **National Supervisor** → *Manage Regions*: create your real region(s).
2. **Regional Supervisor** (created by the National Supervisor via *Manage
   Regional Supervisors* — a real account, real email/password) → *Manage
   Programs* (real programs, e.g. Engineering/Medicine) and *Manage
   Centers* for their region, then *Manage Admins* to create real Regional
   Coordinators and Center Coordinators.
3. **Regional Coordinator** → *Manage Subjects*: the real subjects for
   their program, each with its own max score.
4. **Center Coordinator** → *Manage Mentors* (real mentor accounts), then
   *Enroll Student* for each real student (auto-generates their matricule),
   then *Manual Mark Entry* or *Excel Upload* (real CSV, matched by
   matricule) for weekly marks.
5. **HOD** accounts are created by the Regional Supervisor via *Manage
   Admins* and assigned to a subject — nothing else for them to set up.

One thing that *isn't* self-service yet: the academic calendar
(`WEEKS`/`TERM`/`CURRENT_WEEK` in `mockData.js`) is still a fixed constant,
not a per-tenant setting — fine for continuing the current term, but
rolling into a new term/year isn't a UI action yet.

## What's here

- **Public website** (`src/pages/public/`, layout in
  `src/components/layout/PublicLayout.jsx`): Home, About, Programs, and
  Contact, sharing the platform's brand (navy header, logo, EN/FR toggle)
  but with their own nav/footer instead of the dashboard chrome. Content is
  placeholder copy grounded in the build brief (Prepa program, mentorship,
  olympiads/career orientation, the Open Dreams scholarship partnership) —
  clearly a first draft for MIA to replace with real copy. The homepage's
  stats strip and "Where We Operate" region badges aren't hardcoded numbers —
  they're pulled live from the same mock data layer the platform uses
  (`useRegions`/`useCenters`/`useMentors`/`useCategories`/
  `useRegionalSupervisors`), so creating/deleting a region or center in the
  platform immediately shows up on the public homepage too. The Contact
  page's form is a mock submit (no backend) with a visible "nothing was
  actually sent" note, consistent with the rest of the prototype.
- **National Supervisor** (new top of the hierarchy): sees a cross-region
  summary (students/centers/at-risk/incomplete-data per region) and can drill
  into any region's full dashboard — reusing the Regional Supervisor's own
  dashboard and drill-down screens rather than a parallel set, so the two
  views can never drift apart. Has full CRUD over Regional Supervisor
  accounts ("Manage Regional Supervisors") but does not reach into a region's
  Coordinators/HODs/Center Coordinators directly — that stays each Regional
  Supervisor's job within their own region.
- **Admin management**: the Regional Supervisor has a "Manage Admins" screen
  (create/edit/delete Regional Coordinators, HODs, and Center Coordinators —
  each is a real login-capable account under the hood). Center Coordinators
  get a "Manage Mentors" screen scoped to their own center — mentors are
  "owned" by whichever center coordinator created them, but a mentor's own
  mentee list can still span other centers/categories, unchanged from before.
  Mentors themselves are not managed by the Regional Supervisor.
- **Mock authentication**: a real login form (email + password) resolves
  which of the mock accounts you are and routes you straight to your
  role-scoped dashboard — there's no "pick any role" free selector anymore.
  Route protection (`ProtectedRoute`) redirects to `/login` if you're not
  logged in or don't hold the role a route requires. See "Authentication"
  below for how this maps onto Supabase Auth later.
- **Region & Center management**: the National Supervisor can
  create/edit/delete Regions ("Manage Regions") to expand MIA Prepa into new
  territory or clean up ones never used; each Regional Supervisor can
  create/edit/delete Centers within their own region ("Manage Centers") as
  it grows. Deleting either is blocked with a clear message if it still has
  dependent data (a region with centers or a supervisor; a center with
  students, a coordinator, or mentors) — see "Regions & Centers" below.
- **5 role dashboards**: Regional Supervisor, Regional Coordinator, HOD
  (read-only), Center Coordinator, Mentor — plus the no-login shared student
  view.
- **Center Coordinator**: manual mark entry, Excel template download +
  mock-parsed bulk upload with a preview/confirm screen (valid rows vs. rows
  with issues), and shareable report links per student.
- **Mentor**: mentee list with sparklines + status tags, computed live
  against the mock scores (not hardcoded), mentee detail with full
  subject-by-subject charts and follow-up notes.
- **At-risk logic**: sudden drop (≥20%), sustained low (<50% for 2+ weeks),
  downward trend (regression slope over the last 3–4 weeks), and a separate
  "Incomplete Data" flag for missing marks — all computed client-side in
  `src/data/atRisk.js` against the mock score history, with thresholds as
  configurable values, not hardcoded.
- **Bilingual (EN/FR)**: a language toggle in the header and on the shared
  view, backed by a flat string dictionary — no heavy i18n library.
- **Charts**: Recharts line charts and sparklines, each with a "Show table"
  toggle for an accessible plain-number fallback.
- **Mobile-first**: the shared student view in particular is tuned for a
  narrow phone viewport, since that's the real-world delivery path.

## Authentication

Sign-in is real now — backed by Supabase Auth, not the mock `USERS` table.

- `src/data/supabaseClient.js` creates the Supabase client from
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`
  (gitignored, not committed).
- `supabase/001_profiles.sql` is the one-time migration (run in the
  Dashboard's SQL Editor): a `profiles` table mapping `auth.users.id` →
  `{ email, name, role, ref_id, context_label }`, RLS-enabled so a signed-in
  user can only read their own row.
- `src/data/api.js`'s `login({ email, password })` calls
  `supabase.auth.signInWithPassword()`, then fetches the matching `profiles`
  row and resolves it into the same "actor" shape every dashboard already
  expected (`resolveActorForUser({ role, refId })` — unchanged logic, just
  fed from a real profile instead of a mock `USERS` record). `logout()` calls
  `supabase.auth.signOut()`. `getCurrentSession()` restores whatever session
  Supabase already has persisted in `localStorage`, so a page refresh keeps
  you logged in via a real JWT instead of a `sessionStorage` blob.
- `src/context/RoleContext.jsx` calls `getCurrentSession()` on mount and
  subscribes to `supabase.auth.onAuthStateChange` (so an expired/revoked
  token or a sign-out in another tab reflects here too). It exposes a
  `loading` flag while that initial restore is in flight; `ProtectedRoute`
  waits on it instead of bouncing a signed-in user to `/login` for one frame.
- `scripts/seed-auth-users.mjs` is a one-time (idempotent) script that
  creates a real Supabase Auth user + `profiles` row for every mock account
  in `mockData.js`'s `USERS` table, all sharing the `mia2026` demo password.
  Run it with the **secret** key (Project Settings → API), never the
  publishable key:
  `SUPABASE_URL=... SUPABASE_SECRET_KEY=... npx vite-node scripts/seed-auth-users.mjs`
  (needs `vite-node` since `mockData.js` uses extensionless imports that
  plain Node ESM can't resolve — `npm install --no-save vite-node` first).

`mockData.js`'s `USERS` table and `scripts/seed-auth-users.mjs` are now only
useful for **local re-seeding** (e.g. spinning up a fresh Supabase project
for development) — the login screen no longer has a demo-accounts picker
(`getDemoAccounts()` was removed along with it), since the live database has
no mock accounts to show. Every entity — regions, categories/programs,
subjects, centers, the five staff-role tables, students, assessments,
scores, follow-up notes, outcomes — is real Postgres, created through the
app itself; see "Getting started with real data" above and "Data layer"
below.

Row-Level Security is now the real access-control boundary (see "Data layer"
below) — `ProtectedRoute` is still only a UX convenience (redirect before a
doomed data fetch, and hiding nav items a role shouldn't see), not the thing
actually stopping a signed-in user from reading another region's data; RLS
is what does that now, enforced by Postgres regardless of what the client
asks for.

### Staff account provisioning

Creating a real Supabase Auth login needs the **secret** key
(`auth.admin.createUser`/`updateUserById`/`deleteUser`), which must never
reach client code — so that one piece runs in
`supabase/functions/manage-staff-account/index.ts`, a Supabase Edge Function
(deployed via `supabase functions deploy manage-staff-account --project-ref
<ref> --use-api`, no Docker required). The client still creates/updates/
deletes the underlying org-table row itself (regional_coordinators/hods/
center_coordinators/mentors/regional_supervisors — RLS-scoped, unchanged);
`src/data/api.js`'s `manageStaffAccount()` helper then calls the function
(`supabase.functions.invoke('manage-staff-account', { body })`) to attach
(or detach) the actual login:

- **Create**: org row first, then the function creates the Auth user +
  `profiles` row. If the function call fails, the org row is rolled back
  (deleted) so a Regional Coordinator/HOD/Center Coordinator/Mentor/Regional
  Supervisor row never exists without a working login, or vice versa.
- **Update**: only calls the function when `name`/`email`/`password` are
  actually being changed; org-table-only edits (e.g. reassigning a Center
  Coordinator to a different center) skip it entirely.
- **Delete**: the function runs *before* the org row is deleted — deleting a
  HOD's login while their subject assignment still exists, for example — so
  the function can still derive the correct region/center to authorize
  against.

The function **re-derives authorization from scratch** server-side (it runs
with service_role, which bypasses RLS, so it can't just trust the caller's
claims): it reads the caller's own `profiles` row, then mirrors the same
scoping rules as the RLS write policies in `002_full_schema.sql` (national
Supervisor only for Regional Supervisors; Regional Supervisor scoped to
their own region for Regional Coordinator/HOD/Center Coordinator; Center
Coordinator scoped to their own center for Mentors) before touching
`auth.users`. Verified directly: a Regional Supervisor's valid session token
gets a `403 forbidden` when it tries to touch a Center Coordinator outside
their own region, even calling the function's HTTP endpoint directly.

`src/data/api.js` also caches the `profiles` table itself (`_profiles`) and
reads every admin/mentor table's email from it — the mock `_users` array
(and `getDemoAccounts()`) were removed entirely once the login screen's
demo-accounts picker went away.

### Admin & mentor CRUD

`createAdmin` / `updateAdmin` / `deleteAdmin`, `createMentor` /
`updateMentor` / `deleteMentor`, and `createRegionalSupervisor` /
`updateRegionalSupervisor` / `deleteRegionalSupervisor` write straight to the
`regional_coordinators` / `hods` / `center_coordinators` / `mentors` /
`regional_supervisors` tables (see "Data layer"), then update the matching
in-memory cache array so the current session's UI reflects the change
without a full reload, then calls `manageStaffAccount()` (see "Staff account
provisioning" above) to create/update/delete the real login. A HOD's
`subjectId` reassignment clears whichever other HOD previously held that
subject (a subject has exactly one HOD); a Regional Supervisor's `regionId`
reassignment likewise
displaces whoever supervised that region before — both forms show a warning
naming who gets displaced before you save.

`getAdmins(role, regionId)` powers the Regional Supervisor's screen (Regional
Coordinator / HOD / Center Coordinator — **not** Mentor), filtered to the
acting Regional Supervisor's own region so admins from other regions are
never visible or editable. `getMentorsByCenter(centerId)` powers the Center
Coordinator's screen, filtered to mentors whose `centerId` matches the
logged-in coordinator's own center. A mentor's `centerId` is just who manages
their account — their mentee list (via `mentorId` on `Student`) is unrelated
and can span other centers, but not other regions (mentors are assigned from
a per-region pool at mock-data-generation time, since a mentor's oversight
naturally sits under one Regional Supervisor).

### Regions & Centers

`regions` and `centers` are real tables — `createRegion`/`updateRegion`/
`deleteRegion` and `createCenter`/`updateCenter`/`deleteCenter` write to
Supabase (then update the in-memory `_regions`/`_centers` cache so the
current session's UI reflects it immediately). `Category` carries a
`regionId`, so two regions can each run their own
"Engineering" as fully separate records — same pattern already used for HODs
being distinct per category even when the subject name repeats. Nothing else
needed a direct `regionId` field — a student's region is derived through
their center/category, a Regional Coordinator's/HOD's region through their
category/subject, and so on; `NATIONAL_SUPERVISOR` is a fixed singleton —
there is exactly one, not managed via any CRUD screen (only *which* Regional
Supervisor covers *which* region is CRUD-managed, via "Manage Regional
Supervisors").

**Region CRUD** ("Manage Regions", National Supervisor only): create just
takes a `name`; a newly-created region has 0 centers and shows up
immediately in the region dropdown on "Manage Regional Supervisors" and the
center-creation form below. `deleteRegion` is blocked
(`{ success: false, error: 'region_not_empty' }`) if the region still has any
centers or a Regional Supervisor assigned — tearing down a populated region
would cascade through students/scores/coordinators/mentors far too broadly
for a single click, so the realistic path here is removing a region that was
added by mistake or never staffed (Center/Littoral, before anyone signs up).

**Center CRUD** ("Manage Centers", Regional Supervisor only, scoped to their
own region the same way "Manage Admins" is): create takes `name` + `location`
and is automatically stamped with the acting supervisor's `regionId` — no
region picker needed, and no way to create a center in another region.
`deleteCenter` is blocked the same way if the center still has students, a
Center Coordinator, or mentors based there. Both delete-guard messages are
surfaced as a plain `window.alert` (not a form error) since the delete
action fires straight from a table row, with no form open to show it in.

`getRegionalSummary(regionId)` and `getMarkEntryStatus(regionId)` are what
both the Regional Supervisor's own dashboard and the National Supervisor's
drill-in call — `RegionalSupervisorDashboard.jsx` /
`CenterDrillDown.jsx` / `CategoryDrillDown.jsx` read `regionId` from the
route (`/national/region/:regionId/...`) when present, falling back to the
logged-in actor's own `regionId` otherwise (`/supervisor/...`), so it's the
same screen either way. `getNationalSummary()` aggregates
`getRegionalSummary()` per region rather than recomputing anything, so the
two levels of the dashboard can never disagree with each other.

### Programs & Subjects

"Program" is the UI-facing name for the `categories` table/`Category`
concept (Engineering, Medicine, Technical) — display-text-only rename (see
`src/i18n/strings.js`); internal identifiers (`categoryId`, `getCategories`,
`CategoryDrillDown.jsx`, the `categories` table itself) are unchanged.

**Program CRUD** ("Manage Programs", Regional Supervisor only, scoped to
their own region same as "Manage Centers"): create takes just a `name`,
auto-stamped with the acting supervisor's `regionId`, and shows up
immediately in the category dropdown on "Manage Admins" — assigning a
Regional Coordinator to a brand-new program reuses that existing flow
unchanged, no separate "assign coordinator" step was built.
`deleteCategory` is blocked (`category_not_empty`) if the program still has
any subjects, students, or an assigned Regional Coordinator.

**Subject CRUD** ("Manage Subjects", Regional Coordinator only, scoped to
their own program): create takes `name` + `maxScore`, auto-stamped with the
acting coordinator's `categoryId`. Each subject's `maxScore` is the *live*
value used for new assessments/mark entry/Excel upload going forward;
already-recorded `scores`/`assessments` keep whatever max score was in
effect when they were entered (`score.maxScore`, stored per-row) — changing
a subject's max score later never rewrites past percentages. `deleteSubject`
is blocked (`subject_not_empty`) once real data exists (any assessment or
score recorded); a subject with only a HOD assigned and no data yet deletes
freely, since nothing else references `subjects.hod_id`.

### Mentor assignment

A Center Coordinator's own roster (`CenterCoordinatorDashboard.jsx`) has an
editable "Mentor" column — a `<select>` scoped to mentors at that same
center (`useMentorsByCenter`), instead of the plain read-only text every
other screen that renders `RosterTable` still shows (`CenterDrillDown.jsx`/
`CategoryDrillDown.jsx` pass neither `mentorOptions` nor `onMentorChange`, so
they're unaffected — `RosterTable`'s mentor cell only becomes an editable
dropdown when both are supplied). Picking a mentor (or "Unassigned") calls
`updateStudentMentor(studentId, mentorId)`, which writes `students.mentor_id`
directly — the one RLS write policy on `students` that exists for a
non-national/regional/HOD role, scoped to the acting coordinator's own
`center_id` (`supabase/005_student_mentor_assignment.sql`).

### Student enrollment

A Center Coordinator can enroll, edit, and withdraw students at their own
center (`CenterCoordinatorDashboard.jsx` — "Enroll student" button, plus
Edit/Withdraw row actions rendered through `RosterTable`'s existing
`extraAction` slot). Backed by `supabase/006_student_enrollment.sql` — no
new UPDATE policy was needed there; `005_student_mentor_assignment.sql`'s
existing policy is row-level, not column-level, so it already covered
editing `name`/`category_id`/`status`, not just `mentor_id`.

**Matricule** (`generateMatricule()` in `api.js`): University-of-Bamenda
style, `MIA{YY}{CC}{P}{NNN}` — e.g. `MIA26ABE001` for a 2026 Engineering
student at a center whose name starts "Ab...". The sequence number is
scoped to the *exact generated prefix string*, not the literal
`center_id`/`category_id` — this is what stops two centers or programs that
happen to produce the same code (e.g. two centers both starting "Ba...")
from colliding; they'd just share one counter instead. A unique index on
`student_code` is the database-level backstop if a race ever produces a
duplicate anyway (insert fails, coordinator retries and gets a fresh number).

**Withdraw is a soft-delete** (`updateStudentStatus` sets `status =
'withdrawn'`) — there's no hard `deleteStudent`/DELETE policy at all. A
matricule, once issued, isn't destroyed (mirrors a real university), which
sidesteps deciding what happens to a withdrawn student's existing
scores/follow-up notes/outcomes. Withdrawn students disappear from
mark-entry and from the region/program/subject aggregate counts
(`getManualEntryTable`, `getMarkEntryStatus`, `getRegionalSummary`,
`getCategorySummary`, `getSubjectSummary` all gained a `status !==
'withdrawn'` filter) but **stay visible** — tagged "Withdrawn" — on the
coordinator's own roster (`getStudentsWithStatus`/`getMenteesWithStatus`
short-circuit straight to that status instead of running at-risk analysis
on someone no longer active), and can be reactivated.

**Excel upload now really parses a file** — `mockParseExcelUpload` is gone;
`parseExcelUpload({ file, categoryId, centerId })` reads an actual uploaded
file and matches students by matricule. Deliberately **CSV only, not real
`.xlsx`**: the `xlsx` (SheetJS) npm package has two unpatched high-severity
advisories (prototype pollution, ReDoS) with no fix available, and this
parses untrusted user-uploaded files — not worth the risk. `src/data/csv.js`
is a small dependency-free CSV parser instead; "Download template" already
only ever generated CSV, so nothing about the actual round-trip changes for
the coordinator, just the file-picker's `accept` narrows to `.csv`. The
header's ID column accepts "Matricule" or "Student ID"; subject columns are
matched by name (case-insensitive) against the chosen program's subjects.
`confirmExcelUpload` also picked up a real bug fix here: a blank mark cell
used to be saved as a score of **0** (`Number('')`) — it's now correctly
skipped instead.

### Confirm/alert dialogs

`window.confirm()`/`window.alert()` (the "localhost says" browser chrome)
are gone — every delete confirmation and blocked-delete message now goes
through `ConfirmDialogProvider` (`src/components/ConfirmDialogProvider.jsx`,
mounted once in `App.jsx`). `useConfirmDialog()` exposes `confirm()`/`alert()`,
both `Promise`-based so call sites barely changed shape (`await confirm(...)`
in place of the old blocking call). Red icon + red "Delete" button for an
active destructive confirmation; amber info icon for a plain "here's why
that didn't happen" alert — kept visually distinct on purpose so a blocked
action doesn't read as alarming as the delete prompt itself.

## Data layer

Every component/hook still goes through **one data-access layer**
(`src/data/api.js`) — that pattern is what made this migration a
`src/data/api.js`-only change with zero edits to any component or hook.

- **Schema** (`supabase/002_full_schema.sql`): 14 tables, one per entity in
  the original mock dataset (regions, categories, subjects, centers, the
  five staff-role tables, students, assessments, scores, follow_up_notes,
  outcomes) plus `at_risk_config`. Primary keys are `text` and match the IDs
  already used in `mockData.js` (`region-nw`, `stu-001`, ...) — no ID
  remapping, so `profiles.ref_id` (from the auth migration) keeps pointing
  at the right rows unchanged. `students.mentor_id`, `follow_up_notes.mentor_id`,
  `outcomes.recorded_by`, and `scores.entered_by` are deliberately plain text,
  not real foreign keys — `deleteMentor()` intentionally leaves these
  pointing at a since-deleted mentor (rendered as "—") rather than cascading
  or blocking the delete, which a real FK would force one way or the other.
- **RLS**: enabled on every table. Org/staff tables (regions through
  mentors, plus assessments/at_risk_config) allow SELECT to any signed-in
  user — staff-directory/schedule metadata, not sensitive, matching how the
  app already treated it. `students`/`scores`/`follow_up_notes`/`outcomes`
  are scoped per-role via a shared `can_view_student(sid)` SQL function
  (National sees everyone; Regional Supervisor their region; Regional
  Coordinator/HOD their category/subject; Center Coordinator their center;
  Mentor only their own mentees) — enforced by Postgres itself, so even a
  hand-crafted REST call with a valid session token can't see past it.
  Writes are scoped the same way a level up (e.g. only the acting Center
  Coordinator's own students can have scores written for them). The one
  deliberate carve-out: `/share/:studentId` works with **no session at
  all** by design, so it goes through a `SECURITY DEFINER` RPC function
  (`get_shared_student_bundle`) that bypasses RLS internally but only ever
  returns the one requested student — never opened up as a blanket
  anonymous SELECT policy. (A second such function, `list_students_for_share`,
  used to back an anonymous "browse all students" picker on the login
  page; that picker was removed as a public-facing risk — the SQL function
  itself is still in the database, unused, harmless to leave or drop.)
- **Data loading** (`src/data/api.js`): `loadAllData()` fetches all 14
  tables in parallel into local arrays (`_regions`, `_students`, `_scores`,
  etc.) once per signed-in session — cached behind `ensureDataLoaded()`,
  reset via `resetDataCache()` on every login/logout so a second sign-in in
  the same tab never keeps a stale, differently-scoped cache. Because RLS
  scopes what each fetch returns, a Mentor's cache naturally only ever
  contains their own mentees — no extra application-side filtering needed
  on top of that. All the at-risk analysis / summary logic
  (`getStudentAnalysis`, `getRegionalSummary`, `getMarkEntryStatus`, etc.)
  is **unchanged** from the mock-data version — it still does plain
  `.filter()`/`.find()` over these arrays; only where the data comes from
  changed.
- **Writes**: every create/update/delete (region/center/admin/mentor CRUD,
  `saveManualMarks`, `confirmExcelUpload`, `addFollowUpNote`) calls Supabase
  first, then updates the local cache array to match — so the current
  session's UI reflects the change immediately without needing a reload,
  while the write itself is real and now genuinely persists.
- **Seeding** (`scripts/seed-full-data.mjs`): one idempotent script
  (service_role key, run via `vite-node` — plain Node can't resolve
  `mockData.js`'s extensionless imports) that upserts every array from
  `mockData.js` into its table. Safe to re-run.

At-risk threshold config now lives in the `at_risk_config` table
(`getAtRiskConfig()` reads it) rather than the `AT_RISK_THRESHOLD_DEFAULTS`
constant — nothing edits it from the UI yet, but it's real infrastructure
the moment an admin-editable version is wanted.

## Known simplifications

- Excel upload doesn't parse a real `.xlsx`/`.csv` file; it mock-parses a
  fixed example (with a couple of deliberately invalid rows) regardless of
  the file you select, so the preview/confirm UX can be exercised end to
  end. Real parsing (e.g. `xlsx`/`exceljs`) is a Phase 2 concern once a
  backend exists to validate against.
- "Download report" opens the printable shared view in a new tab (use the
  browser's print/save-as-PDF) rather than generating a PNG/PDF file
  directly — that's a reasonable Phase 2 addition once reports need to be
  sent as attachments rather than links.
- No offline queueing yet (per the build brief, that's a deliberate
  later addition once there's a real backend to sync against).
