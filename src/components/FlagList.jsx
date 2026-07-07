import { useLanguage } from '../i18n/LanguageContext';

function flagVars(flag) {
  const d = flag.detail || {};
  switch (flag.type) {
    case 'sudden_drop':
      return { week: flag.week, from: Math.round(d.fromPct), to: Math.round(d.toPct) };
    case 'sustained_low':
      return { start: d.startWeek, end: d.endWeek };
    case 'downward_trend':
      return { weeks: d.weeksConsidered };
    default:
      return {};
  }
}

// Renders all active flags across a student's subjects (bySubject = the
// output of api.getStudentAnalysis().bySubject).
export default function FlagList({ bySubject }) {
  const { t } = useLanguage();
  const rows = [];

  Object.values(bySubject || {}).forEach((analysis) => {
    const subjectName = analysis.subject?.name;
    analysis.flags.forEach((flag) => {
      rows.push({ key: `${subjectName}-${flag.type}-${flag.week}`, subjectName, text: t(`flags.${flag.type}`, flagVars(flag)) });
    });
    if (analysis.incompleteFlag) {
      const d = analysis.incompleteFlag.detail;
      rows.push({
        key: `${subjectName}-incomplete`,
        subjectName,
        text: t('flags.incomplete_data', { start: d.startWeek, end: d.endWeek }),
      });
    }
  });

  if (rows.length === 0) {
    return <p className="muted small">{t('mentor.noFlags')}</p>;
  }

  return (
    <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>
      {rows.map((row) => (
        <li key={row.key} className="small">
          <strong>{row.subjectName}:</strong> {row.text}
        </li>
      ))}
    </ul>
  );
}
