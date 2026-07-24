import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole, ROLES } from '../../context/RoleContext';
import { useCategories, useStudentsWithStatus, useCategorySummary } from '../../hooks';
import RosterTable from '../../components/RosterTable';
import StatCard from '../../components/StatCard';
import Loading from '../../components/Loading';

export default function CategoryDrillDown() {
  const { t } = useLanguage();
  const { categoryId, regionId } = useParams();
  const { role } = useRole();
  const navigate = useNavigate();

  const { data: categories, loading: catLoading } = useCategories();
  const { data: summary, loading: summaryLoading } = useCategorySummary(categoryId);
  const { data: roster, loading: rosterLoading } = useStudentsWithStatus({ categoryId });

  if (catLoading || summaryLoading || rosterLoading) return <Loading />;
  const category = categories.find((c) => c.id === categoryId);

  const backTo = role === ROLES.NATIONAL_SUPERVISOR ? `/national/region/${regionId}` : '/supervisor';

  return (
    <div className="stack">
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(backTo)}>
        ← {t('nav.backToDashboard')}
      </button>
      <h1>{category?.name}</h1>

      <div className="grid">
        <StatCard label={t('supervisor.totalStudents')} value={summary.totalStudents} />
        <StatCard label={t('supervisor.atRisk')} value={summary.atRiskCount} tone="warn" />
        <StatCard label={t('supervisor.incomplete')} value={summary.incompleteCount} tone="info" />
      </div>

      <div className="card">
        <h2 className="mt-0">{t('supervisor.byCenter')}</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.center')}</th>
                <th>{t('common.students')}</th>
                <th>{t('supervisor.atRisk')}</th>
                <th>{t('supervisor.incomplete')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.perCenter.map((row) => (
                <tr key={row.center.id}>
                  <td>{row.center.name}</td>
                  <td>{row.studentCount}</td>
                  <td>{row.atRisk}</td>
                  <td>{row.incomplete}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="mt-0">{t('center.roster')}</h2>
        <RosterTable
          rows={roster}
          showCenter
          showMentor
          onView={(row) => navigate(`/students/${row.id}`)}
        />
      </div>
    </div>
  );
}
