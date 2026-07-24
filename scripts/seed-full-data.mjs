// One-time (idempotent) seed: pushes every entity in src/data/mockData.js
// into the tables created by supabase/002_full_schema.sql. Run with the
// secret key (never the publishable key) via vite-node — plain Node can't
// resolve mockData.js's extensionless imports:
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SECRET_KEY=sb_secret_xxx npx vite-node scripts/seed-full-data.mjs
//
// Safe to re-run: every insert is an upsert keyed on the row's existing `id`
// (already unique, matches mockData.js's own IDs — nothing here needs
// remapping to a generated UUID).
import { createClient } from '@supabase/supabase-js';
import {
  REGIONS,
  HODS,
  CATEGORIES,
  SUBJECTS,
  CENTERS,
  REGIONAL_SUPERVISORS,
  REGIONAL_COORDINATORS,
  CENTER_COORDINATORS,
  MENTORS,
  STUDENTS,
  ASSESSMENTS,
  SCORES,
  FOLLOW_UP_NOTES,
  OUTCOMES,
  AT_RISK_THRESHOLD_DEFAULTS,
} from '../src/data/mockData.js';

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY env vars before running this script.');
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsert(table, rows) {
  if (rows.length === 0) return;
  const { error } = await admin.from(table).upsert(rows);
  if (error) {
    console.error(`FAILED upserting into ${table}:`, error.message);
    process.exitCode = 1;
  } else {
    console.log(`${table}: upserted ${rows.length} row(s).`);
  }
}

async function main() {
  // FK-safe order: regions/hods -> categories -> subjects/centers ->
  // regional_supervisors/regional_coordinators/center_coordinators/mentors ->
  // students -> assessments -> scores -> follow_up_notes/outcomes -> at_risk_config.
  await upsert('regions', REGIONS.map((r) => ({ id: r.id, name: r.name })));
  await upsert('hods', HODS.map((h) => ({ id: h.id, name: h.name })));

  await upsert(
    'categories',
    CATEGORIES.map((c) => ({ id: c.id, name: c.name, region_id: c.regionId })),
  );

  await upsert(
    'centers',
    CENTERS.map((c) => ({ id: c.id, name: c.name, location: c.location, region_id: c.regionId })),
  );

  await upsert(
    'subjects',
    SUBJECTS.map((s) => ({ id: s.id, name: s.name, category_id: s.categoryId, hod_id: s.hodId ?? null })),
  );

  await upsert(
    'regional_supervisors',
    REGIONAL_SUPERVISORS.map((rs) => ({ id: rs.id, name: rs.name, region_id: rs.regionId ?? null })),
  );
  await upsert(
    'regional_coordinators',
    REGIONAL_COORDINATORS.map((c) => ({ id: c.id, name: c.name, category_id: c.categoryId })),
  );
  await upsert(
    'center_coordinators',
    CENTER_COORDINATORS.map((c) => ({ id: c.id, name: c.name, center_id: c.centerId })),
  );
  await upsert(
    'mentors',
    MENTORS.map((m) => ({ id: m.id, name: m.name, center_id: m.centerId })),
  );

  await upsert(
    'students',
    STUDENTS.map((s) => ({
      id: s.id,
      student_code: s.studentCode,
      name: s.name,
      center_id: s.centerId,
      category_id: s.categoryId,
      mentor_id: s.mentorId ?? null,
      enrollment_date: s.enrollmentDate,
      status: s.status,
    })),
  );

  await upsert(
    'assessments',
    ASSESSMENTS.map((a) => ({
      id: a.id,
      subject_id: a.subjectId,
      week: a.week,
      date: a.date,
      term_id: a.termId,
      max_score: a.maxScore,
    })),
  );

  // Scores is the largest table (students x subjects x weeks) — chunk the
  // upsert so a single request body doesn't balloon unnecessarily.
  const scoreRows = SCORES.map((sc) => ({
    id: sc.id,
    student_id: sc.studentId,
    assessment_id: sc.assessmentId,
    subject_id: sc.subjectId,
    week: sc.week,
    marks_obtained: sc.marksObtained,
    max_score: sc.maxScore,
    entered_by: sc.enteredBy ?? null,
    entered_at: sc.enteredAt,
  }));
  const CHUNK = 500;
  for (let i = 0; i < scoreRows.length; i += CHUNK) {
    await upsert('scores', scoreRows.slice(i, i + CHUNK));
  }

  await upsert(
    'follow_up_notes',
    FOLLOW_UP_NOTES.filter((n) => n.studentId).map((n) => ({
      id: n.id,
      student_id: n.studentId,
      mentor_id: n.mentorId ?? null,
      date: n.date,
      note: n.note,
    })),
  );

  await upsert(
    'outcomes',
    OUTCOMES.filter((o) => o.studentId).map((o) => ({
      id: o.id,
      student_id: o.studentId,
      outcome_type: o.outcomeType,
      institution_or_program: o.institutionOrProgram,
      date: o.date,
      note: o.note,
      recorded_by: o.recordedBy ?? null,
    })),
  );

  await upsert('at_risk_config', [
    {
      id: 'default',
      sudden_drop_pct: AT_RISK_THRESHOLD_DEFAULTS.suddenDropPct,
      sustained_low_pct: AT_RISK_THRESHOLD_DEFAULTS.sustainedLowPct,
      sustained_low_weeks: AT_RISK_THRESHOLD_DEFAULTS.sustainedLowWeeks,
      trend_weeks: AT_RISK_THRESHOLD_DEFAULTS.trendWeeks,
      trend_slope_threshold: AT_RISK_THRESHOLD_DEFAULTS.trendSlopeThreshold,
      incomplete_data_weeks: AT_RISK_THRESHOLD_DEFAULTS.incompleteDataWeeks,
    },
  ]);

  console.log('Done.');
}

main();
