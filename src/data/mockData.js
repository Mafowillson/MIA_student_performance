// Deterministic mock dataset for the MIA NW Student Performance Platform.
// This is the ONLY file that hardcodes data. Everything else (components, pages)
// must go through src/data/api.js — never import this file directly outside src/data/.
import { mulberry32, randInt, randFloat, pick, shuffle } from './random.js';
import { ROLES } from '../constants/roles';

const rng = mulberry32(20260705);

export const MAX_SCORE = 20; // every CA is marked out of 20

export const TERM = { id: 'term-2-2026', name: 'Term 2 2026' };

// Weeks 1-6, most recent (week 6) two weeks before "today" so week 7 can be
// demonstrated as "not yet entered" for the late-mark-entry oversight views.
export const WEEKS = [1, 2, 3, 4, 5, 6].map((week) => ({
  week,
  date: new Date(2026, 4, 25 + (week - 1) * 7).toISOString().slice(0, 10),
}));
export const CURRENT_WEEK = 7;
export const CURRENT_WEEK_DATE = new Date(2026, 6, 6).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Regions — MIA Prepa runs (or will run) in multiple regions. NW and SW are
// fully populated; Center and Littoral are registered but not yet staffed
// (no Regional Supervisor, no centers) — a live demo of the National
// Supervisor onboarding a new region rather than a hardcoded empty state.
// ---------------------------------------------------------------------------
export const REGIONS = [
  { id: 'region-nw', name: 'North West' },
  { id: 'region-sw', name: 'South West' },
  { id: 'region-center', name: 'Center' },
  { id: 'region-littoral', name: 'Littoral' },
];

// ---------------------------------------------------------------------------
// Categories & Subjects — a Category belongs to exactly one Region, so two
// regions can each run their own "Engineering" as fully separate records
// (own subjects, own HODs) — the same pattern already used for HODs being
// distinct per category even when the subject name repeats (e.g. "Math").
// ---------------------------------------------------------------------------
export const CATEGORIES = [
  { id: 'cat-eng', name: 'Engineering', regionId: 'region-nw' },
  { id: 'cat-med', name: 'Medicine', regionId: 'region-nw' },
  { id: 'cat-eng-sw', name: 'Engineering', regionId: 'region-sw' },
  { id: 'cat-med-sw', name: 'Medicine', regionId: 'region-sw' },
  { id: 'cat-tech-sw', name: 'Technical', regionId: 'region-sw' },
];

export const HODS = [
  { id: 'hod-1', name: 'Dr. Ngwa Peter' },
  { id: 'hod-2', name: 'Dr. Fon Achu' },
  { id: 'hod-3', name: 'Dr. Tanyi Blaise' },
  { id: 'hod-4', name: 'Dr. Suh Ivan' },
  { id: 'hod-5', name: 'Dr. Manka Grace' },
  { id: 'hod-6', name: 'Dr. Ndi Comfort' },
  { id: 'hod-7', name: 'Dr. Ashu Derick' },
  { id: 'hod-8', name: 'Dr. Fru Linda' },
  { id: 'hod-9', name: 'Dr. Ekema Divine' },
  { id: 'hod-10', name: 'Dr. Molua Grace' },
  { id: 'hod-11', name: 'Dr. Epie Samuel' },
  { id: 'hod-12', name: 'Dr. Liwa Comfort' },
  { id: 'hod-13', name: 'Dr. Ntoko Bernard' },
  { id: 'hod-14', name: 'Dr. Mbua Irene' },
];

export const SUBJECTS = [
  { id: 'sub-eng-math', name: 'Math', categoryId: 'cat-eng', hodId: 'hod-1' },
  { id: 'sub-eng-circuit', name: 'Circuit Design', categoryId: 'cat-eng', hodId: 'hod-2' },
  { id: 'sub-eng-mech', name: 'Mechanics', categoryId: 'cat-eng', hodId: 'hod-3' },
  { id: 'sub-eng-phys', name: 'Physics', categoryId: 'cat-eng', hodId: 'hod-4' },
  { id: 'sub-med-anat', name: 'Anatomy', categoryId: 'cat-med', hodId: 'hod-5' },
  { id: 'sub-med-bio', name: 'Biology', categoryId: 'cat-med', hodId: 'hod-6' },
  { id: 'sub-med-chem', name: 'Chemistry', categoryId: 'cat-med', hodId: 'hod-7' },
  { id: 'sub-med-math', name: 'Math', categoryId: 'cat-med', hodId: 'hod-8' },
  // South West
  { id: 'sub-sw-eng-math', name: 'Math', categoryId: 'cat-eng-sw', hodId: 'hod-9' },
  { id: 'sub-sw-eng-circuit', name: 'Circuit Design', categoryId: 'cat-eng-sw', hodId: 'hod-10' },
  { id: 'sub-sw-med-anat', name: 'Anatomy', categoryId: 'cat-med-sw', hodId: 'hod-11' },
  { id: 'sub-sw-med-bio', name: 'Biology', categoryId: 'cat-med-sw', hodId: 'hod-12' },
  { id: 'sub-sw-tech-weld', name: 'Welding', categoryId: 'cat-tech-sw', hodId: 'hod-13' },
  { id: 'sub-sw-tech-elec', name: 'Electrical Installation', categoryId: 'cat-tech-sw', hodId: 'hod-14' },
];

