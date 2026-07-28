// Data-access layer: the ONLY module components/hooks should import data through.
// Regions/categories/subjects/centers, the five staff-role tables, students,
// assessments, scores, follow-up notes, and outcomes all live in real
// Supabase tables now (see supabase/002_full_schema.sql) — this file loads
// them into local arrays once per session (`ensureDataLoaded()`) and keeps
// those arrays in sync after every mutation, so the at-risk analysis /
// summary logic below (which was already written against plain arrays)
// didn't need to change shape, just its data source.
import {
  NATIONAL_SUPERVISOR,
  WEEKS,
  CURRENT_WEEK,
  USERS as USERS_SEED,
  DEMO_PASSWORD,
} from './mockData';
import { analyzeSubjectHistory, computeStudentStatus, computeTrendNarrative } from './atRisk';
import { ROLES } from '../constants/roles';
import { supabase } from './supabaseClient';
import { parseCsv } from './csv';

function delay(value, ms = 280) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Row <-> app-shape mappers (Postgres snake_case <-> the camelCase shape
// every function below already expects)
// ---------------------------------------------------------------------------
const mapRegion = (r) => ({ id: r.id, name: r.name });
const mapCategory = (c) => ({ id: c.id, name: c.name, regionId: c.region_id });
const mapSubject = (s) => ({
  id: s.id,
  name: s.name,
  categoryId: s.category_id,
  hodId: s.hod_id,
  maxScore: Number(s.max_score),
});
const mapCenter = (c) => ({ id: c.id, name: c.name, location: c.location, regionId: c.region_id });
const mapRegionalSupervisor = (rs) => ({ id: rs.id, name: rs.name, regionId: rs.region_id });
const mapRegionalCoordinator = (c) => ({ id: c.id, name: c.name, categoryId: c.category_id });
const mapHod = (h) => ({ id: h.id, name: h.name });
const mapCenterCoordinator = (c) => ({ id: c.id, name: c.name, centerId: c.center_id });
const mapMentor = (m) => ({ id: m.id, name: m.name, centerId: m.center_id });
const mapStudent = (s) => ({
  id: s.id,
  studentCode: s.student_code,
  name: s.name,
  centerId: s.center_id,
  categoryId: s.category_id,
  mentorId: s.mentor_id,
  enrollmentDate: s.enrollment_date,
  status: s.status,
});
const mapAssessment = (a) => ({
  id: a.id,
  subjectId: a.subject_id,
  week: a.week,
  date: a.date,
  termId: a.term_id,
  maxScore: Number(a.max_score),
});
const mapScore = (sc) => ({
  id: sc.id,
  studentId: sc.student_id,
  assessmentId: sc.assessment_id,
  subjectId: sc.subject_id,
  week: sc.week,
  marksObtained: Number(sc.marks_obtained),
  maxScore: Number(sc.max_score),
  enteredBy: sc.entered_by,
  enteredAt: sc.entered_at,
});
const mapFollowUpNote = (n) => ({ id: n.id, studentId: n.student_id, mentorId: n.mentor_id, date: n.date, note: n.note });
const mapOutcome = (o) => ({
  id: o.id,
  studentId: o.student_id,
  outcomeType: o.outcome_type,
  institutionOrProgram: o.institution_or_program,
  date: o.date,
  note: o.note,
  recordedBy: o.recorded_by,
});
const mapProfile = (p) => ({ id: p.id, email: p.email, name: p.name, role: p.role, refId: p.ref_id, contextLabel: p.context_label });
const mapAtRiskConfig = (c) => ({
  suddenDropPct: Number(c.sudden_drop_pct),
  sustainedLowPct: Number(c.sustained_low_pct),
  sustainedLowWeeks: c.sustained_low_weeks,
  trendWeeks: c.trend_weeks,
  trendSlopeThreshold: Number(c.trend_slope_threshold),
  incompleteDataWeeks: c.incomplete_data_weeks,
});

const toAssessmentRow = (a) => ({
  id: a.id,
  subject_id: a.subjectId,
  week: a.week,
  date: a.date,
  term_id: a.termId,
  max_score: a.maxScore,
});
const toScoreRow = (sc) => ({
  id: sc.id,
  student_id: sc.studentId,
  assessment_id: sc.assessmentId,
  subject_id: sc.subjectId,
  week: sc.week,
  marks_obtained: sc.marksObtained,
  max_score: sc.maxScore,
  entered_by: sc.enteredBy,
  entered_at: sc.enteredAt,
});
const toFollowUpNoteRow = (n) => ({ id: n.id, student_id: n.studentId, mentor_id: n.mentorId, date: n.date, note: n.note });

// ---------------------------------------------------------------------------
// In-memory cache, loaded from Supabase once per signed-in session (RLS
// scopes what each fetch returns, so e.g. a Mentor's `_students`/`_scores`
// naturally only ever contains their own mentees — no extra filtering
// needed on top of what's already below). Reset on logout/re-login so a
// second sign-in in the same tab never keeps a stale, differently-scoped
// cache around.
// ---------------------------------------------------------------------------
let _regions = [];
let _categories = [];
let _subjects = [];
let _centers = [];
let _regionalSupervisors = [];
let _regionalCoordinators = [];
let _hods = [];
let _centerCoordinators = [];
let _mentors = [];
let _students = [];
let _assessments = [];
let _scores = [];
let _followUpNotes = [];
let _outcomes = [];
let _atRiskConfig = null;
let _profiles = []; // real accounts — id/email/role/refId, see manageStaffAccount()
let _users = USERS_SEED.map((u) => ({ ...u })); // still mock — only backs the demo-accounts list now

async function loadAllData() {
  const [
    regions,
    categories,
    subjects,
    centers,
    regionalSupervisors,
    regionalCoordinators,
    hods,
    centerCoordinators,
    mentors,
    students,
    assessments,
    scores,
    followUpNotes,
    outcomes,
    atRiskConfig,
    profiles,
  ] = await Promise.all([
    supabase.from('regions').select('*'),
    supabase.from('categories').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('centers').select('*'),
    supabase.from('regional_supervisors').select('*'),
    supabase.from('regional_coordinators').select('*'),
    supabase.from('hods').select('*'),
    supabase.from('center_coordinators').select('*'),
    supabase.from('mentors').select('*'),
    supabase.from('students').select('*'),
    supabase.from('assessments').select('*'),
    supabase.from('scores').select('*'),
    supabase.from('follow_up_notes').select('*'),
    supabase.from('outcomes').select('*'),
    supabase.from('at_risk_config').select('*').eq('id', 'default').maybeSingle(),
    supabase.from('profiles').select('*'),
  ]);

  _regions = (regions.data ?? []).map(mapRegion);
  _categories = (categories.data ?? []).map(mapCategory);
  _subjects = (subjects.data ?? []).map(mapSubject);
  _centers = (centers.data ?? []).map(mapCenter);
  _regionalSupervisors = (regionalSupervisors.data ?? []).map(mapRegionalSupervisor);
  _regionalCoordinators = (regionalCoordinators.data ?? []).map(mapRegionalCoordinator);
  _hods = (hods.data ?? []).map(mapHod);
  _centerCoordinators = (centerCoordinators.data ?? []).map(mapCenterCoordinator);
  _mentors = (mentors.data ?? []).map(mapMentor);
  _students = (students.data ?? []).map(mapStudent);
  _assessments = (assessments.data ?? []).map(mapAssessment);
  _scores = (scores.data ?? []).map(mapScore);
  _followUpNotes = (followUpNotes.data ?? []).map(mapFollowUpNote);
  _outcomes = (outcomes.data ?? []).map(mapOutcome);
  _atRiskConfig = atRiskConfig.data ? mapAtRiskConfig(atRiskConfig.data) : null;
  _profiles = (profiles.data ?? []).map(mapProfile);
}

// Calls the manage-staff-account Edge Function — the only thing in this
// file that can create/update/delete a REAL login (needs the service_role
// key, which must never reach client code). See
// supabase/functions/manage-staff-account/index.ts.
async function manageStaffAccount(payload) {
  const { data, error } = await supabase.functions.invoke('manage-staff-account', { body: payload });
  if (error) return { success: false, error: 'save_failed' };
  return data;
}

let dataLoadPromise = null;
function ensureDataLoaded() {
  if (!dataLoadPromise) dataLoadPromise = loadAllData();
  return dataLoadPromise;
}
// Called after every sign-in/session-restore (fresh, authenticated fetch)
// and on logout (drop whatever the previous session could see).
function resetDataCache() {
  dataLoadPromise = null;
  _regions = [];
  _categories = [];
  _subjects = [];
  _centers = [];
  _regionalSupervisors = [];
  _regionalCoordinators = [];
  _hods = [];
  _centerCoordinators = [];
  _mentors = [];
  _students = [];
  _assessments = [];
  _scores = [];
  _followUpNotes = [];
  _outcomes = [];
  _atRiskConfig = null;
  _profiles = [];
}

const LATEST_WEEK = WEEKS[WEEKS.length - 1].week;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
// Resolves a { role, refId } pair — a Supabase `profiles` row shape (see
// supabase/001_profiles.sql), also still used for the mock-only accounts
// created via the Manage* screens below — into the same "actor" shape every
// role already expects so nothing downstream of login() needs to know how
// the actor was resolved.
//
// Every non-national actor also gets an explicit `regionId` attached here
// (derived transitively where the record doesn't carry one directly: a
// Regional Coordinator's through their category, an HOD's through their
// subject's category, a Center Coordinator's/Mentor's through their center)
// so the app shell's nav can show "which region am I in" for any role
// without every consumer re-deriving it.
function resolveActorForUser(user) {
  switch (user.role) {
    case ROLES.NATIONAL_SUPERVISOR:
      return clone(NATIONAL_SUPERVISOR);
    case ROLES.REGIONAL_SUPERVISOR:
      return clone(_regionalSupervisors.find((rs) => rs.id === user.refId));
    case ROLES.REGIONAL_COORDINATOR: {
      const coordinator = _regionalCoordinators.find((c) => c.id === user.refId);
      const regionId = _categories.find((c) => c.id === coordinator?.categoryId)?.regionId ?? null;
      return clone({ ...coordinator, regionId });
    }
    case ROLES.HOD: {
      const hod = _hods.find((h) => h.id === user.refId);
      const subject = _subjects.find((s) => s.hodId === user.refId);
      const regionId = _categories.find((c) => c.id === subject?.categoryId)?.regionId ?? null;
      return clone({ ...hod, subject, regionId });
    }
    case ROLES.CENTER_COORDINATOR: {
      const coordinator = _centerCoordinators.find((c) => c.id === user.refId);
      const regionId = _centers.find((c) => c.id === coordinator?.centerId)?.regionId ?? null;
      return clone({ ...coordinator, regionId });
    }
    case ROLES.MENTOR: {
      const mentor = _mentors.find((m) => m.id === user.refId);
      const regionId = _centers.find((c) => c.id === mentor?.centerId)?.regionId ?? null;
      return clone({ ...mentor, regionId });
    }
    default:
      return null;
  }
}

// Fetches the `profiles` row (role + ref_id into the tables above) that a
// Supabase Auth user maps to. See supabase/001_profiles.sql for the table +
// RLS policy (a user may only read their own row).
async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
}

