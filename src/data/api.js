// Data-access layer: the ONLY module components/hooks should import data through.
// Every function here is async and returns mock data after a simulated network
// delay. When a real backend (Supabase) is wired up, only this file (and
// mockData.js) need to change — component and hook call sites stay the same.
import {
  CATEGORIES,
  SUBJECTS as SUBJECTS_SEED,
  CENTERS,
  STUDENTS,
  MENTORS as MENTORS_SEED,
  HODS as HODS_SEED,
  REGIONAL_COORDINATORS as REGIONAL_COORDINATORS_SEED,
  REGIONAL_SUPERVISOR,
  CENTER_COORDINATORS as CENTER_COORDINATORS_SEED,
  ASSESSMENTS,
  SCORES,
  FOLLOW_UP_NOTES,
  OUTCOMES,
  WEEKS,
  CURRENT_WEEK,
  MAX_SCORE,
  AT_RISK_THRESHOLD_DEFAULTS,
  USERS as USERS_SEED,
  DEMO_PASSWORD,
} from './mockData';
import { analyzeSubjectHistory, computeStudentStatus, computeTrendNarrative } from './atRisk';
import { ROLES } from '../constants/roles';

const NETWORK_DELAY_MS = 280;

function delay(value, ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// In-memory mutable stores, seeded from the generated mock data. Mutations
// (manual mark entry, excel upload confirm, follow-up notes) live only for
// the current session/tab — reload resets to the generated baseline.
let _scores = [...SCORES];
let _assessments = [...ASSESSMENTS];
let _followUpNotes = [...FOLLOW_UP_NOTES];
let _outcomes = [...OUTCOMES];

// Mutable copies of entities that can now be created/edited/deleted via
// admin & mentor management (Regional Supervisor manages Regional
// Coordinators / HODs / Center Coordinators; Center Coordinators manage the
// mentors whose home center is theirs).
let _subjects = SUBJECTS_SEED.map((s) => ({ ...s }));
let _regionalCoordinators = REGIONAL_COORDINATORS_SEED.map((c) => ({ ...c }));
let _hods = HODS_SEED.map((h) => ({ ...h }));
let _centerCoordinators = CENTER_COORDINATORS_SEED.map((c) => ({ ...c }));
let _mentors = MENTORS_SEED.map((m) => ({ ...m }));
let _users = USERS_SEED.map((u) => ({ ...u }));

const LATEST_WEEK = WEEKS[WEEKS.length - 1].week;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
// Resolves a matched _users record into the same "actor" shape every role
// already expects (see getHodById / getRegionalCoordinators / etc.) so
// nothing downstream of login() needs to know how the actor was resolved.
function resolveActorForUser(user) {
  switch (user.role) {
    case ROLES.REGIONAL_SUPERVISOR:
      return clone(REGIONAL_SUPERVISOR);
    case ROLES.REGIONAL_COORDINATOR:
      return clone(_regionalCoordinators.find((c) => c.id === user.refId));
    case ROLES.HOD: {
      const hod = _hods.find((h) => h.id === user.refId);
      const subject = _subjects.find((s) => s.hodId === user.refId);
      return clone({ ...hod, subject });
    }
    case ROLES.CENTER_COORDINATOR:
      return clone(_centerCoordinators.find((c) => c.id === user.refId));
    case ROLES.MENTOR:
      return clone(_mentors.find((m) => m.id === user.refId));
    default:
      return null;
  }
}

// Mock credential check — swap this for a real Supabase Auth call later.
// Every other function in this file stays the same; only this one changes.
export async function login({ email, password }) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  const user = _users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user || user.password !== password) {
    return delay({ success: false, error: 'invalid_credentials' });
  }
  const actor = resolveActorForUser(user);
  return delay({
    success: true,
    role: user.role,
    actor: { ...actor, email: user.email },
  });
}