// ---------------------------------------------------------------------------
// Centers
// ---------------------------------------------------------------------------
export const CENTERS = [
  { id: 'center-bamenda', name: 'Bamenda Center', location: 'Bamenda, NW', regionId: 'region-nw' },
  { id: 'center-bafut', name: 'Bafut Center', location: 'Bafut, NW', regionId: 'region-nw' },
  { id: 'center-kumbo', name: 'Kumbo Center', location: 'Kumbo, NW', regionId: 'region-nw' },
  { id: 'center-buea', name: 'Buea Center', location: 'Buea, SW', regionId: 'region-sw' },
  { id: 'center-limbe', name: 'Limbe Center', location: 'Limbe, SW', regionId: 'region-sw' },
];

// ---------------------------------------------------------------------------
// People: National Supervisor, Regional Supervisors, Regional Coordinators,
// Center Coordinators, Mentors
// ---------------------------------------------------------------------------
export const NATIONAL_SUPERVISOR = { id: 'ns-1', name: 'Prisca Achale' };

// One per staffed region — Center and Littoral intentionally have none yet.
export const REGIONAL_SUPERVISORS = [
  { id: 'rs-nw', name: 'Emmanuel Fonkeng', regionId: 'region-nw' },
  { id: 'rs-sw', name: 'Genevieve Mbah', regionId: 'region-sw' },
];

export const REGIONAL_COORDINATORS = [
  { id: 'rc-eng', name: 'Samuel Nkemtaji', categoryId: 'cat-eng' },
  { id: 'rc-med', name: 'Delphine Ayuk', categoryId: 'cat-med' },
  { id: 'rc-eng-sw', name: 'Roland Ekedi', categoryId: 'cat-eng-sw' },
  { id: 'rc-med-sw', name: 'Comfort Njie', categoryId: 'cat-med-sw' },
  { id: 'rc-tech-sw', name: 'Peter Ebune', categoryId: 'cat-tech-sw' },
];

export const CENTER_COORDINATORS = [
  { id: 'cc-bamenda', name: 'Beatrice Neba', centerId: 'center-bamenda' },
  { id: 'cc-bafut', name: 'Martin Achiri', centerId: 'center-bafut' },
  { id: 'cc-kumbo', name: 'Gwendoline Shey', centerId: 'center-kumbo' },
  { id: 'cc-buea', name: 'Dorothy Ekane', centerId: 'center-buea' },
  { id: 'cc-limbe', name: 'Francis Motanga', centerId: 'center-limbe' },
];