// Real Supabase Auth credential check, now against real org/student data too
// (see module header) — a successful login triggers a fresh, RLS-scoped
// `loadAllData()` before resolving the actor, so every screen the user hits
// next already has the right data cached.
export async function login({ email, password }) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error || !data.user) {
    return { success: false, error: 'invalid_credentials' };
  }
  const profile = await fetchProfile(data.user.id);
  if (!profile) {
    // Signed in fine, but no matching profiles row — treat as invalid
    // rather than half-logging someone in with no role/actor to show.
    await supabase.auth.signOut();
    return { success: false, error: 'invalid_credentials' };
  }
  resetDataCache();
  await ensureDataLoaded();
  const actor = resolveActorForUser({ role: profile.role, refId: profile.ref_id });
  return {
    success: true,
    role: profile.role,
    actor: { ...actor, email: profile.email },
  };
}

export async function logout() {
  await supabase.auth.signOut();
  resetDataCache();
}

// Called once on app load (and after refresh) to restore whatever session
// Supabase already has persisted in localStorage, re-resolving the full
// actor shape (and reloading the data cache) from the profile it maps to.
// Returns null if there's no live session or it no longer maps to a profile.
export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  if (!session) return null;
  const profile = await fetchProfile(session.user.id);
  if (!profile) return null;
  resetDataCache();
  await ensureDataLoaded();
  const actor = resolveActorForUser({ role: profile.role, refId: profile.ref_id });
  return {
    role: profile.role,
    actor: { ...actor, email: profile.email },
  };
}

// Used only by the login screen's "demo accounts" helper list — never
// exposes passwords. Still mock — see README "Authentication".
export async function getDemoAccounts() {
  return delay({
    password: DEMO_PASSWORD,
    accounts: _users.map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role,
      contextLabel: u.contextLabel,
    })),
  });
}

// ---------------------------------------------------------------------------
// Regions & National Supervisor management
// ---------------------------------------------------------------------------
export async function getRegions() {
  await ensureDataLoaded();
  return clone(_regions);
}

export async function getRegionById(id) {
  await ensureDataLoaded();
  return clone(_regions.find((r) => r.id === id) || null);
}

// { name }
export async function createRegion({ name }) {
  await ensureDataLoaded();
  const id = `region-${Date.now()}`;
  const { error } = await supabase.from('regions').insert({ id, name });
  if (error) return { success: false, error: 'save_failed' };
  _regions.push({ id, name });
  return { success: true, id };
}

export async function updateRegion(id, updates) {
  await ensureDataLoaded();
  const region = _regions.find((r) => r.id === id);
  if (!region) return { success: false, error: 'not_found' };
  const patch = {};
  if (updates.name != null) patch.name = updates.name;
  const { error } = await supabase.from('regions').update(patch).eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  if (updates.name != null) region.name = updates.name;
  return { success: true };
}

// Deleting a region is only allowed once it's genuinely unused — no centers
// and no Regional Supervisor assigned. A staffed/populated region (like NW
// or SW) cascades through far too much (centers, students, scores,
// coordinators, mentors) to safely tear down from a single click; the
// realistic use case here is removing a region that was added by mistake or
// never staffed (e.g. Center or Littoral before anyone signs up for them).
export async function deleteRegion(id) {
  await ensureDataLoaded();
  const idx = _regions.findIndex((r) => r.id === id);
  if (idx === -1) return { success: false, error: 'not_found' };

  const hasCenters = _centers.some((c) => c.regionId === id);
  const hasSupervisor = _regionalSupervisors.some((rs) => rs.regionId === id);
  if (hasCenters || hasSupervisor) {
    return { success: false, error: 'region_not_empty' };
  }

  const { error } = await supabase.from('regions').delete().eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  _regions.splice(idx, 1);
  return { success: true };
}

export async function getNationalSupervisor() {
  return clone(NATIONAL_SUPERVISOR);
}

export async function getRegionalSupervisors() {
  await ensureDataLoaded();
  const withDetails = _regionalSupervisors.map((rs) => ({
    ...rs,
    email: _profiles.find((p) => p.refId === rs.id)?.email ?? '',
    regionName: _regions.find((r) => r.id === rs.regionId)?.name ?? '',
  }));
  return clone(withDetails);
}

// Creates the org-table row first (RLS-protected, unchanged), then calls the
// manage-staff-account Edge Function to create the REAL Supabase Auth login
// — rolling back the org-row insert if that fails, so a Regional Supervisor
// row never exists without a matching, working account (or vice versa).
export async function createRegionalSupervisor({ name, email, password, regionId }) {
  await ensureDataLoaded();
  if (_profiles.some((p) => p.email.toLowerCase() === String(email).trim().toLowerCase())) {
    return { success: false, error: 'email_taken' };
  }
  const id = `rs-${Date.now()}`;
  // A region has exactly one Regional Supervisor — assigning this one to a
  // region that already has one displaces the previous holder (same pattern
  // as HOD-subject reassignment below).
  const displaced = _regionalSupervisors.filter((rs) => rs.regionId === regionId);
  if (displaced.length > 0) {
    const { error } = await supabase
      .from('regional_supervisors')
      .update({ region_id: null })
      .in('id', displaced.map((rs) => rs.id));
    if (error) return { success: false, error: 'save_failed' };
    displaced.forEach((rs) => { rs.regionId = null; });
  }

  const { error } = await supabase.from('regional_supervisors').insert({ id, name, region_id: regionId });
  if (error) return { success: false, error: 'save_failed' };
  _regionalSupervisors.push({ id, name, regionId });

  const account = await manageStaffAccount({
    action: 'create',
    role: ROLES.REGIONAL_SUPERVISOR,
    refId: id,
    name,
    email,
    password,
  });
  if (!account.success) {
    await supabase.from('regional_supervisors').delete().eq('id', id);
    _regionalSupervisors = _regionalSupervisors.filter((rs) => rs.id !== id);
    return account;
  }
  _profiles.push({ id: account.id, email, name, role: ROLES.REGIONAL_SUPERVISOR, refId: id, contextLabel: '' });
  return { success: true, id };
}

