import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useRegionalSummary, useRegion } from '../../hooks';
import StatCard from '../../components/StatCard';
import Loading from '../../components/Loading';

// Serves two callers: the Regional Supervisor's own dashboard (/supervisor,
// region taken from their actor) and the National Supervisor's drill-in
// (/national/region/:regionId, region taken from the route) — same data,
// same screen, so the two views can never drift apart.
export default function RegionalSupervisorDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { regionId: regionIdParam } = useParams();
  const { actor } = useRole();
  const regionId = regionIdParam || actor?.regionId;
  const isNationalDrillIn = !!regionIdParam;

  const { data, loading } = useRegionalSummary(regionId);
  const { data: region, loading: regionLoading } = useRegion(regionId);

  if (loading || regionLoading) return <Loading />;

  const basePath = isNationalDrillIn ? `/national/region/${regionId}` : '/supervisor';

  return (
    <div className="stack">
      {isNationalDrillIn && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => navigate('/national')}
        >
          ← {t('national.backToNational')}
        </button>
      )}

      <div>
        <h1>{t('supervisor.title', { region: region?.name ?? '' })}</h1>
        <p className="muted">{t('supervisor.summary', { region: region?.name ?? '' })}</p>
      </div>

      <div className="grid">
        <StatCard label={t('supervisor.totalStudents')} value={data.totalStudents} />
        <StatCard label={t('supervisor.totalCenters')} value={data.totalCenters} />
        <StatCard label={t('supervisor.atRisk')} value={data.atRiskCount} tone="warn" />
        <StatCard label={t('supervisor.incomplete')} value={data.incompleteCount} tone="info" />
      </div>

      <div className="card">
        <h2 className="mt-0">{t('supervisor.lateEntry')}</h2>
        {data.markEntry.length === 0 ? (
          <p className="muted small">{t('supervisor.lateEntryEmpty')}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.center')}</th>
                  <th>{t('common.category')}</th>
                  <th>{t('common.subject')}</th>
                  <th>{t('common.week')}</th>
                  <th>Entered</th>
                </tr>
              </thead>
              <tbody>
                {data.markEntry.map((row) => (
                  <tr key={`${row.centerId}-${row.subjectId}`} className="row-issue">
                    <td>{row.centerName}</td>
                    <td>{row.categoryName}</td>
                    <td>{row.subjectName}</td>
                    <td>{row.week}</td>
                    <td>{row.entered}/{row.expected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mt-0">{t('supervisor.byCenter')}</h2>
        {data.perCenter.length === 0 ? (
          <p className="muted small">{t('common.noData')}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.center')}</th>
                  <th>{t('common.students')}</th>
                  <th>{t('supervisor.atRisk')}</th>
                  <th>{t('supervisor.incomplete')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.perCenter.map((row) => (
                  <tr key={row.center.id}>
                    <td>{row.center.name}</td>
                    <td>{row.studentCount}</td>
                    <td>{row.atRisk}</td>
                    <td>{row.incomplete}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`${basePath}/center/${row.center.id}`)}
                      >
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

      <div className="card">
        <h2 className="mt-0">{t('supervisor.byCategory')}</h2>
        {data.perCategory.length === 0 ? (
          <p className="muted small">{t('common.noData')}</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.category')}</th>
                  <th>{t('common.students')}</th>
                  <th>{t('supervisor.atRisk')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.perCategory.map((row) => (
                  <tr key={row.category.id}>
                    <td>{row.category.name}</td>
                    <td>{row.studentCount}</td>
                    <td>{row.atRisk}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`${basePath}/category/${row.category.id}`)}
                      >
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