// centerId here is the mentor's "home center" — whichever Center Coordinator
// manages (created/edits/removes) that mentor's account. It is independent
// of the centers their mentees belong to: a mentor's mentee group can still
// span multiple centers and categories within the SAME region (mentors do
// not cross regions — see buildStudentGroups/mentor-pool assignment below).
export const MENTORS = [
  { id: 'mentor-1', name: 'Ngozi Achidi', centerId: 'center-bamenda' },
  { id: 'mentor-2', name: 'Divine Tabe', centerId: 'center-bafut' },
  { id: 'mentor-3', name: 'Larissa Mbeng', centerId: 'center-bamenda' },
  { id: 'mentor-4', name: 'Kelvin Ashu', centerId: 'center-kumbo' },
  { id: 'mentor-5', name: 'Precious Nkeng', centerId: 'center-bafut' },
  { id: 'mentor-6', name: 'Solange Etonde', centerId: 'center-buea' },
  { id: 'mentor-7', name: 'Ebot Willy', centerId: 'center-limbe' },
  { id: 'mentor-8', name: 'Agnes Mokake', centerId: 'center-buea' },
  { id: 'mentor-9', name: 'Julius Ndive', centerId: 'center-limbe' },
];

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  'Amina', 'Bless', 'Divine', 'Emmanuella', 'Fabrice', 'Gwendoline', 'Hilary',
  'Ivan', 'Joyce', 'Kelvin', 'Larissa', 'Marcel', 'Ngozi', 'Ornella', 'Precious',
  'Queenta', 'Roland', 'Synthia', 'Terence', 'Ursula', 'Vanessa', 'Wilfred',
  'Aurelie', 'Boris', 'Clarisse', 'Derrick', 'Estelle', 'Franck', 'Gaelle',
];
const LAST_NAMES = [
  'Ngwa', 'Achu', 'Tanyi', 'Suh', 'Manka', 'Ndi', 'Ashu', 'Fru', 'Neba',
  'Achiri', 'Shey', 'Mbeng', 'Tabe', 'Nkeng', 'Bime', 'Chia', 'Nfor', 'Wirba',
  'Ndifor', 'Fomum', 'Awah', 'Ngong', 'Tita', 'Kum', 'Tayong', 'Yenla', 'Che',
];

// Archetypes drive score generation so the at-risk logic has real signal to
// compute against, rather than everything looking the same. Weighted so
// "steady" is the clear majority — the demo should show flagging trigger on
// a minority of students, not most of them.
const ARCHETYPE_WEIGHTS = {
  steady: 0.42,
  improving: 0.18,
  sudden_drop: 0.14,
  sustained_low: 0.13,
  downward_trend: 0.13,
};

function buildHeadlineArchetypeList(count, rngLocal) {
  const list = [];
  Object.entries(ARCHETYPE_WEIGHTS).forEach(([archetype, weight]) => {
    const n = Math.round(count * weight);
    for (let i = 0; i < n; i += 1) list.push(archetype);
  });
  while (list.length < count) list.push('steady');
  while (list.length > count) list.pop();
  return shuffle(rngLocal, list);
}

function buildStudentGroups() {
  const groups = [];
  for (const center of CENTERS) {
    for (const category of CATEGORIES) {
      // A center only hosts categories that belong to its own region — this
      // is what keeps SW's "Technical" category (for example) from ever
      // pairing with an NW center once both regions share these arrays.
      if (center.regionId === category.regionId) {
        groups.push({ center, category });
      }
    }
  }
  return groups;
}

const usedNames = new Set();
function generateName(rngLocal) {
  let name;
  let tries = 0;
  do {
    name = `${pick(rngLocal, FIRST_NAMES)} ${pick(rngLocal, LAST_NAMES)}`;
    tries += 1;
  } while (usedNames.has(name) && tries < 50);
  usedNames.add(name);
  return name;
}

export const STUDENTS = [];
const STUDENT_ARCHETYPES = {}; // studentId -> { subjectId: archetype }
const INCOMPLETE_STUDENT_IDS = new Set();

{
  const groups = buildStudentGroups();
  let studentCounter = 1;

  // Mentors don't cross regions (their own Regional Supervisor differs), so
  // each region gets its own shuffled mentor pool + cursor rather than one
  // global pool that could hand an NW student an SW-based mentor.
  const mentorPoolByRegion = {};
  const mentorCursorByRegion = {};
  REGIONS.forEach((region) => {
    const regionMentorIds = MENTORS.filter((m) => {
      const home = CENTERS.find((c) => c.id === m.centerId);
      return home?.regionId === region.id;
    }).map((m) => m.id);
    mentorPoolByRegion[region.id] = shuffle(rng, regionMentorIds);
    mentorCursorByRegion[region.id] = 0;
  });

  groups.forEach(({ center, category }, groupIdx) => {
    // 4-5 students per center/category group -> ~27-30 students per region
    const count = groupIdx % 2 === 0 ? 5 : 4;
    const regionId = category.regionId;
    const mentorPool = mentorPoolByRegion[regionId];
    for (let i = 0; i < count; i += 1) {
      const id = `stu-${String(studentCounter).padStart(3, '0')}`;
      const mentorId = mentorPool.length
        ? mentorPool[mentorCursorByRegion[regionId] % mentorPool.length]
        : null;
      mentorCursorByRegion[regionId] += 1;
      const enrollmentDate = `2025-09-${String(randInt(rng, 1, 15)).padStart(2, '0')}`;
      STUDENTS.push({
        id,
        studentCode: `STU${String(studentCounter).padStart(3, '0')}`,
        name: generateName(rng),
        centerId: center.id,
        categoryId: category.id,
        mentorId,
        enrollmentDate,
        status: 'active',
      });
      studentCounter += 1;
    }
  });
}

