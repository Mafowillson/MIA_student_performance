import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useNationalSummary } from '../../hooks';
import StatCard from '../../components/StatCard';
import Loading from '../../components/Loading';

export default function NationalSupervisorDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data, loading } = useNationalSummary();

  if (loading) return <Loading />;

  return (
    <div className="stack">
      <div>
        <h1>{t('national.title')}</h1>
        <p className="muted">{t('national.summary')}</p>
      </div>

      <div className="grid">
        <StatCard label={t('national.totalRegions')} value={data.totalRegions} />
        <StatCard label={t('national.staffedRegions')} value={data.staffedRegions} />
        <StatCard label={t('supervisor.totalStudents')} value={data.totalStudents} />
        <StatCard label={t('supervisor.totalCenters')} value={data.totalCenters} />
        <StatCard label={t('supervisor.atRisk')} value={data.atRiskCount} tone="warn" />
        <StatCard label={t('supervisor.incomplete')} value={data.incompleteCount} tone="info" />
      </div>

      <div className="card">
        <h2 className="mt-0">{t('national.byRegion')}</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('manageRegionalSupervisors.region')}</th>
                <th>{t('roles.regional_supervisor')}</th>
                <th>{t('common.students')}</th>
                <th>{t('common.centers')}</th>
                <th>{t('supervisor.atRisk')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.perRegion.map((row) => (
                <tr key={row.region.id}>
                  <td>{row.region.name}</td>
                  <td>
                    {row.supervisorName || (
                      <span className="badge badge-incomplete_data">{t('national.noSupervisor')}</span>
                    )}
                  </td>
                  <td>{row.totalStudents}</td>
                  <td>{row.totalCenters}</td>
                  <td>{row.atRiskCount}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/national/region/${row.region.id}`)}
                    >
                      {t('supervisor.drillIn')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