export async function updateRegionalSupervisor(id, updates) {
  await ensureDataLoaded();
  const record = _regionalSupervisors.find((rs) => rs.id === id);
  if (!record) return { success: false, error: 'not_found' };

  const patch = {};
  if (updates.name != null) patch.name = updates.name;
  if (updates.regionId != null && updates.regionId !== record.regionId) {
    const displaced = _regionalSupervisors.filter((rs) => rs.regionId === updates.regionId && rs.id !== id);
    if (displaced.length > 0) {
      const { error } = await supabase
        .from('regional_supervisors')
        .update({ region_id: null })
        .in('id', displaced.map((rs) => rs.id));
      if (error) return { success: false, error: 'save_failed' };
      displaced.forEach((rs) => { rs.regionId = null; });
    }
    patch.region_id = updates.regionId;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('regional_supervisors').update(patch).eq('id', id);
    if (error) return { success: false, error: 'save_failed' };
  }
  if (updates.name != null) record.name = updates.name;
  if (patch.region_id !== undefined) record.regionId = patch.region_id;

  if (updates.name != null || updates.email != null || updates.password) {
    const account = await manageStaffAccount({
      action: 'update',
      role: ROLES.REGIONAL_SUPERVISOR,
      refId: id,
      updates: { name: updates.name, email: updates.email, password: updates.password },
    });
    if (!account.success) return account;
    const profile = _profiles.find((p) => p.refId === id);
    if (profile) {
      if (updates.name != null) profile.name = updates.name;
      if (updates.email != null) profile.email = updates.email;
    }
  }
  return { success: true };
}