// Assign a per-subject archetype to every student (for subjects in their category),
// weighted so "steady" is most common but every archetype shows up multiple times.
// Computed per-region rather than once over the combined population — with
// two (or more) regions of similar size, a single shuffle over everyone can
// easily hand one region a disproportionate share of "bad" archetypes by
// chance, undermining the demo's "most students are fine, some clearly
// aren't" story region by region.
const HEADLINE_ARCHETYPES = new Array(STUDENTS.length);
REGIONS.forEach((region) => {
  const indices = [];
  STUDENTS.forEach((s, idx) => {
    const category = CATEGORIES.find((c) => c.id === s.categoryId);
    if (category?.regionId === region.id) indices.push(idx);
  });
  const regionArchetypes = buildHeadlineArchetypeList(indices.length, rng);
  indices.forEach((idx, i) => {
    HEADLINE_ARCHETYPES[idx] = regionArchetypes[i];
  });
});

STUDENTS.forEach((student, idx) => {
  const subjects = SUBJECTS.filter((s) => s.categoryId === student.categoryId);
  const archetypeForStudent = {};
  const headline = HEADLINE_ARCHETYPES[idx];
  subjects.forEach((subject, subIdx) => {
    if (subIdx === 0) {
      archetypeForStudent[subject.id] = headline;
    } else {
      // Secondary subjects skew steady/improving; only a small chance of
      // carrying a second flagged subject, so most flagged students are
      // flagged for one clear reason rather than everywhere at once.
      const roll = rng();
      if (roll < 0.7) archetypeForStudent[subject.id] = 'steady';
      else if (roll < 0.88) archetypeForStudent[subject.id] = 'improving';
      else if (roll < 0.94) archetypeForStudent[subject.id] = 'downward_trend';
      else archetypeForStudent[subject.id] = headline;
    }
  });
  STUDENT_ARCHETYPES[student.id] = archetypeForStudent;
});

// Pick a handful of students per region to also carry an "incomplete data"
// gap in one subject — sampled per-region (not once globally) so every
// region gets real examples rather than leaving it to chance.
REGIONS.forEach((region) => {
  const regionStudentIds = STUDENTS.filter((s) => {
    const category = CATEGORIES.find((c) => c.id === s.categoryId);
    return category?.regionId === region.id;
  }).map((s) => s.id);
  const candidates = shuffle(rng, regionStudentIds).slice(0, 4);
  candidates.forEach((id) => INCOMPLETE_STUDENT_IDS.add(id));
});

// ---------------------------------------------------------------------------
// Assessments (one per subject/week) & Scores
// ---------------------------------------------------------------------------
export const ASSESSMENTS = [];
const assessmentIdFor = (subjectId, week) => `asmt-${subjectId}-w${week}`;

SUBJECTS.forEach((subject) => {
  WEEKS.forEach(({ week, date }) => {
    ASSESSMENTS.push({
      id: assessmentIdFor(subject.id, week),
      subjectId: subject.id,
      week,
      date,
      termId: TERM.id,
      maxScore: MAX_SCORE,
    });
  });
});

function generateSeries(archetype, weeks, rngLocal) {
  // Returns an array of percentage scores (0-100), one per week, before gaps.
  const out = [];
  let base;
  switch (archetype) {
    case 'improving':
      // Starting comfortably above the 50% line (not just above the
      // eventual average) matters here: a slow start below 50% for its
      // first two weeks would trip the *separate* "sustained low" flag on a
      // student who is, in fact, trending upward — undermining the whole
      // point of this archetype existing.
      base = randFloat(rngLocal, 50, 58);
      for (let w = 0; w < weeks.length; w += 1) {
        out.push(clampPct(base + w * randFloat(rngLocal, 5, 8) + randFloat(rngLocal, -3, 3)));
      }
      break;
    case 'sudden_drop': {
      base = randFloat(rngLocal, 65, 75);
      const dropWeek = weeks.length - 2; // second-to-last week
      for (let w = 0; w < weeks.length; w += 1) {
        if (w === dropWeek) {
          out.push(clampPct(base - randFloat(rngLocal, 25, 35)));
        } else if (w === dropWeek + 1) {
          out.push(clampPct(base - randFloat(rngLocal, 15, 25)));
        } else {
          out.push(clampPct(base + randFloat(rngLocal, -4, 4)));
        }
      }
      break;
    }
    case 'sustained_low':
      base = randFloat(rngLocal, 28, 40);
      for (let w = 0; w < weeks.length; w += 1) {
        out.push(clampPct(base + randFloat(rngLocal, -5, 5)));
      }
      break;
    case 'downward_trend':
      base = randFloat(rngLocal, 70, 80);
      for (let w = 0; w < weeks.length; w += 1) {
        out.push(clampPct(base - w * randFloat(rngLocal, 4, 6) + randFloat(rngLocal, -2, 2)));
      }
      break;
    case 'steady':
    default:
      base = randFloat(rngLocal, 58, 74);
      for (let w = 0; w < weeks.length; w += 1) {
        out.push(clampPct(base + randFloat(rngLocal, -3, 3)));
      }
      break;
  }
  return out;
}