// Used only by the login screen's "demo accounts" helper list — never
// exposes passwords.
export async function getDemoAccounts() {
  return delay({
    // Every demo account shares this one password — it's shown on the login
    // screen intentionally (mock-data prototype, not a real credential).
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
// Reference data
// ---------------------------------------------------------------------------
export async function getCategories() {
  return delay(clone(CATEGORIES));
}

export async function getSubjects(filters = {}) {
  let list = _subjects;
  if (filters.categoryId) list = list.filter((s) => s.categoryId === filters.categoryId);
  return delay(clone(list));
}

export async function getSubjectById(id) {
  return delay(clone(_subjects.find((s) => s.id === id) || null));
}

export async function getCenters() {
  return delay(clone(CENTERS));
}

export async function getCenterById(id) {
  return delay(clone(CENTERS.find((c) => c.id === id) || null));
}

export async function getMentors() {
  return delay(clone(_mentors));
}

export async function getMentorById(id) {
  return delay(clone(_mentors.find((m) => m.id === id) || null));
}

export async function getHods() {
  return delay(clone(_hods.map((h) => ({ ...h, subject: _subjects.find((s) => s.hodId === h.id) }))));
}

export async function getHodById(id) {
  const hod = _hods.find((h) => h.id === id);
  if (!hod) return delay(null);
  const subject = _subjects.find((s) => s.hodId === id);
  return delay(clone({ ...hod, subject }));
}

export async function getRegionalCoordinators() {
  return delay(clone(_regionalCoordinators));
}

export async function getRegionalSupervisor() {
  return delay(clone(REGIONAL_SUPERVISOR));
}

export async function getCenterCoordinators() {
  return delay(clone(_centerCoordinators));
}

export async function getCenterCoordinatorByCenter(centerId) {
  return delay(clone(_centerCoordinators.find((c) => c.centerId === centerId) || null));
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

function idPrefixForRole(role) {
  if (role === ROLES.REGIONAL_COORDINATOR) return 'rc';
  if (role === ROLES.HOD) return 'hod';
  if (role === ROLES.CENTER_COORDINATOR) return 'cc';
  return 'mentor';
}

function contextLabelFor(role, record) {
  if (role === ROLES.REGIONAL_COORDINATOR) {
    return CATEGORIES.find((c) => c.id === record.categoryId)?.name ?? '';
  }
  if (role === ROLES.HOD) {
    return _subjects.find((s) => s.hodId === record.id)?.name ?? '';
  }
  if (role === ROLES.CENTER_COORDINATOR || role === ROLES.MENTOR) {
    return CENTERS.find((c) => c.id === record.centerId)?.name ?? '';
  }
  return '';
}

// role: one of ROLES.REGIONAL_COORDINATOR / ROLES.HOD / ROLES.CENTER_COORDINATOR
export async function getAdmins(role) {
  const list = listForAdminRole(role);
  if (!list) return delay([]);
  const withDetails = list.map((record) => ({
    ...record,
    email: _users.find((u) => u.refId === record.id)?.email ?? '',
    contextLabel: contextLabelFor(role, record),
    // HODs don't store their subject on their own record (the subject holds
    // the hodId) — surface it explicitly so the form can prefill/compare by id.
    ...(role === ROLES.HOD ? { subjectId: _subjects.find((s) => s.hodId === record.id)?.id ?? null } : {}),
  }));
  return delay(clone(withDetails));
}

// { role, name, email, password, categoryId?, subjectId?, centerId? }
export async function createAdmin({ role, name, email, password, categoryId, subjectId, centerId }) {
  if (!ADMIN_ROLES.includes(role)) return delay({ success: false, error: 'invalid_role' });
  if (_users.some((u) => u.email.toLowerCase() === String(email).trim().toLowerCase())) {
    return delay({ success: false, error: 'email_taken' });
  }

  const id = `${idPrefixForRole(role)}-${Date.now()}`;
  if (role === ROLES.REGIONAL_COORDINATOR) {
    _regionalCoordinators.push({ id, name, categoryId });
  } else if (role === ROLES.HOD) {
    _hods.push({ id, name });
    if (subjectId) {
      const subject = _subjects.find((s) => s.id === subjectId);
      if (subject) subject.hodId = id;
    }
  } else if (role === ROLES.CENTER_COORDINATOR) {
    _centerCoordinators.push({ id, name, centerId });
  }

  _users.push({ id: `user-${id}`, name, email, password, role, refId: id, contextLabel: '' });
  return delay({ success: true, id });
}

// updates: { name?, email?, password?, categoryId?, subjectId?, centerId? }
// subjectId (HODs only) reassigns that subject's HOD to this person, freeing
// whichever HOD previously held it (a subject has exactly one HOD).
export async function updateAdmin(role, id, updates) {
  const list = listForAdminRole(role);
  const record = list?.find((r) => r.id === id);
  if (!record) return delay({ success: false, error: 'not_found' });

  if (updates.name != null) record.name = updates.name;
  if (role === ROLES.REGIONAL_COORDINATOR && updates.categoryId != null) {
    record.categoryId = updates.categoryId;
  }
  if (role === ROLES.CENTER_COORDINATOR && updates.centerId != null) {
    record.centerId = updates.centerId;
  }
  if (role === ROLES.HOD && updates.subjectId != null) {
    _subjects.forEach((s) => {
      if (s.hodId === id) s.hodId = null;
    });
    const subject = _subjects.find((s) => s.id === updates.subjectId);
    if (subject) subject.hodId = id;
  }

  const user = _users.find((u) => u.refId === id);
  if (user) {
    if (updates.name != null) user.name = updates.name;
    if (updates.email != null) user.email = updates.email;
    if (updates.password) user.password = updates.password;
  }
  return delay({ success: true });
}

export async function deleteAdmin(role, id) {
  const list = listForAdminRole(role);
  if (!list) return delay({ success: false, error: 'invalid_role' });
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return delay({ success: false, error: 'not_found' });
  list.splice(idx, 1);

  // Freed subject(s), if this was a HOD.
  _subjects.forEach((s) => {
    if (s.hodId === id) s.hodId = null;
  });

  const userIdx = _users.findIndex((u) => u.refId === id);
  if (userIdx >= 0) _users.splice(userIdx, 1);
  return delay({ success: true });
}

// ---------------------------------------------------------------------------
// Mentor management (Center Coordinator CRUD, scoped to their own center —
// a mentor's mentee group can span other centers, but the mentor *account*
// belongs to exactly one center coordinator).
// ---------------------------------------------------------------------------
export async function getMentorsByCenter(centerId) {
  const list = _mentors
    .filter((m) => m.centerId === centerId)
    .map((mentor) => ({
      ...mentor,
      email: _users.find((u) => u.refId === mentor.id)?.email ?? '',
      menteeCount: STUDENTS.filter((s) => s.mentorId === mentor.id).length,
    }));
  return delay(clone(list));
}

export async function createMentor({ name, email, password, centerId }) {
  if (_users.some((u) => u.email.toLowerCase() === String(email).trim().toLowerCase())) {
    return delay({ success: false, error: 'email_taken' });
  }
  const id = `mentor-${Date.now()}`;
  _mentors.push({ id, name, centerId });
  _users.push({ id: `user-${id}`, name, email, password, role: ROLES.MENTOR, refId: id, contextLabel: '' });
  return delay({ success: true, id });
}

export async function updateMentor(id, updates) {
  const mentor = _mentors.find((m) => m.id === id);
  if (!mentor) return delay({ success: false, error: 'not_found' });
  if (updates.name != null) mentor.name = updates.name;

  const user = _users.find((u) => u.refId === id);
  if (user) {
    if (updates.name != null) user.name = updates.name;
    if (updates.email != null) user.email = updates.email;
    if (updates.password) user.password = updates.password;
  }
  return delay({ success: true });
}

export async function deleteMentor(id) {
  const idx = _mentors.findIndex((m) => m.id === id);
  if (idx === -1) return delay({ success: false, error: 'not_found' });
  _mentors.splice(idx, 1);
  const userIdx = _users.findIndex((u) => u.refId === id);
  if (userIdx >= 0) _users.splice(userIdx, 1);
  // Mentees keep their mentorId — roster/mentee-list lookups already render
  // "—" for an unresolved mentor, so no cascade is needed for this prototype.
  const affectedMentees = STUDENTS.filter((s) => s.mentorId === id).length;
  return delay({ success: true, affectedMentees });
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------
export async function getStudents(filters = {}) {
  let list = STUDENTS;
  if (filters.centerId) list = list.filter((s) => s.centerId === filters.centerId);
  if (filters.categoryId) list = list.filter((s) => s.categoryId === filters.categoryId);
  if (filters.mentorId) list = list.filter((s) => s.mentorId === filters.mentorId);
  return delay(clone(list));
}

export async function getStudentById(id) {
  return delay(clone(STUDENTS.find((s) => s.id === id) || null));
}

// ---------------------------------------------------------------------------
// Scores / history / at-risk analysis
// ---------------------------------------------------------------------------
function buildHistoryForStudentSubject(studentId, subjectId) {
  return WEEKS.map(({ week, date }) => {
    const score = _scores.find(
      (s) => s.studentId === studentId && s.subjectId === subjectId && s.week === week,
    );
    return {
      week,
      date,
      marksObtained: score ? score.marksObtained : null,
      maxScore: MAX_SCORE,
      pct: score ? (score.marksObtained / MAX_SCORE) * 100 : null,
    };
  });
}

export async function getScoreHistory(studentId, subjectId) {
  return delay(clone(buildHistoryForStudentSubject(studentId, subjectId)));
}

export async function getSubjectHistories(studentId) {
  const student = STUDENTS.find((s) => s.id === studentId);
  if (!student) return delay({});
  const subjects = _subjects.filter((s) => s.categoryId === student.categoryId);
  const result = {};
  subjects.forEach((subject) => {
    result[subject.id] = {
      subject: clone(subject),
      history: buildHistoryForStudentSubject(studentId, subject.id),
    };
  });
  return delay(result);
}

export async function getAtRiskConfig() {
  return delay(clone(AT_RISK_THRESHOLD_DEFAULTS));
}

export async function getStudentAnalysis(studentId, configOverrides = {}) {
  const subjectHistories = await getSubjectHistories(studentId);
  const bySubject = {};
  Object.entries(subjectHistories).forEach(([subjectId, { history }]) => {
    bySubject[subjectId] = analyzeSubjectHistory(history, {
      ...AT_RISK_THRESHOLD_DEFAULTS,
      ...configOverrides,
    });
  });
  const { status } = computeStudentStatus(bySubject);
  return delay(
    {
      status,
      bySubject: Object.fromEntries(
        Object.entries(bySubject).map(([subjectId, analysis]) => [
          subjectId,
          { ...analysis, subject: subjectHistories[subjectId].subject },
        ]),
      ),
    },
    0, // already paid the delay cost inside getSubjectHistories
  );
}

export async function getMenteesWithStatus(mentorId) {
  const mentees = STUDENTS.filter((s) => s.mentorId === mentorId);
  const withStatus = await Promise.all(
    mentees.map(async (student) => {
      const analysis = await getStudentAnalysis(student.id);
      const sparkline = Object.values(
        await getSubjectHistories(student.id),
      );
      // Use the first subject's history as the headline sparkline series.
      const headlineHistory = sparkline.length ? sparkline[0].history : [];
      return {
        ...student,
        status: analysis.status,
        headlineHistory,
      };
    }),
  );
  return delay(withStatus, 0);
}

// General-purpose roster fetch with computed status + resolved display names.
// Backs the Center Coordinator roster, and the Regional Supervisor / Regional
// Coordinator drill-down screens (center view and category view).
export async function getStudentsWithStatus(filters = {}) {
  let students = STUDENTS;
  if (filters.centerId) students = students.filter((s) => s.centerId === filters.centerId);
  if (filters.categoryId) students = students.filter((s) => s.categoryId === filters.categoryId);
  if (filters.mentorId) students = students.filter((s) => s.mentorId === filters.mentorId);

  const withStatus = await Promise.all(
    students.map(async (student) => {
      const analysis = await getStudentAnalysis(student.id);
      const mentor = _mentors.find((m) => m.id === student.mentorId);
      const center = CENTERS.find((c) => c.id === student.centerId);
      const category = CATEGORIES.find((c) => c.id === student.categoryId);
      return {
        ...student,
        status: analysis.status,
        mentorName: mentor?.name ?? '—',
        centerName: center?.name ?? '—',
        categoryName: category?.name ?? '—',
      };
    }),
  );
  return delay(withStatus, 0);
}

export async function getCenterRoster(centerId, filters = {}) {
  return getStudentsWithStatus({ ...filters, centerId });
}

// ---------------------------------------------------------------------------
// Mark-entry completeness (drives late/incomplete-entry oversight panels)
// ---------------------------------------------------------------------------
export async function getMarkEntryStatus() {
  const rows = [];
  CENTERS.forEach((center) => {
    CATEGORIES.forEach((category) => {
      const studentsInGroup = STUDENTS.filter(
        (s) => s.centerId === center.id && s.categoryId === category.id,
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
  return delay(rows);
}

// ---------------------------------------------------------------------------
// Oversight summaries
// ---------------------------------------------------------------------------
export async function getRegionalSummary() {
  const allStudents = STUDENTS;
  const statuses = await Promise.all(allStudents.map((s) => getStudentAnalysis(s.id)));
  const atRiskCount = statuses.filter((s) => s.status === 'needs_attention').length;
  const incompleteCount = statuses.filter((s) => s.status === 'incomplete_data').length;
  const markEntry = await getMarkEntryStatus();

  const perCenter = CENTERS.map((center) => {
    const centerStudents = allStudents.filter((s) => s.centerId === center.id);
    const centerStatuses = centerStudents.map((s, i) => statuses[allStudents.indexOf(s)]);
    return {
      center,
      studentCount: centerStudents.length,
      atRisk: centerStudents.filter((s) => statuses[allStudents.indexOf(s)].status === 'needs_attention').length,
      incomplete: markEntry.filter((r) => r.centerId === center.id && !r.complete).length,
    };
  });

  const perCategory = CATEGORIES.map((category) => {
    const categoryStudents = allStudents.filter((s) => s.categoryId === category.id);
    return {
      category,
      studentCount: categoryStudents.length,
      atRisk: categoryStudents.filter((s) => statuses[allStudents.indexOf(s)].status === 'needs_attention').length,
    };
  });

  return delay(
    {
      totalStudents: allStudents.length,
      totalCenters: CENTERS.length,
      totalCategories: CATEGORIES.length,
      atRiskCount,
      incompleteCount,
      perCenter,
      perCategory,
      markEntry: markEntry.filter((r) => !r.complete),
    },
    0,
  );
}

export async function getCategorySummary(categoryId) {
  const students = STUDENTS.filter((s) => s.categoryId === categoryId);
  const statuses = await Promise.all(students.map((s) => getStudentAnalysis(s.id)));
  const markEntry = (await getMarkEntryStatus()).filter((r) => r.categoryId === categoryId);

  const perCenter = CENTERS.map((center) => {
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

  return delay(
    {
      category: CATEGORIES.find((c) => c.id === categoryId),
      totalStudents: students.length,
      atRiskCount: statuses.filter((s) => s.status === 'needs_attention').length,
      incompleteCount: statuses.filter((s) => s.status === 'incomplete_data').length,
      perCenter,
      markEntry: markEntry.filter((r) => !r.complete),
    },
    0,
  );
}

export async function getSubjectSummary(subjectId) {
  const subject = _subjects.find((s) => s.id === subjectId);
  if (!subject) return delay(null);
  const students = STUDENTS.filter((s) => s.categoryId === subject.categoryId);

  const weeklyAvg = WEEKS.map(({ week, date }) => {
    const weekScores = _scores.filter((sc) => sc.subjectId === subjectId && sc.week === week);
    const avgPct = weekScores.length
      ? weekScores.reduce((sum, sc) => sum + (sc.marksObtained / MAX_SCORE) * 100, 0) /
        weekScores.length
      : null;
    return { week, date, avgPct };
  });

  const perCenter = CENTERS.map((center) => {
    const centerStudents = students.filter((s) => s.centerId === center.id);
    if (centerStudents.length === 0) return null;
    const centerScores = _scores.filter(
      (sc) => sc.subjectId === subjectId && centerStudents.some((s) => s.id === sc.studentId),
    );
    const avgPct = centerScores.length
      ? centerScores.reduce((sum, sc) => sum + (sc.marksObtained / MAX_SCORE) * 100, 0) /
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

  return delay(
    {
      subject,
      weeklyAvg,
      perCenter,
      totalStudents: students.length,
      flaggedStudents,
    },
    0,
  );
}

// ---------------------------------------------------------------------------
// Weeks
// ---------------------------------------------------------------------------
export async function getWeekOptions() {
  return delay([...WEEKS.map((w) => w.week), CURRENT_WEEK]);
}

// ---------------------------------------------------------------------------
// Manual mark entry
// ---------------------------------------------------------------------------
export async function getManualEntryTable({ centerId, subjectId, week }) {
  const subject = _subjects.find((s) => s.id === subjectId);
  if (!subject) return delay([]);
  const students = STUDENTS.filter(
    (s) => s.centerId === centerId && s.categoryId === subject.categoryId,
  );
  const rows = students.map((student) => {
    const existing = _scores.find(
      (sc) => sc.studentId === student.id && sc.subjectId === subjectId && sc.week === week,
    );
    return {
      studentId: student.id,
      studentCode: student.studentCode,
      name: student.name,
      marksObtained: existing ? existing.marksObtained : '',
      maxScore: MAX_SCORE,
    };
  });
  return delay(rows);
}

export async function saveManualMarks({ centerId, subjectId, week, entries }) {
  const assessmentId = `asmt-${subjectId}-w${week}`;
  if (!_assessments.some((a) => a.id === assessmentId)) {
    const weekMeta = WEEKS.find((w) => w.week === week);
    _assessments.push({
      id: assessmentId,
      subjectId,
      week,
      date: weekMeta ? weekMeta.date : new Date().toISOString().slice(0, 10),
      termId: 'term-2-2026',
      maxScore: MAX_SCORE,
    });
  }

  entries.forEach(({ studentId, marksObtained }) => {
    if (marksObtained === '' || marksObtained == null) return;
    const existingIdx = _scores.findIndex(
      (sc) => sc.studentId === studentId && sc.subjectId === subjectId && sc.week === week,
    );
    const record = {
      id: `score-${studentId}-${subjectId}-w${week}`,
      studentId,
      assessmentId,
      subjectId,
      week,
      marksObtained: Number(marksObtained),
      maxScore: MAX_SCORE,
      enteredBy: 'manual-entry',
      enteredAt: new Date().toISOString().slice(0, 10),
    };
    if (existingIdx >= 0) _scores[existingIdx] = record;
    else _scores.push(record);
  });

  return delay({ success: true, savedCount: entries.filter((e) => e.marksObtained !== '').length });
}

// ---------------------------------------------------------------------------
// Excel template / mock upload
// ---------------------------------------------------------------------------
export async function getExcelTemplate(categoryId) {
  const subjects = _subjects.filter((s) => s.categoryId === categoryId);
  const students = STUDENTS.filter((s) => s.categoryId === categoryId).slice(0, 3);
  const header = ['Student ID', 'Student Name', ...subjects.map((s) => s.name)];
  const sampleRows = students.map((s) => [s.studentCode, s.name, ...subjects.map(() => '')]);
  return delay({ header, sampleRows, subjects });
}

// Hardcoded example rows used to simulate parsing an uploaded Excel file —
// deliberately includes a couple of invalid rows so the preview/confirm
// screen has something real to flag.
export async function mockParseExcelUpload({ categoryId, centerId }) {
  const subjects = _subjects.filter((s) => s.categoryId === categoryId);
  const students = STUDENTS.filter((s) => s.categoryId === categoryId && s.centerId === centerId);
  if (students.length === 0) {
    return delay({ subjects, rows: [] });
  }

  const rows = students.slice(0, 6).map((student, idx) => {
    const marks = subjects.map(() => Math.round(8 + Math.random() * 10));
    return {
      rowNumber: idx + 2,
      studentId: student.studentCode,
      resolvedStudentId: student.id,
      studentName: student.name,
      marks,
      issues: [],
    };
  });

  // Inject a couple of deliberately-bad rows so the preview/confirm screen
  // has real problems to demonstrate: unmatched student ID, out-of-range mark.
  if (rows.length > 0) {
    rows.push({
      rowNumber: rows.length + 2,
      studentId: 'STU999',
      resolvedStudentId: null,
      studentName: 'Unknown Row',
      marks: subjects.map(() => 12),
      issues: ['unmatched_id'],
    });
  }
  if (rows.length > 1) {
    const badMarks = subjects.map((_, i) => (i === 0 ? 27 : 12));
    rows.push({
      rowNumber: rows.length + 2,
      studentId: students[0].studentCode,
      resolvedStudentId: students[0].id,
      studentName: students[0].name,
      marks: badMarks,
      issues: ['out_of_range'],
    });
  }

  return delay({ subjects, rows });
}

export async function confirmExcelUpload({ centerId, week, subjects, rows }) {
  let savedCount = 0;
  let skippedCount = 0;
  rows.forEach((row) => {
    if (row.issues && row.issues.length > 0) {
      skippedCount += 1;
      return;
    }
    subjects.forEach((subject, subjIdx) => {
      const assessmentId = `asmt-${subject.id}-w${week}`;
      if (!_assessments.some((a) => a.id === assessmentId)) {
        const weekMeta = WEEKS.find((w) => w.week === week);
        _assessments.push({
          id: assessmentId,
          subjectId: subject.id,
          week,
          date: weekMeta ? weekMeta.date : new Date().toISOString().slice(0, 10),
          termId: 'term-2-2026',
          maxScore: MAX_SCORE,
        });
      }
      const existingIdx = _scores.findIndex(
        (sc) => sc.studentId === row.resolvedStudentId && sc.subjectId === subject.id && sc.week === week,
      );
      const record = {
        id: `score-${row.resolvedStudentId}-${subject.id}-w${week}`,
        studentId: row.resolvedStudentId,
        assessmentId,
        subjectId: subject.id,
        week,
        marksObtained: Number(row.marks[subjIdx]),
        maxScore: MAX_SCORE,
        enteredBy: 'excel-upload',
        enteredAt: new Date().toISOString().slice(0, 10),
      };
      if (existingIdx >= 0) _scores[existingIdx] = record;
      else _scores.push(record);
    });
    savedCount += 1;
  });
  return delay({ savedCount, skippedCount });
}

// ---------------------------------------------------------------------------
// Follow-up notes & outcomes
// ---------------------------------------------------------------------------
export async function getFollowUpNotes(studentId) {
  return delay(
    clone(
      _followUpNotes
        .filter((n) => n.studentId === studentId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    ),
  );
}

export async function addFollowUpNote({ studentId, mentorId, note }) {
  const record = {
    id: `note-${Date.now()}`,
    studentId,
    mentorId,
    date: new Date().toISOString().slice(0, 10),
    note,
  };
  _followUpNotes.push(record);
  return delay(clone(record));
}

export async function getOutcomes(studentId) {
  let list = _outcomes;
  if (studentId) list = list.filter((o) => o.studentId === studentId);
  return delay(clone(list));
}

// ---------------------------------------------------------------------------
// Shared (no-login) student view
// ---------------------------------------------------------------------------
export async function getSharedStudentView(studentId) {
  const student = STUDENTS.find((s) => s.id === studentId);
  if (!student) return delay(null);
  const subjects = _subjects.filter((s) => s.categoryId === student.categoryId);
  const category = CATEGORIES.find((c) => c.id === student.categoryId);

  const subjectData = subjects.map((subject) => {
    const history = buildHistoryForStudentSubject(studentId, subject.id);
    const narrative = computeTrendNarrative(history);
    return { subject, history, narrative };
  });

  return delay({
    student: { id: student.id, name: student.name, categoryName: category?.name },
    subjects: subjectData,
  });
}