export async function deleteRegionalSupervisor(id) {
  await ensureDataLoaded();
  const idx = _regionalSupervisors.findIndex((rs) => rs.id === id);
  if (idx === -1) return { success: false, error: 'not_found' };
  // Delete the real login first (needs the org row to still exist for the
  // Edge Function's own authorization check), then the org row itself.
  const account = await manageStaffAccount({ action: 'delete', role: ROLES.REGIONAL_SUPERVISOR, refId: id });
  if (!account.success) return account;
  const { error } = await supabase.from('regional_supervisors').delete().eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  _regionalSupervisors.splice(idx, 1);
  _profiles = _profiles.filter((p) => p.refId !== id);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
export async function getCategories(filters = {}) {
  await ensureDataLoaded();
  let list = _categories;
  if (filters.regionId) list = list.filter((c) => c.regionId === filters.regionId);
  return clone(list);
}

// ---------------------------------------------------------------------------
// Program management (Regional Supervisor CRUD, scoped to their own region —
// "Program" in the UI, `categories` in the schema; see README "Data layer").
// ---------------------------------------------------------------------------
export async function getCategoriesManaged(regionId) {
  await ensureDataLoaded();
  const list = _categories
    .filter((c) => c.regionId === regionId)
    .map((category) => {
      const coordinator = _regionalCoordinators.find((rc) => rc.categoryId === category.id);
      return {
        ...category,
        coordinatorName: coordinator?.name ?? null,
        subjectCount: _subjects.filter((s) => s.categoryId === category.id).length,
        studentCount: _students.filter((s) => s.categoryId === category.id).length,
      };
    });
  return clone(list);
}

// { name, regionId }
export async function createCategory({ name, regionId }) {
  await ensureDataLoaded();
  const id = `cat-${Date.now()}`;
  const { error } = await supabase.from('categories').insert({ id, name, region_id: regionId });
  if (error) return { success: false, error: 'save_failed' };
  _categories.push({ id, name, regionId });
  return { success: true, id };
}

export async function updateCategory(id, updates) {
  await ensureDataLoaded();
  const category = _categories.find((c) => c.id === id);
  if (!category) return { success: false, error: 'not_found' };
  const patch = {};
  if (updates.name != null) patch.name = updates.name;
  const { error } = await supabase.from('categories').update(patch).eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  if (updates.name != null) category.name = updates.name;
  return { success: true };
}

// Same "only delete what's genuinely empty" rule as deleteCenter — a program
// with subjects, students, or an assigned Regional Coordinator cascades
// through too much to tear down safely from one click.
export async function deleteCategory(id) {
  await ensureDataLoaded();
  const idx = _categories.findIndex((c) => c.id === id);
  if (idx === -1) return { success: false, error: 'not_found' };

  const hasSubjects = _subjects.some((s) => s.categoryId === id);
  const hasStudents = _students.some((s) => s.categoryId === id);
  const hasCoordinator = _regionalCoordinators.some((rc) => rc.categoryId === id);
  if (hasSubjects || hasStudents || hasCoordinator) {
    return { success: false, error: 'category_not_empty' };
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  _categories.splice(idx, 1);
  return { success: true };
}

export async function getSubjects(filters = {}) {
  await ensureDataLoaded();
  let list = _subjects;
  if (filters.categoryId) {
    list = list.filter((s) => s.categoryId === filters.categoryId);
  } else if (filters.regionId) {
    const categoryIds = new Set(
      _categories.filter((c) => c.regionId === filters.regionId).map((c) => c.id),
    );
    list = list.filter((s) => categoryIds.has(s.categoryId));
  }
  return clone(list);
}

export async function getSubjectById(id) {
  await ensureDataLoaded();
  return clone(_subjects.find((s) => s.id === id) || null);
}

// ---------------------------------------------------------------------------
// Subject management (Regional Coordinator CRUD, scoped to their own
// program — they create/edit/remove the subjects their program runs, and
// set each one's own max score for its weekly CA).
// ---------------------------------------------------------------------------
export async function getSubjectsManaged(categoryId) {
  await ensureDataLoaded();
  const list = _subjects
    .filter((s) => s.categoryId === categoryId)
    .map((subject) => ({
      ...subject,
      hodName: _hods.find((h) => h.id === subject.hodId)?.name ?? null,
    }));
  return clone(list);
}

// { name, maxScore, categoryId }
export async function createSubject({ name, maxScore, categoryId }) {
  await ensureDataLoaded();
  const id = `sub-${Date.now()}`;
  const { error } = await supabase
    .from('subjects')
    .insert({ id, name, category_id: categoryId, max_score: maxScore });
  if (error) return { success: false, error: 'save_failed' };
  _subjects.push({ id, name, categoryId, hodId: null, maxScore: Number(maxScore) });
  return { success: true, id };
}

export async function updateSubject(id, updates) {
  await ensureDataLoaded();
  const subject = _subjects.find((s) => s.id === id);
  if (!subject) return { success: false, error: 'not_found' };
  const patch = {};
  if (updates.name != null) patch.name = updates.name;
  if (updates.maxScore != null) patch.max_score = updates.maxScore;
  const { error } = await supabase.from('subjects').update(patch).eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  if (updates.name != null) subject.name = updates.name;
  if (updates.maxScore != null) subject.maxScore = Number(updates.maxScore);
  return { success: true };
}

// Blocked once real academic data exists for it (assessments/scores already
// recorded) — a subject with only a HOD assigned and no data yet deletes
// freely, since nothing else references subjects.hod_id.
export async function deleteSubject(id) {
  await ensureDataLoaded();
  const idx = _subjects.findIndex((s) => s.id === id);
  if (idx === -1) return { success: false, error: 'not_found' };

  const hasAssessments = _assessments.some((a) => a.subjectId === id);
  const hasScores = _scores.some((sc) => sc.subjectId === id);
  if (hasAssessments || hasScores) {
    return { success: false, error: 'subject_not_empty' };
  }

  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  _subjects.splice(idx, 1);
  return { success: true };
}

export async function getCenters(filters = {}) {
  await ensureDataLoaded();
  let list = _centers;
  if (filters.regionId) list = list.filter((c) => c.regionId === filters.regionId);
  return clone(list);
}

export async function getCenterById(id) {
  await ensureDataLoaded();
  return clone(_centers.find((c) => c.id === id) || null);
}

export async function getMentors() {
  await ensureDataLoaded();
  return clone(_mentors);
}

export async function getMentorById(id) {
  await ensureDataLoaded();
  return clone(_mentors.find((m) => m.id === id) || null);
}

export async function getHods() {
  await ensureDataLoaded();
  return clone(_hods.map((h) => ({ ...h, subject: _subjects.find((s) => s.hodId === h.id) })));
}

export async function getHodById(id) {
  await ensureDataLoaded();
  const hod = _hods.find((h) => h.id === id);
  if (!hod) return null;
  const subject = _subjects.find((s) => s.hodId === id);
  return clone({ ...hod, subject });
}

export async function getRegionalCoordinators() {
  await ensureDataLoaded();
  return clone(_regionalCoordinators);
}

export async function getCenterCoordinators() {
  await ensureDataLoaded();
  return clone(_centerCoordinators);
}

export async function getCenterCoordinatorByCenter(centerId) {
  await ensureDataLoaded();
  return clone(_centerCoordinators.find((c) => c.centerId === centerId) || null);
}

// ---------------------------------------------------------------------------
// Admin management (Regional Supervisor CRUD over Regional Coordinators,
// HODs, and Center Coordinators — NOT Mentors, see "Mentor management" below)
// ---------------------------------------------------------------------------
const ADMIN_ROLES = [ROLES.REGIONAL_COORDINATOR, ROLES.HOD, ROLES.CENTER_COORDINATOR];

function listForAdminRole(role) {
  if (role === ROLES.REGIONAL_COORDINATOR) return _regionalCoordinators;
  if (role === ROLES.HOD) return _hods;
  if (role === ROLES.CENTER_COORDINATOR) return _centerCoordinators;
  return null;
}

function tableForAdminRole(role) {
  if (role === ROLES.REGIONAL_COORDINATOR) return 'regional_coordinators';
  if (role === ROLES.HOD) return 'hods';
  if (role === ROLES.CENTER_COORDINATOR) return 'center_coordinators';
  return null;
}

function idPrefixForRole(role) {
  if (role === ROLES.REGIONAL_COORDINATOR) return 'rc';
  if (role === ROLES.HOD) return 'hod';
  if (role === ROLES.CENTER_COORDINATOR) return 'cc';
  return 'mentor';
}

function contextLabelFor(role, record) {
  if (role === ROLES.REGIONAL_COORDINATOR) {
    return _categories.find((c) => c.id === record.categoryId)?.name ?? '';
  }
  if (role === ROLES.HOD) {
    return _subjects.find((s) => s.hodId === record.id)?.name ?? '';
  }
  if (role === ROLES.CENTER_COORDINATOR || role === ROLES.MENTOR) {
    return _centers.find((c) => c.id === record.centerId)?.name ?? '';
  }
  return '';
}

// A Regional Coordinator/HOD/Center Coordinator record doesn't carry its own
// regionId directly — it's derived transitively (category -> region, or
// subject -> category -> region, or center -> region). Needed so a Regional
// Supervisor's "Manage Admins" screen only ever shows their own region's
// people once more than one region exists.
function regionIdForAdminRecord(role, record) {
  if (role === ROLES.REGIONAL_COORDINATOR) {
    return _categories.find((c) => c.id === record.categoryId)?.regionId ?? null;
  }
  if (role === ROLES.HOD) {
    const subject = _subjects.find((s) => s.hodId === record.id);
    return _categories.find((c) => c.id === subject?.categoryId)?.regionId ?? null;
  }
  if (role === ROLES.CENTER_COORDINATOR) {
    return _centers.find((c) => c.id === record.centerId)?.regionId ?? null;
  }
  return null;
}

// role: one of ROLES.REGIONAL_COORDINATOR / ROLES.HOD / ROLES.CENTER_COORDINATOR
// regionId: scopes the results to one region — always pass the acting
// Regional Supervisor's own region so they never see another region's admins.
export async function getAdmins(role, regionId) {
  await ensureDataLoaded();
  const list = listForAdminRole(role);
  if (!list) return [];
  const scoped = regionId ? list.filter((r) => regionIdForAdminRecord(role, r) === regionId) : list;
  const withDetails = scoped.map((record) => ({
    ...record,
    email: _profiles.find((p) => p.refId === record.id)?.email ?? '',
    contextLabel: contextLabelFor(role, record),
    // HODs don't store their subject on their own record (the subject holds
    // the hodId) — surface it explicitly so the form can prefill/compare by id.
    ...(role === ROLES.HOD ? { subjectId: _subjects.find((s) => s.hodId === record.id)?.id ?? null } : {}),
  }));
  return clone(withDetails);
}

// { role, name, email, password, categoryId?, subjectId?, centerId? }
export async function createAdmin({ role, name, email, password, categoryId, subjectId, centerId }) {
  await ensureDataLoaded();
  if (!ADMIN_ROLES.includes(role)) return { success: false, error: 'invalid_role' };
  if (_profiles.some((p) => p.email.toLowerCase() === String(email).trim().toLowerCase())) {
    return { success: false, error: 'email_taken' };
  }

  const id = `${idPrefixForRole(role)}-${Date.now()}`;
  const table = tableForAdminRole(role);
  let row;
  let record;
  if (role === ROLES.REGIONAL_COORDINATOR) {
    row = { id, name, category_id: categoryId };
    record = { id, name, categoryId };
  } else if (role === ROLES.HOD) {
    row = { id, name };
    record = { id, name };
  } else if (role === ROLES.CENTER_COORDINATOR) {
    row = { id, name, center_id: centerId };
    record = { id, name, centerId };
  }

  const { error } = await supabase.from(table).insert(row);
  if (error) return { success: false, error: 'save_failed' };
  listForAdminRole(role).push(record);

  let assignedSubject = null;
  if (role === ROLES.HOD && subjectId) {
    const subject = _subjects.find((s) => s.id === subjectId);
    if (subject) {
      const { error: subjError } = await supabase.from('subjects').update({ hod_id: id }).eq('id', subjectId);
      if (!subjError) {
        subject.hodId = id;
        assignedSubject = subject;
      }
    }
  }

  // Org row (and, for a HOD, the subject assignment) exist now — the Edge
  // Function's authorization check derives region/center scope from them, so
  // this must run after both, not before.
  const account = await manageStaffAccount({ action: 'create', role, refId: id, name, email, password });
  if (!account.success) {
    if (assignedSubject) {
      await supabase.from('subjects').update({ hod_id: null }).eq('id', assignedSubject.id);
      assignedSubject.hodId = null;
    }
    await supabase.from(table).delete().eq('id', id);
    const list = listForAdminRole(role);
    const idx = list.findIndex((r) => r.id === id);
    if (idx >= 0) list.splice(idx, 1);
    return account;
  }
  _profiles.push({ id: account.id, email, name, role, refId: id, contextLabel: '' });
  return { success: true, id };
}

// updates: { name?, email?, password?, categoryId?, subjectId?, centerId? }
// subjectId (HODs only) reassigns that subject's HOD to this person, freeing
// whichever HOD previously held it (a subject has exactly one HOD).
export async function updateAdmin(role, id, updates) {
  await ensureDataLoaded();
  const list = listForAdminRole(role);
  const record = list?.find((r) => r.id === id);
  if (!record) return { success: false, error: 'not_found' };

  const patch = {};
  if (updates.name != null) patch.name = updates.name;
  if (role === ROLES.REGIONAL_COORDINATOR && updates.categoryId != null) patch.category_id = updates.categoryId;
  if (role === ROLES.CENTER_COORDINATOR && updates.centerId != null) patch.center_id = updates.centerId;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from(tableForAdminRole(role)).update(patch).eq('id', id);
    if (error) return { success: false, error: 'save_failed' };
  }
  if (updates.name != null) record.name = updates.name;
  if (role === ROLES.REGIONAL_COORDINATOR && updates.categoryId != null) record.categoryId = updates.categoryId;
  if (role === ROLES.CENTER_COORDINATOR && updates.centerId != null) record.centerId = updates.centerId;

  if (role === ROLES.HOD && updates.subjectId != null) {
    const previouslyHeld = _subjects.filter((s) => s.hodId === id);
    const { error } = await supabase
      .from('subjects')
      .update({ hod_id: id })
      .eq('id', updates.subjectId);
    if (error) return { success: false, error: 'save_failed' };
    if (previouslyHeld.length > 0) {
      await supabase.from('subjects').update({ hod_id: null }).in(
        'id',
        previouslyHeld.filter((s) => s.id !== updates.subjectId).map((s) => s.id),
      );
    }
    previouslyHeld.forEach((s) => { if (s.id !== updates.subjectId) s.hodId = null; });
    const subject = _subjects.find((s) => s.id === updates.subjectId);
    if (subject) subject.hodId = id;
  }

  if (updates.name != null || updates.email != null || updates.password) {
    const account = await manageStaffAccount({
      action: 'update',
      role,
      refId: id,
      updates: { name: updates.name, email: updates.email, password: updates.password },
    });
    if (!account.success) return account;
    const profile = _profiles.find((p) => p.refId === id);
    if (profile) {
      if (updates.name != null) profile.name = updates.name;
      if (updates.email != null) profile.email = updates.email;
    }
  }
  return { success: true };
}

export async function deleteAdmin(role, id) {
  await ensureDataLoaded();
  const list = listForAdminRole(role);
  if (!list) return { success: false, error: 'invalid_role' };
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return { success: false, error: 'not_found' };

  // Delete the real login first — while the org row (and, for a HOD, its
  // subject assignment) still exist, so the Edge Function's authorization
  // check can still derive the correct region/center scope for the caller.
  const account = await manageStaffAccount({ action: 'delete', role, refId: id });
  if (!account.success) return account;

  // Free the subject(s), if this was a HOD, before removing the row itself.
  if (role === ROLES.HOD) {
    const held = _subjects.filter((s) => s.hodId === id);
    if (held.length > 0) {
      await supabase.from('subjects').update({ hod_id: null }).in('id', held.map((s) => s.id));
      held.forEach((s) => { s.hodId = null; });
    }
  }

  const { error } = await supabase.from(tableForAdminRole(role)).delete().eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  list.splice(idx, 1);
  _profiles = _profiles.filter((p) => p.refId !== id);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Center management (Regional Supervisor CRUD, scoped to their own region —
// a Regional Supervisor can open new centers as the region grows, or remove
// one that was never staffed, but never touches another region's centers).
// ---------------------------------------------------------------------------
export async function getCentersManaged(regionId) {
  await ensureDataLoaded();
  const list = _centers
    .filter((c) => c.regionId === regionId)
    .map((center) => {
      const coordinator = _centerCoordinators.find((cc) => cc.centerId === center.id);
      return {
        ...center,
        coordinatorName: coordinator?.name ?? null,
        studentCount: _students.filter((s) => s.centerId === center.id).length,
      };
    });
  return clone(list);
}

// { name, location, regionId }
export async function createCenter({ name, location, regionId }) {
  await ensureDataLoaded();
  const id = `center-${Date.now()}`;
  const { error } = await supabase.from('centers').insert({ id, name, location, region_id: regionId });
  if (error) return { success: false, error: 'save_failed' };
  _centers.push({ id, name, location, regionId });
  return { success: true, id };
}

export async function updateCenter(id, updates) {
  await ensureDataLoaded();
  const center = _centers.find((c) => c.id === id);
  if (!center) return { success: false, error: 'not_found' };
  const patch = {};
  if (updates.name != null) patch.name = updates.name;
  if (updates.location != null) patch.location = updates.location;
  const { error } = await supabase.from('centers').update(patch).eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  if (updates.name != null) center.name = updates.name;
  if (updates.location != null) center.location = updates.location;
  return { success: true };
}

// Same "only delete what's genuinely empty" rule as deleteRegion — a center
// with students, a coordinator, or mentors already based there cascades
// through too much to tear down safely from one click.
export async function deleteCenter(id) {
  await ensureDataLoaded();
  const idx = _centers.findIndex((c) => c.id === id);
  if (idx === -1) return { success: false, error: 'not_found' };

  const hasStudents = _students.some((s) => s.centerId === id);
  const hasCoordinator = _centerCoordinators.some((cc) => cc.centerId === id);
  const hasMentors = _mentors.some((m) => m.centerId === id);
  if (hasStudents || hasCoordinator || hasMentors) {
    return { success: false, error: 'center_not_empty' };
  }

  const { error } = await supabase.from('centers').delete().eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  _centers.splice(idx, 1);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Mentor management (Center Coordinator CRUD, scoped to their own center —
// a mentor's mentee group can span other centers, but the mentor *account*
// belongs to exactly one center coordinator).
// ---------------------------------------------------------------------------
export async function getMentorsByCenter(centerId) {
  await ensureDataLoaded();
  const list = _mentors
    .filter((m) => m.centerId === centerId)
    .map((mentor) => ({
      ...mentor,
      email: _profiles.find((p) => p.refId === mentor.id)?.email ?? '',
      menteeCount: _students.filter((s) => s.mentorId === mentor.id).length,
    }));
  return clone(list);
}

export async function createMentor({ name, email, password, centerId }) {
  await ensureDataLoaded();
  if (_profiles.some((p) => p.email.toLowerCase() === String(email).trim().toLowerCase())) {
    return { success: false, error: 'email_taken' };
  }
  const id = `mentor-${Date.now()}`;
  const { error } = await supabase.from('mentors').insert({ id, name, center_id: centerId });
  if (error) return { success: false, error: 'save_failed' };
  _mentors.push({ id, name, centerId });

  const account = await manageStaffAccount({ action: 'create', role: ROLES.MENTOR, refId: id, name, email, password });
  if (!account.success) {
    await supabase.from('mentors').delete().eq('id', id);
    _mentors = _mentors.filter((m) => m.id !== id);
    return account;
  }
  _profiles.push({ id: account.id, email, name, role: ROLES.MENTOR, refId: id, contextLabel: '' });
  return { success: true, id };
}

export async function updateMentor(id, updates) {
  await ensureDataLoaded();
  const mentor = _mentors.find((m) => m.id === id);
  if (!mentor) return { success: false, error: 'not_found' };
  if (updates.name != null) {
    const { error } = await supabase.from('mentors').update({ name: updates.name }).eq('id', id);
    if (error) return { success: false, error: 'save_failed' };
    mentor.name = updates.name;
  }

  if (updates.name != null || updates.email != null || updates.password) {
    const account = await manageStaffAccount({
      action: 'update',
      role: ROLES.MENTOR,
      refId: id,
      updates: { name: updates.name, email: updates.email, password: updates.password },
    });
    if (!account.success) return account;
    const profile = _profiles.find((p) => p.refId === id);
    if (profile) {
      if (updates.name != null) profile.name = updates.name;
      if (updates.email != null) profile.email = updates.email;
    }
  }
  return { success: true };
}

export async function deleteMentor(id) {
  await ensureDataLoaded();
  const idx = _mentors.findIndex((m) => m.id === id);
  if (idx === -1) return { success: false, error: 'not_found' };
  // Delete the real login first — while the mentor's own center_id still
  // exists for the Edge Function's authorization check.
  const account = await manageStaffAccount({ action: 'delete', role: ROLES.MENTOR, refId: id });
  if (!account.success) return account;
  const { error } = await supabase.from('mentors').delete().eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  _mentors.splice(idx, 1);
  _profiles = _profiles.filter((p) => p.refId !== id);
  // Mentees keep their mentorId — roster/mentee-list lookups already render
  // "—" for an unresolved mentor, so no cascade is needed for this prototype
  // (students.mentor_id is deliberately not a real FK — see schema file).
  const affectedMentees = _students.filter((s) => s.mentorId === id).length;
  return { success: true, affectedMentees };
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------
export async function getStudents(filters = {}) {
  await ensureDataLoaded();
  let list = _students;
  if (filters.centerId) list = list.filter((s) => s.centerId === filters.centerId);
  if (filters.categoryId) list = list.filter((s) => s.categoryId === filters.categoryId);
  if (filters.mentorId) list = list.filter((s) => s.mentorId === filters.mentorId);
  return clone(list);
}

export async function getStudentById(id) {
  await ensureDataLoaded();
  return clone(_students.find((s) => s.id === id) || null);
}

// Center Coordinator assigns/reassigns which mentor (at their own center) is
// responsible for a student at their own center — mentorId may be null to
// unassign. RLS scopes the write to the acting coordinator's own center.
export async function updateStudentMentor(studentId, mentorId) {
  await ensureDataLoaded();
  const student = _students.find((s) => s.id === studentId);
  if (!student) return { success: false, error: 'not_found' };
  const { error } = await supabase.from('students').update({ mentor_id: mentorId }).eq('id', studentId);
  if (error) return { success: false, error: 'save_failed' };
  student.mentorId = mentorId;
  return { success: true };
}

// Builds a University-of-Bamenda-style matricule: MIA{YY}{CC}{P}{NNN} — YY =
// current year, CC = first 2 letters of the center's name, P = first letter
// of the program's name, NNN = zero-padded sequence number. The sequence is
// scoped to the exact generated PREFIX (not the literal center_id/
// categoryId) so that two centers or programs that happen to produce the
// same code (e.g. "Bamenda"/"Bafut" both -> "BA") still can't collide — they
// just share one counter. A unique index on student_code (see
// 006_student_enrollment.sql) is the DB-level backstop if a race ever
// produces a duplicate anyway.
function generateMatricule({ centerId, categoryId }) {
  const center = _centers.find((c) => c.id === centerId);
  const category = _categories.find((c) => c.id === categoryId);
  const year2 = String(new Date().getFullYear()).slice(-2);
  const centerCode = (center?.name ?? '').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase().padEnd(2, 'X');
  const programCode = (category?.name ?? '').trim().charAt(0).toUpperCase() || 'X';
  const prefix = `MIA${year2}${centerCode}${programCode}`;

  const existingNumbers = _students
    .filter((s) => s.studentCode?.startsWith(prefix))
    .map((s) => parseInt(s.studentCode.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (existingNumbers.length ? Math.max(...existingNumbers) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

// { name, categoryId, mentorId?, centerId } — centerId is always the acting
// Center Coordinator's own center (never a free-form field in the UI),
// matching the RLS insert policy. Returns the generated matricule so the
// coordinator can hand it to the student.
export async function createStudent({ name, categoryId, mentorId, centerId }) {
  await ensureDataLoaded();
  const studentCode = generateMatricule({ centerId, categoryId });
  const id = `stu-${Date.now()}`;
  const row = {
    id,
    student_code: studentCode,
    name,
    center_id: centerId,
    category_id: categoryId,
    mentor_id: mentorId ?? null,
    enrollment_date: new Date().toISOString().slice(0, 10),
    status: 'active',
  };
  const { error } = await supabase.from('students').insert(row);
  if (error) return { success: false, error: 'save_failed' };
  _students.push(mapStudent(row));
  return { success: true, id, studentCode };
}

// name/categoryId/mentorId only — centerId is never editable here (a
// coordinator only manages their own center) and the matricule is never
// regenerated once issued (mirrors how a real university matricule works).
export async function updateStudent(id, { name, categoryId, mentorId }) {
  await ensureDataLoaded();
  const student = _students.find((s) => s.id === id);
  if (!student) return { success: false, error: 'not_found' };
  const patch = {};
  if (name != null) patch.name = name;
  if (categoryId != null) patch.category_id = categoryId;
  if (mentorId !== undefined) patch.mentor_id = mentorId;
  const { error } = await supabase.from('students').update(patch).eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  if (name != null) student.name = name;
  if (categoryId != null) student.categoryId = categoryId;
  if (mentorId !== undefined) student.mentorId = mentorId;
  return { success: true };
}

// The withdraw/reactivate toggle — soft, not a hard delete (see README
// "Student enrollment" for why: a matricule, once issued, isn't destroyed).
export async function updateStudentStatus(id, status) {
  await ensureDataLoaded();
  const student = _students.find((s) => s.id === id);
  if (!student) return { success: false, error: 'not_found' };
  const { error } = await supabase.from('students').update({ status }).eq('id', id);
  if (error) return { success: false, error: 'save_failed' };
  student.status = status;
  return { success: true };
}

// Minimal, anonymous-safe roster (id/name/studentCode only) — backs the
// pre-login "preview a shared student page" dropdown, which by design works
// with no signed-in session. See get_shared_student_bundle in
// supabase/002_full_schema.sql for why this needs its own RPC rather than
// just reading the (RLS-scoped) `students` table directly.
export async function getShareableStudents() {
  const { data, error } = await supabase.rpc('list_students_for_share');
  if (error) return [];
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Scores / history / at-risk analysis
// ---------------------------------------------------------------------------
function buildHistoryForStudentSubject(studentId, subjectId) {
  // A not-yet-entered week has no recorded score to carry its own max score,
  // so it falls back to the subject's current live value; an already-entered
  // week keeps using whatever max score was in effect when it was recorded
  // (historical accuracy if the subject's max score changes later).
  const liveMaxScore = _subjects.find((s) => s.id === subjectId)?.maxScore ?? 20;
  return WEEKS.map(({ week, date }) => {
    const score = _scores.find(
      (s) => s.studentId === studentId && s.subjectId === subjectId && s.week === week,
    );
    return {
      week,
      date,
      marksObtained: score ? score.marksObtained : null,
      maxScore: score ? score.maxScore : liveMaxScore,
      pct: score ? (score.marksObtained / score.maxScore) * 100 : null,
    };
  });
}

export async function getScoreHistory(studentId, subjectId) {
  await ensureDataLoaded();
  return clone(buildHistoryForStudentSubject(studentId, subjectId));
}

export async function getSubjectHistories(studentId) {
  await ensureDataLoaded();
  const student = _students.find((s) => s.id === studentId);
  if (!student) return {};
  const subjects = _subjects.filter((s) => s.categoryId === student.categoryId);
  const result = {};
  subjects.forEach((subject) => {
    result[subject.id] = {
      subject: clone(subject),
      history: buildHistoryForStudentSubject(studentId, subject.id),
    };
  });
  return result;
}

export async function getAtRiskConfig() {
  await ensureDataLoaded();
  return clone(_atRiskConfig);
}

export async function getStudentAnalysis(studentId, configOverrides = {}) {
  await ensureDataLoaded();
  const subjectHistories = await getSubjectHistories(studentId);
  const bySubject = {};
  Object.entries(subjectHistories).forEach(([subjectId, { history }]) => {
    bySubject[subjectId] = analyzeSubjectHistory(history, {
      ..._atRiskConfig,
      ...configOverrides,
    });
  });
  const { status } = computeStudentStatus(bySubject);
  return {
    status,
    bySubject: Object.fromEntries(
      Object.entries(bySubject).map(([subjectId, analysis]) => [
        subjectId,
        { ...analysis, subject: subjectHistories[subjectId].subject },
      ]),
    ),
  };
}

export async function getMenteesWithStatus(mentorId) {
  await ensureDataLoaded();
  const mentees = _students.filter((s) => s.mentorId === mentorId);
  const withStatus = await Promise.all(
    mentees.map(async (student) => {
      const sparkline = Object.values(await getSubjectHistories(student.id));
      // Use the first subject's history as the headline sparkline series.
      const headlineHistory = sparkline.length ? sparkline[0].history : [];
      // A withdrawn student isn't "needs attention" or "steady" — those
      // labels only mean something for someone still active — so skip
      // at-risk analysis entirely rather than running it on stale data.
      const status = student.status === 'withdrawn' ? 'withdrawn' : (await getStudentAnalysis(student.id)).status;
      return {
        ...student,
        status,
        headlineHistory,
      };
    }),
  );
  return withStatus;
}

// General-purpose roster fetch with computed status + resolved display names.
// Backs the Center Coordinator roster, and the Regional Supervisor / Regional
// Coordinator drill-down screens (center view and category view).
export async function getStudentsWithStatus(filters = {}) {
  await ensureDataLoaded();
  let students = _students;
  if (filters.centerId) students = students.filter((s) => s.centerId === filters.centerId);
  if (filters.categoryId) students = students.filter((s) => s.categoryId === filters.categoryId);
  if (filters.mentorId) students = students.filter((s) => s.mentorId === filters.mentorId);

  const withStatus = await Promise.all(
    students.map(async (student) => {
      // See getMenteesWithStatus above — a withdrawn student skips at-risk
      // analysis entirely rather than being (mis)labeled by stale data.
      const status = student.status === 'withdrawn' ? 'withdrawn' : (await getStudentAnalysis(student.id)).status;
      const mentor = _mentors.find((m) => m.id === student.mentorId);
      const center = _centers.find((c) => c.id === student.centerId);
      const category = _categories.find((c) => c.id === student.categoryId);
      return {
        ...student,
        status,
        mentorName: mentor?.name ?? '—',
        centerName: center?.name ?? '—',
        categoryName: category?.name ?? '—',
      };
    }),
  );
  return withStatus;
}

export async function getCenterRoster(centerId, filters = {}) {
  return getStudentsWithStatus({ ...filters, centerId });
}

// ---------------------------------------------------------------------------
// Mark-entry completeness (drives late/incomplete-entry oversight panels)
// ---------------------------------------------------------------------------
// regionId is optional — omit it for the Center Coordinator's own use (they
// just filter the full list down to their one centerId anyway); pass it for
// any region-scoped dashboard so centers/categories from other regions never
// even get iterated.
export async function getMarkEntryStatus(regionId) {
  await ensureDataLoaded();
  const centers = regionId ? _centers.filter((c) => c.regionId === regionId) : _centers;
  const categories = regionId ? _categories.filter((c) => c.regionId === regionId) : _categories;
  const rows = [];
  centers.forEach((center) => {
    categories.forEach((category) => {
      const studentsInGroup = _students.filter(
        (s) => s.centerId === center.id && s.categoryId === category.id && s.status !== 'withdrawn',
      );
      if (studentsInGroup.length === 0) return;
      const subjects = _subjects.filter((s) => s.categoryId === category.id);
      subjects.forEach((subject) => {
        const enteredCount = studentsInGroup.filter((student) =>
          _scores.some(
            (sc) =>
              sc.studentId === student.id &&
              sc.subjectId === subject.id &&
              sc.week === LATEST_WEEK,
          ),
        ).length;
        rows.push({
          centerId: center.id,
          centerName: center.name,
          categoryId: category.id,
          categoryName: category.name,
          subjectId: subject.id,
          subjectName: subject.name,
          week: LATEST_WEEK,
          expected: studentsInGroup.length,
          entered: enteredCount,
          complete: enteredCount === studentsInGroup.length,
        });
      });
    });
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Oversight summaries
// ---------------------------------------------------------------------------
// Scoped to one region — this is what both the Regional Supervisor's own
// dashboard (their own region) and the National Supervisor's drill-in (any
// region, via route param) call.
export async function getRegionalSummary(regionId) {
  await ensureDataLoaded();
  const centers = _centers.filter((c) => c.regionId === regionId);
  const categories = _categories.filter((c) => c.regionId === regionId);
  const centerIds = new Set(centers.map((c) => c.id));
  // Withdrawn students don't count toward totals/at-risk stats — they're
  // no longer active, so they shouldn't drag down (or otherwise affect)
  // completion/at-risk aggregates.
  const allStudents = _students.filter((s) => centerIds.has(s.centerId) && s.status !== 'withdrawn');
  const statuses = await Promise.all(allStudents.map((s) => getStudentAnalysis(s.id)));
  const atRiskCount = statuses.filter((s) => s.status === 'needs_attention').length;
  const incompleteCount = statuses.filter((s) => s.status === 'incomplete_data').length;
  const markEntry = await getMarkEntryStatus(regionId);

  const perCenter = centers.map((center) => {
    const centerStudents = allStudents.filter((s) => s.centerId === center.id);
    return {
      center,
      studentCount: centerStudents.length,
      atRisk: centerStudents.filter((s) => statuses[allStudents.indexOf(s)].status === 'needs_attention').length,
      incomplete: markEntry.filter((r) => r.centerId === center.id && !r.complete).length,
    };
  });

  const perCategory = categories.map((category) => {
    const categoryStudents = allStudents.filter((s) => s.categoryId === category.id);
    return {
      category,
      studentCount: categoryStudents.length,
      atRisk: categoryStudents.filter((s) => statuses[allStudents.indexOf(s)].status === 'needs_attention').length,
    };
  });

  return {
    regionId,
    totalStudents: allStudents.length,
    totalCenters: centers.length,
    totalCategories: categories.length,
    atRiskCount,
    incompleteCount,
    perCenter,
    perCategory,
    markEntry: markEntry.filter((r) => !r.complete),
  };
}

// National Supervisor's cross-region aggregate — reuses getRegionalSummary
// per region rather than recomputing anything, so the two views can never
// drift out of sync with each other.
export async function getNationalSummary() {
  await ensureDataLoaded();
  const regions = _regions;
  const perRegion = await Promise.all(
    regions.map(async (region) => {
      const summary = await getRegionalSummary(region.id);
      const supervisor = _regionalSupervisors.find((rs) => rs.regionId === region.id);
      return {
        region,
        supervisorName: supervisor?.name ?? null,
        totalStudents: summary.totalStudents,
        totalCenters: summary.totalCenters,
        atRiskCount: summary.atRiskCount,
        incompleteCount: summary.incompleteCount,
        lateEntryCount: summary.markEntry.length,
      };
    }),
  );

  return {
    totalRegions: regions.length,
    staffedRegions: perRegion.filter((r) => r.supervisorName).length,
    totalStudents: perRegion.reduce((sum, r) => sum + r.totalStudents, 0),
    totalCenters: perRegion.reduce((sum, r) => sum + r.totalCenters, 0),
    atRiskCount: perRegion.reduce((sum, r) => sum + r.atRiskCount, 0),
    incompleteCount: perRegion.reduce((sum, r) => sum + r.incompleteCount, 0),
    perRegion,
  };
}

export async function getCategorySummary(categoryId) {
  await ensureDataLoaded();
  const students = _students.filter((s) => s.categoryId === categoryId && s.status !== 'withdrawn');
  const statuses = await Promise.all(students.map((s) => getStudentAnalysis(s.id)));
  const markEntry = (await getMarkEntryStatus()).filter((r) => r.categoryId === categoryId);

  const perCenter = _centers.map((center) => {
    const centerStudents = students.filter((s) => s.centerId === center.id);
    return {
      center,
      studentCount: centerStudents.length,
      atRisk: centerStudents.filter(
        (s) => statuses[students.indexOf(s)].status === 'needs_attention',
      ).length,
      incomplete: markEntry.filter((r) => r.centerId === center.id && !r.complete).length,
    };
  }).filter((row) => row.studentCount > 0);

  return {
    category: _categories.find((c) => c.id === categoryId),
    totalStudents: students.length,
    atRiskCount: statuses.filter((s) => s.status === 'needs_attention').length,
    incompleteCount: statuses.filter((s) => s.status === 'incomplete_data').length,
    perCenter,
    markEntry: markEntry.filter((r) => !r.complete),
  };
}

export async function getSubjectSummary(subjectId) {
  await ensureDataLoaded();
  const subject = _subjects.find((s) => s.id === subjectId);
  if (!subject) return null;
  const students = _students.filter((s) => s.categoryId === subject.categoryId && s.status !== 'withdrawn');

  const weeklyAvg = WEEKS.map(({ week, date }) => {
    const weekScores = _scores.filter((sc) => sc.subjectId === subjectId && sc.week === week);
    const avgPct = weekScores.length
      ? weekScores.reduce((sum, sc) => sum + (sc.marksObtained / sc.maxScore) * 100, 0) /
        weekScores.length
      : null;
    return { week, date, avgPct };
  });

  const perCenter = _centers.map((center) => {
    const centerStudents = students.filter((s) => s.centerId === center.id);
    if (centerStudents.length === 0) return null;
    const centerScores = _scores.filter(
      (sc) => sc.subjectId === subjectId && centerStudents.some((s) => s.id === sc.studentId),
    );
    const avgPct = centerScores.length
      ? centerScores.reduce((sum, sc) => sum + (sc.marksObtained / sc.maxScore) * 100, 0) /
        centerScores.length
      : null;
    return { center, studentCount: centerStudents.length, avgPct };
  }).filter(Boolean);

  const statuses = await Promise.all(
    students.map(async (s) => ({ student: s, analysis: await getStudentAnalysis(s.id) })),
  );
  const flaggedStudents = statuses
    .filter(({ analysis }) => analysis.bySubject[subjectId]?.hasNeedsAttention)
    .map(({ student, analysis }) => ({
      student,
      flags: analysis.bySubject[subjectId].flags,
    }));

  return {
    subject,
    weeklyAvg,
    perCenter,
    totalStudents: students.length,
    flaggedStudents,
  };
}

// ---------------------------------------------------------------------------
// Weeks
// ---------------------------------------------------------------------------
export async function getWeekOptions() {
  return [...WEEKS.map((w) => w.week), CURRENT_WEEK];
}

// ---------------------------------------------------------------------------
// Manual mark entry
// ---------------------------------------------------------------------------
export async function getManualEntryTable({ centerId, subjectId, week }) {
  await ensureDataLoaded();
  const subject = _subjects.find((s) => s.id === subjectId);
  if (!subject) return [];
  const students = _students.filter(
    (s) => s.centerId === centerId && s.categoryId === subject.categoryId && s.status !== 'withdrawn',
  );
  return students.map((student) => {
    const existing = _scores.find(
      (sc) => sc.studentId === student.id && sc.subjectId === subjectId && sc.week === week,
    );
    return {
      studentId: student.id,
      studentCode: student.studentCode,
      name: student.name,
      marksObtained: existing ? existing.marksObtained : '',
      maxScore: subject.maxScore,
    };
  });
}

async function ensureAssessment(subjectId, week) {
  const assessmentId = `asmt-${subjectId}-w${week}`;
  if (_assessments.some((a) => a.id === assessmentId)) return assessmentId;
  const weekMeta = WEEKS.find((w) => w.week === week);
  const subjectMaxScore = _subjects.find((s) => s.id === subjectId)?.maxScore ?? 20;
  const assessment = {
    id: assessmentId,
    subjectId,
    week,
    date: weekMeta ? weekMeta.date : new Date().toISOString().slice(0, 10),
    termId: 'term-2-2026',
    maxScore: subjectMaxScore,
  };
  const { error } = await supabase.from('assessments').insert(toAssessmentRow(assessment));
  if (!error) _assessments.push(assessment);
  return assessmentId;
}

export async function saveManualMarks({ centerId, subjectId, week, entries }) {
  await ensureDataLoaded();
  const assessmentId = await ensureAssessment(subjectId, week);
  const subjectMaxScore = _subjects.find((s) => s.id === subjectId)?.maxScore ?? 20;

  const records = entries
    .filter(({ marksObtained }) => marksObtained !== '' && marksObtained != null)
    .map(({ studentId, marksObtained }) => ({
      id: `score-${studentId}-${subjectId}-w${week}`,
      studentId,
      assessmentId,
      subjectId,
      week,
      marksObtained: Number(marksObtained),
      maxScore: subjectMaxScore,
      enteredBy: 'manual-entry',
      enteredAt: new Date().toISOString().slice(0, 10),
    }));

  if (records.length > 0) {
    const { error } = await supabase.from('scores').upsert(records.map(toScoreRow));
    if (error) return { success: false, error: 'save_failed' };
    records.forEach((record) => {
      const existingIdx = _scores.findIndex((sc) => sc.id === record.id);
      if (existingIdx >= 0) _scores[existingIdx] = record;
      else _scores.push(record);
    });
  }

  return { success: true, savedCount: records.length };
}

// ---------------------------------------------------------------------------
// Excel template / mock upload
// ---------------------------------------------------------------------------
export async function getExcelTemplate(categoryId, centerId) {
  await ensureDataLoaded();
  const subjects = _subjects.filter((s) => s.categoryId === categoryId);
  const students = _students
    .filter((s) => s.categoryId === categoryId && (!centerId || s.centerId === centerId) && s.status !== 'withdrawn')
    .slice(0, 3);
  const header = ['Matricule', 'Student Name', ...subjects.map((s) => s.name)];
  const sampleRows = students.map((s) => [s.studentCode, s.name, ...subjects.map(() => '')]);
  return { header, sampleRows, subjects };
}

// Reads an uploaded CSV (see src/data/csv.js — deliberately not the `xlsx`
// npm package, which has unpatched high-severity advisories; this app's own
// "Download template" only ever generates CSV anyway, so that's the only
// format real parsing needs to round-trip). The header row's first column
// accepts "Matricule" or "Student ID"; the rest are matched by subject name
// (case-insensitive) against the subjects in this program. Returns the same
// shape the old mocked version did, so confirmExcelUpload and the whole
// preview/confirm UI don't need to change at all.
export async function parseExcelUpload({ file, categoryId, centerId }) {
  await ensureDataLoaded();
  const subjects = _subjects.filter((s) => s.categoryId === categoryId);
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) return { subjects, rows: [] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idColIdx = header.findIndex((h) => h === 'matricule' || h === 'student id');
  const subjectColIdx = subjects.map((s) => header.findIndex((h) => h === s.name.trim().toLowerCase()));

  const activeStudents = _students.filter(
    (s) => s.centerId === centerId && s.categoryId === categoryId && s.status !== 'withdrawn',
  );

  const parsedRows = rows.slice(1).map((cells, idx) => {
    const rawId = idColIdx >= 0 ? (cells[idColIdx] ?? '').trim() : '';
    const issues = [];
    let resolvedStudentId = null;
    let studentName = 'Unknown Row';

    if (!rawId) {
      issues.push('missing_matricule');
    } else {
      const student = activeStudents.find((s) => s.studentCode.toLowerCase() === rawId.toLowerCase());
      if (!student) {
        issues.push('unmatched_id');
      } else {
        resolvedStudentId = student.id;
        studentName = student.name;
      }
    }

    const marks = subjects.map((subject, subjIdx) => {
      const colIdx = subjectColIdx[subjIdx];
      const raw = colIdx >= 0 ? (cells[colIdx] ?? '').trim() : '';
      if (raw === '') return '';
      const num = Number(raw);
      if (Number.isNaN(num)) return '';
      if (num > subject.maxScore && !issues.includes('out_of_range')) issues.push('out_of_range');
      return num;
    });

    return {
      rowNumber: idx + 2,
      studentId: rawId || '—',
      resolvedStudentId,
      studentName,
      marks,
      issues,
    };
  });

  return { subjects, rows: parsedRows };
}

export async function confirmExcelUpload({ centerId, week, subjects, rows }) {
  await ensureDataLoaded();
  for (const subject of subjects) {
    await ensureAssessment(subject.id, week);
  }

  let savedCount = 0;
  let skippedCount = 0;
  const records = [];
  rows.forEach((row) => {
    if (row.issues && row.issues.length > 0) {
      skippedCount += 1;
      return;
    }
    subjects.forEach((subject, subjIdx) => {
      // A blank cell means this student didn't sit this particular subject
      // this week — skip it rather than saving a score of 0.
      if (row.marks[subjIdx] === '' || row.marks[subjIdx] == null) return;
      records.push({
        id: `score-${row.resolvedStudentId}-${subject.id}-w${week}`,
        studentId: row.resolvedStudentId,
        assessmentId: `asmt-${subject.id}-w${week}`,
        subjectId: subject.id,
        week,
        marksObtained: Number(row.marks[subjIdx]),
        maxScore: subject.maxScore,
        enteredBy: 'excel-upload',
        enteredAt: new Date().toISOString().slice(0, 10),
      });
    });
    savedCount += 1;
  });

  if (records.length > 0) {
    const { error } = await supabase.from('scores').upsert(records.map(toScoreRow));
    if (error) return { savedCount: 0, skippedCount: rows.length };
    records.forEach((record) => {
      const existingIdx = _scores.findIndex((sc) => sc.id === record.id);
      if (existingIdx >= 0) _scores[existingIdx] = record;
      else _scores.push(record);
    });
  }

  return { savedCount, skippedCount };
}

// ---------------------------------------------------------------------------
// Follow-up notes & outcomes
// ---------------------------------------------------------------------------
export async function getFollowUpNotes(studentId) {
  await ensureDataLoaded();
  return clone(
    _followUpNotes
      .filter((n) => n.studentId === studentId)
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
  );
}

export async function addFollowUpNote({ studentId, mentorId, note }) {
  await ensureDataLoaded();
  const record = {
    id: `note-${Date.now()}`,
    studentId,
    mentorId,
    date: new Date().toISOString().slice(0, 10),
    note,
  };
  const { error } = await supabase.from('follow_up_notes').insert(toFollowUpNoteRow(record));
  if (error) return null;
  _followUpNotes.push(record);
  return clone(record);
}

export async function getOutcomes(studentId) {
  await ensureDataLoaded();
  let list = _outcomes;
  if (studentId) list = list.filter((o) => o.studentId === studentId);
  return clone(list);
}

// ---------------------------------------------------------------------------
// Shared (no-login) student view — see get_shared_student_bundle in
// supabase/002_full_schema.sql: this deliberately does NOT go through
// ensureDataLoaded()/RLS (there is no signed-in session on this route), and
// instead calls a SECURITY DEFINER function that returns only the one
// requested student's own data.
// ---------------------------------------------------------------------------
export async function getSharedStudentView(studentId) {
  const { data, error } = await supabase.rpc('get_shared_student_bundle', { sid: studentId });
  if (error || !data?.student) return null;

  const { student, subjects, scores } = data;
  const subjectData = subjects.map((subject) => {
    const history = WEEKS.map(({ week, date }) => {
      const score = scores.find((sc) => sc.subjectId === subject.id && sc.week === week);
      return {
        week,
        date,
        marksObtained: score ? score.marksObtained : null,
        maxScore: score ? score.maxScore : subject.maxScore,
        pct: score ? (score.marksObtained / score.maxScore) * 100 : null,
      };
    });
    const narrative = computeTrendNarrative(history);
    return { subject, history, narrative };
  });

  return { student, subjects: subjectData };
}