function clampPct(v) {
  return Math.max(5, Math.min(98, v));
}

export const SCORES = [];

STUDENTS.forEach((student) => {
  const subjects = SUBJECTS.filter((s) => s.categoryId === student.categoryId);
  subjects.forEach((subject) => {
    const archetype = STUDENT_ARCHETYPES[student.id][subject.id];
    const pctSeries = generateSeries(archetype, WEEKS, rng);

    // Determine which weeks (if any) should be missing for this student/subject.
    let missingWeeks = new Set();
    if (INCOMPLETE_STUDENT_IDS.has(student.id) && subject === subjects[0]) {
      // Miss the two most recent weeks in their headline subject.
      missingWeeks = new Set([WEEKS[WEEKS.length - 2].week, WEEKS[WEEKS.length - 1].week]);
    }

    // Simulate one center per region being late on one subject's most recent
    // week (drives the Regional/National Supervisor "late entry" panels).
    const isLateCenterSubject =
      (student.centerId === 'center-kumbo' && subject.id === 'sub-eng-circuit') ||
      (student.centerId === 'center-buea' && subject.id === 'sub-sw-eng-circuit');
    if (isLateCenterSubject) {
      missingWeeks.add(WEEKS[WEEKS.length - 1].week);
    }

    WEEKS.forEach(({ week }, idx) => {
      if (missingWeeks.has(week)) return;
      const pctScore = pctSeries[idx];
      const marks = Math.round((pctScore / 100) * MAX_SCORE * 10) / 10;
      SCORES.push({
        id: `score-${student.id}-${subject.id}-w${week}`,
        studentId: student.id,
        assessmentId: assessmentIdFor(subject.id, week),
        subjectId: subject.id,
        week,
        marksObtained: marks,
        maxScore: MAX_SCORE,
        enteredBy:
          CENTER_COORDINATORS.find((c) => c.centerId === student.centerId)?.id ?? null,
        enteredAt: WEEKS[idx].date,
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Follow-up notes & Outcomes
// ---------------------------------------------------------------------------
export const FOLLOW_UP_NOTES = [
  {
    id: 'note-1',
    studentId: STUDENTS[1]?.id,
    mentorId: STUDENTS[1]?.mentorId,
    date: '2026-06-20',
    note: 'Discussed the recent dip in scores. Student mentioned family issues at home affecting study time. Agreed on a lighter weekly check-in.',
  },
  {
    id: 'note-2',
    studentId: STUDENTS[3]?.id,
    mentorId: STUDENTS[3]?.mentorId,
    date: '2026-06-22',
    note: 'Followed up on missed assessment weeks. Coordinator confirmed the student was present but marks were not yet logged; resolved with center coordinator.',
  },
  {
    id: 'note-3',
    studentId: STUDENTS[6]?.id,
    mentorId: STUDENTS[6]?.mentorId,
    date: '2026-06-29',
    note: 'Great improvement this term — praised the student and encouraged them to keep up the current study group routine.',
  },
  {
    id: 'note-4',
    studentId: STUDENTS[30]?.id,
    mentorId: STUDENTS[30]?.mentorId,
    date: '2026-06-24',
    note: 'Checked in on the Technical track workload — student is adjusting well to the new center.',
  },
];

export const OUTCOMES = [
  {
    id: 'outcome-1',
    studentId: STUDENTS[10]?.id,
    outcomeType: 'University Admission',
    institutionOrProgram: 'University of Buea — Engineering',
    date: '2026-06-01',
    note: 'Admitted into the Faculty of Engineering after completing the Prepa program.',
    recordedBy: STUDENTS[10]?.mentorId,
  },
  {
    id: 'outcome-2',
    studentId: STUDENTS[20]?.id,
    outcomeType: 'Scholarship',
    institutionOrProgram: 'Open Dreams Scholarship',
    date: '2026-05-15',
    note: 'Awarded a partial scholarship via the Open Dreams partnership.',
    recordedBy: STUDENTS[20]?.mentorId,
  },
  {
    id: 'outcome-3',
    studentId: STUDENTS[35]?.id,
    outcomeType: 'University Admission',
    institutionOrProgram: 'University of Buea — Medicine',
    date: '2026-05-20',
    note: 'Admitted into the Faculty of Health Sciences after completing the Prepa program.',
    recordedBy: STUDENTS[35]?.mentorId,
  },
];

export const AT_RISK_THRESHOLD_DEFAULTS = {
  suddenDropPct: 0.2,
  sustainedLowPct: 0.5,
  sustainedLowWeeks: 2,
  trendWeeks: 4,
  trendSlopeThreshold: -3,
  incompleteDataWeeks: 2,
};

// ---------------------------------------------------------------------------
// Mock user accounts (login credentials) — one per person who holds a role.
// Students never get accounts (see build brief). Every account shares one
// demo password so the login screen's "demo accounts" list stays usable
// without needing to remember 19 separate passwords; swap this whole file
// for real Supabase Auth users later and nothing above the data layer changes.
// ---------------------------------------------------------------------------
export const DEMO_PASSWORD = 'mia2026';

function emailFor(name) {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  // National domain now that the platform spans multiple regions, not just NW.
  return `${slug}@mia-prepa.org`;
}

export const USERS = [
  {
    id: `user-${NATIONAL_SUPERVISOR.id}`,
    name: NATIONAL_SUPERVISOR.name,
    email: emailFor(NATIONAL_SUPERVISOR.name),
    password: DEMO_PASSWORD,
    role: ROLES.NATIONAL_SUPERVISOR,
    refId: NATIONAL_SUPERVISOR.id,
    contextLabel: 'All regions',
  },
  ...REGIONAL_SUPERVISORS.map((rs) => ({
    id: `user-${rs.id}`,
    name: rs.name,
    email: emailFor(rs.name),
    password: DEMO_PASSWORD,
    role: ROLES.REGIONAL_SUPERVISOR,
    refId: rs.id,
    contextLabel: REGIONS.find((r) => r.id === rs.regionId)?.name ?? '',
  })),
  ...REGIONAL_COORDINATORS.map((c) => {
    const category = CATEGORIES.find((cat) => cat.id === c.categoryId);
    const region = REGIONS.find((r) => r.id === category?.regionId);
    return {
      id: `user-${c.id}`,
      name: c.name,
      email: emailFor(c.name),
      password: DEMO_PASSWORD,
      role: ROLES.REGIONAL_COORDINATOR,
      refId: c.id,
      // Category names repeat across regions (each region has its own
      // "Engineering", say) so disambiguate in the one place — the login
      // screen's demo-accounts list — where accounts from every region and
      // category sit side by side.
      contextLabel: category ? `${category.name} (${region?.name ?? ''})` : '',
    };
  }),
  ...HODS.map((h) => {
    const subject = SUBJECTS.find((s) => s.hodId === h.id);
    const category = CATEGORIES.find((cat) => cat.id === subject?.categoryId);
    const region = REGIONS.find((r) => r.id === category?.regionId);
    return {
      id: `user-${h.id}`,
      name: h.name,
      email: emailFor(h.name),
      password: DEMO_PASSWORD,
      role: ROLES.HOD,
      refId: h.id,
      contextLabel: subject ? `${subject.name} (${region?.name ?? ''})` : '',
    };
  }),
  ...CENTER_COORDINATORS.map((c) => ({
    id: `user-${c.id}`,
    name: c.name,
    email: emailFor(c.name),
    password: DEMO_PASSWORD,
    role: ROLES.CENTER_COORDINATOR,
    refId: c.id,
    contextLabel: CENTERS.find((center) => center.id === c.centerId)?.name ?? '',
  })),
  ...MENTORS.map((m) => ({
    id: `user-${m.id}`,
    name: m.name,
    email: emailFor(m.name),
    password: DEMO_PASSWORD,
    role: ROLES.MENTOR,
    refId: m.id,
    contextLabel: CENTERS.find((center) => center.id === m.centerId)?.name ?? '',
  })),
];
