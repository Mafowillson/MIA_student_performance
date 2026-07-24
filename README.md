# MIA — Model Initiative of Africa (Frontend Prototype)

A Vite + React frontend for MIA's public website, now backed end-to-end by a
real Supabase project: Auth, plus every entity from the original mock dataset
(regions, categories, subjects, centers, the five staff-role tables,
students, assessments, scores, follow-up notes, outcomes) as real Postgres
tables with row-level security. See "Authentication" and "Data layer" below.
`src/data/mockData.js` still exists as the deterministic seed data (and the
source of truth for `scripts/seed-full-data.mjs`), but the running app no
longer reads from it directly except for a few fixed schedule constants
(weeks, term, max score) that nothing in the UI edits.

The **Student Performance Platform is one feature of the broader MIA site**,
not the whole app: `/`, `/about`, `/programs`, and `/contact` are a public
marketing site anyone can browse with no login; the platform (role login +
dashboards) lives behind a "Platform Login" button in the header, at
`/login` onward. More MIA functionality is expected to land here over time.

The platform itself spans multiple regions (originally NW-only). North West
and South West are fully populated with their own centers, students, and
staff; Center and Littoral start out as registered-but-empty regions with no
data or Regional Supervisor — a live demo of onboarding a brand-new region
rather than a hardcoded empty state. Both the National Supervisor (regions)
and each Regional Supervisor (centers within their own region) can fully
create/edit/delete these as the program grows — see "Regions & Centers"
below.

## Running it

```bash
npm install
npm run dev
```

Open the printed local URL and you'll land on the **public site** —
Home / About / Programs / Contact, with a "Platform Login" button in the
header. Click it (or go to `/login`) to sign in with one of the mock
accounts and reach that person's role-scoped dashboard, or click "Show demo
accounts" to see (and one-click sign in as) every mock account grouped by
role. Every demo account shares the password `mia2026`. Use "Log out" in the
dashboard header to return to `/login` (fast re-entry for switching between
demo roles); clicking the MIA logo/name from inside the platform takes you
back out to the public site at `/`.

There's also a "Shared Student View (no login)" picker on the login page —
this simulates the read-only link a student/parent would receive over
WhatsApp (`/share/:studentId`), with no navigation chrome and no
authentication (students never get accounts, per the build brief).

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

**What's still mock**: only the `USERS` table (demo-accounts list + which
mock account maps to which role/refId). `createRegionalSupervisor` /
`createAdmin` / `createMentor` still only push a row into the in-memory
`_users` array, so accounts created through the Manage screens **can't
actually sign in yet** — that lands once those flows call a
service-role-backed Supabase Edge Function (client code can never hold the
secret key `auth.admin.createUser` needs). Every other entity — regions,
categories, subjects, centers, the five staff-role tables, students,
assessments, scores, follow-up notes, outcomes — is real Postgres now; see
"Data layer" below.

Row-Level Security is now the real access-control boundary (see "Data layer"
below) — `ProtectedRoute` is still only a UX convenience (redirect before a
doomed data fetch, and hiding nav items a role shouldn't see), not the thing
actually stopping a signed-in user from reading another region's data; RLS
is what does that now, enforced by Postgres regardless of what the client
asks for.

### Admin & mentor CRUD

`createAdmin` / `updateAdmin` / `deleteAdmin`, `createMentor` /
`updateMentor` / `deleteMentor`, and `createRegionalSupervisor` /
`updateRegionalSupervisor` / `deleteRegionalSupervisor` write straight to the
`regional_coordinators` / `hods` / `center_coordinators` / `mentors` /
`regional_supervisors` tables (see "Data layer"), then update the matching
in-memory cache array so the current session's UI reflects the change
without a full reload. Every create/update also writes the matching `USERS`
entry (used by the demo-accounts list and `resolveActorForUser`) — but per
"Authentication" above, that's still mock bookkeeping, not a real account,
until admin creation moves to a Supabase Edge Function. A HOD's `subjectId`
reassignment
clears whichever other HOD previously held that subject (a subject has
exactly one HOD); a Regional Supervisor's `regionId` reassignment likewise
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
  deliberate carve-out: `/share/:studentId` and the Login page's "preview a
  shared student" dropdown work with **no session at all** by design, so
  they go through two `SECURITY DEFINER` RPC functions
  (`get_shared_student_bundle`, `list_students_for_share`) that bypass RLS
  internally but only ever return the one requested student (or a minimal
  name-only roster) — never opened up as a blanket anonymous SELECT policy.
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
