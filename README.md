# MIA North West — Student Performance Platform (Frontend Prototype)

A clickable Vite + React frontend for MIA NW's student performance tracking
platform, running entirely on mock/hardcoded data. No backend, no Supabase —
this phase is for getting a feel for every role's dashboard and the at-risk
flagging logic before wiring up a real database.

## Running it

```bash
npm install
npm run dev
```

Open the printed local URL. You'll land on a login screen — sign in with
one of the mock accounts to reach that person's role-scoped dashboard, or
click "Show demo accounts" to see (and one-click sign in as) every mock
account grouped by role. Every demo account shares the password `mia2026`.
Use "Log out" in the header at any time to return to the login screen.

There's also a "Shared Student View (no login)" picker on the login page —
this simulates the read-only link a student/parent would receive over
WhatsApp (`/share/:studentId`), with no navigation chrome and no
authentication (students never get accounts, per the build brief).

## What's here

- **Admin management**: the Regional Supervisor has a "Manage Admins" screen
  (create/edit/delete Regional Coordinators, HODs, and Center Coordinators —
  each is a real login-capable account under the hood). Center Coordinators
  get a "Manage Mentors" screen scoped to their own center — mentors are
  "owned" by whichever center coordinator created them, but a mentor's own
  mentee list can still span other centers/categories, unchanged from before.
  Mentors themselves are not managed by the Regional Supervisor.
- **Mock authentication**: a real login form (email + password) resolves
  which of the 19 mock accounts you are and routes you straight to your
  role-scoped dashboard — there's no "pick any role" free selector anymore.
  Route protection (`ProtectedRoute`) redirects to `/` if you're not logged
  in or don't hold the role a route requires. See "Authentication" below for
  how this maps onto Supabase Auth later.
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

`src/data/mockData.js` has a `USERS` table (19 accounts — the Regional
Supervisor, both Regional Coordinators, all 8 HODs, all 3 Center
Coordinators, all 5 Mentors) with `email` / `password` / `role` / `refId`.
`src/data/api.js`'s `login({ email, password })` checks credentials against
that table and resolves the matched account into the exact same "actor"
shape (`{ id, name, categoryId }`, `{ ...hod, subject }`, etc.) every
dashboard already expected from the old role-picker — so no dashboard code
changed when auth was added, only how `role`/`actor` get set.

`src/context/RoleContext.jsx` still just holds `{ role, actor }` in
`sessionStorage` (a page refresh keeps you logged in; closing the tab logs
you out) — `login()` populates it now instead of a free picker.
`src/constants/roles.js` holds the plain `ROLES` string enum so the data
layer doesn't need to import from the context/UI layer.

**Swapping in real Supabase Auth**: replace the body of `login()` in
`api.js` with a `supabase.auth.signInWithPassword()` call, and resolve the
returned user's role/actor from your `profiles`/role tables instead of the
mock `USERS` array — the function's return shape (`{ success, role, actor }`)
is the only contract the rest of the app relies on. Route protection should
also move from the frontend-only `ProtectedRoute` check to Supabase Row-Level
Security policies at the database level, per the build brief — `ProtectedRoute`
is a UX convenience (redirect before a doomed data fetch), not a security
boundary, even once real auth is wired up.

### Admin & mentor CRUD

`REGIONAL_COORDINATORS`, `HODS`, `CENTER_COORDINATORS`, `MENTORS`, `SUBJECTS`
(for `hodId` reassignment), and `USERS` all now live as mutable in-memory
copies inside `api.js` (`_regionalCoordinators`, `_hods`, etc.) rather than
being read directly from the frozen `mockData.js` arrays — that's what makes
`createAdmin` / `updateAdmin` / `deleteAdmin` and `createMentor` /
`updateMentor` / `deleteMentor` actually stick for the session. Every
create/update also writes the matching `USERS` entry, so a newly-created
account can log in immediately with the credentials just set. A HOD's
`subjectId` reassignment clears whichever other HOD previously held that
subject (a subject has exactly one HOD) — the "Manage Admins" form shows a
warning naming who gets displaced before you save.

`getAdmins(role)` powers the Regional Supervisor's screen (Regional
Coordinator / HOD / Center Coordinator — **not** Mentor); `getMentorsByCenter
(centerId)` powers the Center Coordinator's screen, filtered to mentors whose
`centerId` matches the logged-in coordinator's own center. A mentor's
`centerId` is just who manages their account — their mentee list (via
`mentorId` on `Student`) is unrelated and can still span other centers.

## Architecture — what to touch when Supabase comes in

Every component/hook goes through **one data-access layer**, so swapping
mock data for real Supabase queries later should only touch two files:

```
src/data/mockData.js   — hardcoded dataset (categories, subjects, centers,
                          students, mentors, scores, follow-up notes, outcomes)
src/data/api.js         — the ONLY module components import data through.
                          Every exported function is async and currently
                          returns mock data after a simulated network delay.
                          Swap the internals of these functions for Supabase
                          calls; keep the function signatures the same and
                          nothing above this layer needs to change.
```

On top of `api.js` sits `src/hooks/index.js` — named hooks
(`useStudents`, `useMentees`, `useAtRiskFlags`, etc.) that wrap `api.js`
calls in a small `useAsync` helper (`src/hooks/useAsync.js`). Components
only ever import from `src/hooks`, never from `src/data/mockData.js` or
`src/data/api.js` directly (mutating actions like saving marks or adding a
follow-up note call `src/data/api.js` functions directly from the
component, since they're one-off writes rather than data to subscribe to —
still routed through the same file).

At-risk threshold config (`AT_RISK_THRESHOLD_DEFAULTS` in `mockData.js`) is
also a good spot to eventually move into a Supabase-backed settings table if
you want the 20%/50%/2-week/3–4-week values to be admin-editable later.

## Known simplifications (mock-data phase only)

- Manual mark entry / Excel upload / follow-up notes mutate an in-memory
  copy of the mock data — changes persist for the session but reset on a
  full page reload.
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
