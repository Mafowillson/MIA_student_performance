import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useSubjectSummary } from '../../hooks';
import TrendChart from '../../components/charts/TrendChart';
import StatCard from '../../components/StatCard';
import Loading from '../../components/Loading';

export default function HODDashboard() {
  const { t } = useLanguage();
  const { actor } = useRole();
  const navigate = useNavigate();
  const { data, loading } = useSubjectSummary(actor?.subject?.id);

  if (loading) return <Loading />;

  const trendHistory = data.weeklyAvg.map((w) => ({
    week: w.week,
    pct: w.avgPct,
    marksObtained: null,
    maxScore: 20,
  }));

  return (
    <div className="stack">
      <div>
        <h1>{t('hodDash.title', { subject: data.subject?.name })}</h1>
        <p className="muted">{t('hodDash.summary')}</p>
        <div className="notice-banner mt-1">
          <Info size={16} strokeWidth={2} />
          <span>{t('hodDash.readOnlyNotice')}</span>
        </div>
      </div>

      <div className="grid">
        <StatCard label={t('supervisor.totalStudents')} value={data.totalStudents} />
        <StatCard label={t('supervisor.atRisk')} value={data.flaggedStudents.length} tone="warn" />
      </div>

      <TrendChart title={t('hodDash.weeklyTrend')} history={trendHistory} />

      <div className="card">
        <h2 className="mt-0">{t('hodDash.byCenter')}</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.center')}</th>
                <th>{t('common.students')}</th>
                <th>Avg %</th>
              </tr>
            </thead>
            <tbody>
              {data.perCenter.map((row) => (
                <tr key={row.center.id}>
                  <td>{row.center.name}</td>
                  <td>{row.studentCount}</td>
                  <td>{row.avgPct != null ? `${Math.round(row.avgPct)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="mt-0">{t('hodDash.flagged')}</h2>
        {data.flaggedStudents.length === 0 ? (
          <p className="muted small">{t('hodDash.noFlagged')}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.student')}</th>
                  <th>Flags</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.flaggedStudents.map(({ student, flags }) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{flags.map((f) => f.type).join(', ')}</td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/students/${student.id}`)}>
                        {t('supervisor.drillIn')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
