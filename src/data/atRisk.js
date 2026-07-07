// At-risk flagging logic, computed client-side against score history.
// Thresholds are configurable (not hardcoded) — see AT_RISK_THRESHOLD_DEFAULTS in mockData.js.
import { AT_RISK_THRESHOLD_DEFAULTS } from './mockData';

/**
 * @param {Array<{week:number, pct:number|null}>} history sorted ascending by week
 * @param {object} config threshold overrides
 */
export function analyzeSubjectHistory(history, config = AT_RISK_THRESHOLD_DEFAULTS) {
  const cfg = { ...AT_RISK_THRESHOLD_DEFAULTS, ...config };
  const sorted = [...history].sort((a, b) => a.week - b.week);
  const flags = [];

  // --- Sudden drop: adjacent present weeks, drop >= suddenDropPct ---
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.pct == null || curr.pct == null) continue;
    if (curr.week !== prev.week + 1) continue; // must be consecutive weeks
    const drop = prev.pct - curr.pct;
    if (drop >= cfg.suddenDropPct * 100) {
      flags.push({
        type: 'sudden_drop',
        week: curr.week,
        detail: { fromPct: prev.pct, toPct: curr.pct, dropPct: drop },
      });
    }
  }

  // --- Sustained low: run of >= sustainedLowWeeks consecutive present weeks below threshold ---
  {
    let runStart = null;
    let runLen = 0;
    let prevWeek = null;
    for (const point of sorted) {
      const isLow = point.pct != null && point.pct < cfg.sustainedLowPct * 100;
      const isConsecutive = prevWeek == null || point.week === prevWeek + 1;
      if (isLow && isConsecutive) {
        if (runStart == null) runStart = point.week;
        runLen += 1;
      } else if (isLow && !isConsecutive) {
        runStart = point.week;
        runLen = 1;
      } else {
        if (runLen >= cfg.sustainedLowWeeks) {
          flags.push({
            type: 'sustained_low',
            week: prevWeek,
            detail: { startWeek: runStart, endWeek: prevWeek, weeks: runLen },
          });
        }
        runStart = null;
        runLen = 0;
      }
      prevWeek = point.week;
    }
    if (runLen >= cfg.sustainedLowWeeks) {
      flags.push({
        type: 'sustained_low',
        week: prevWeek,
        detail: { startWeek: runStart, endWeek: prevWeek, weeks: runLen },
      });
    }
  }

  // --- Downward trend: linear regression slope over the last N present weeks ---
  {
    const present = sorted.filter((p) => p.pct != null).slice(-cfg.trendWeeks);
    if (present.length >= 3) {
      const slope = linearSlope(present.map((p) => p.week), present.map((p) => p.pct));
      if (slope <= cfg.trendSlopeThreshold) {
        flags.push({
          type: 'downward_trend',
          week: present[present.length - 1].week,
          detail: { slope, weeksConsidered: present.length },
        });
      }
    }
  }

  // --- Incomplete data: run of >= incompleteDataWeeks consecutive missing weeks ---
  let incompleteFlag = null;
  {
    let runStart = null;
    let runLen = 0;
    let prevWeek = null;
    for (const point of sorted) {
      const isMissing = point.pct == null;
      const isConsecutive = prevWeek == null || point.week === prevWeek + 1;
      if (isMissing && isConsecutive) {
        if (runStart == null) runStart = point.week;
        runLen += 1;
      } else if (isMissing && !isConsecutive) {
        runStart = point.week;
        runLen = 1;
      } else {
        if (runLen >= cfg.incompleteDataWeeks && !incompleteFlag) {
          incompleteFlag = { type: 'incomplete_data', detail: { startWeek: runStart, endWeek: prevWeek, weeks: runLen } };
        }
        runStart = null;
        runLen = 0;
      }
      prevWeek = point.week;
    }
    if (runLen >= cfg.incompleteDataWeeks && !incompleteFlag) {
      incompleteFlag = { type: 'incomplete_data', detail: { startWeek: runStart, endWeek: prevWeek, weeks: runLen } };
    }
  }

  const presentPoints = sorted.filter((p) => p.pct != null);
  const latestPct = presentPoints.length ? presentPoints[presentPoints.length - 1].pct : null;
  const firstPct = presentPoints.length ? presentPoints[0].pct : null;
  const overallDelta = latestPct != null && firstPct != null ? latestPct - firstPct : null;

  return {
    flags,
    hasNeedsAttention: flags.length > 0,
    incompleteFlag,
    hasIncompleteData: !!incompleteFlag,
    latestPct,
    firstPct,
    overallDelta,
  };
}

function linearSlope(xs, ys) {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return 0;
  return num / den;
}

/**
 * Combine per-subject analyses into one overall student status.
 * Priority: needs_attention > incomplete_data > improving > steady
 */
/**
 * Softer, student-facing trend narrative for the shared (no-login) view.
 * Intentionally avoids "at risk" language — this feeds an encouraging,
 * plain-language summary sentence, not a flag.
 */
export function computeTrendNarrative(history) {
  const sorted = [...history].sort((a, b) => a.week - b.week);
  const present = sorted.filter((p) => p.pct != null);
  if (present.length === 0) return { kind: 'no_data', streakWeeks: 0, delta: null };

  // Longest current streak (ending at the latest present week) of consecutive
  // improvements over consecutive weeks.
  let streak = 0;
  for (let i = present.length - 1; i > 0; i -= 1) {
    const curr = present[i];
    const prev = present[i - 1];
    const consecutiveWeeks = curr.week === prev.week + 1;
    if (consecutiveWeeks && curr.pct >= prev.pct) {
      streak += 1;
    } else {
      break;
    }
  }

  const delta = present.length >= 2 ? present[present.length - 1].pct - present[0].pct : 0;

  if (streak >= 2) {
    return { kind: 'improving_streak', streakWeeks: streak + 1, delta };
  }
  if (delta > 5) {
    return { kind: 'improving', streakWeeks: 0, delta };
  }
  if (delta < -5) {
    return { kind: 'decline', streakWeeks: 0, delta };
  }
  return { kind: 'steady', streakWeeks: 0, delta };
}

export function computeStudentStatus(bySubjectAnalysis) {
  const subjectIds = Object.keys(bySubjectAnalysis);
  let status = 'steady';

  const anyNeedsAttention = subjectIds.some((id) => bySubjectAnalysis[id].hasNeedsAttention);
  const anyIncomplete = subjectIds.some((id) => bySubjectAnalysis[id].hasIncompleteData);

  if (anyNeedsAttention) {
    status = 'needs_attention';
  } else if (anyIncomplete) {
    status = 'incomplete_data';
  } else {
    const deltas = subjectIds
      .map((id) => bySubjectAnalysis[id].overallDelta)
      .filter((d) => d != null);
    const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    status = avgDelta >= 5 ? 'improving' : 'steady';
  }

  return { status, bySubject: bySubjectAnalysis };
}
