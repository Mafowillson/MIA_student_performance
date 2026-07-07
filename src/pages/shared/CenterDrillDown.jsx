import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole, ROLES } from '../../context/RoleContext';
import { useCenter, useStudentsWithStatus } from '../../hooks';
import RosterTable from '../../components/RosterTable';
import Loading from '../../components/Loading';

export default function CenterDrillDown() {
  const { t } = useLanguage();
  const { centerId } = useParams();
  const { role, actor } = useRole();
  const navigate = useNavigate();

  const categoryScope = role === ROLES.REGIONAL_COORDINATOR ? actor?.categoryId : undefined;
  const { data: center, loading: centerLoading } = useCenter(centerId);
  const { data: roster, loading: rosterLoading } = useStudentsWithStatus({
    centerId,
    categoryId: categoryScope,
  });

  if (centerLoading || rosterLoading) return <Loading />;

  const backTo = role === ROLES.REGIONAL_COORDINATOR ? '/coordinator' : '/supervisor';

  return (
    <div className="stack">
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(backTo)}>
        ← {t('nav.backToDashboard')}
      </button>
      <h1>{center?.name}</h1>
      <p className="muted">{center?.location}</p>

      <div className="card">
        <h2 className="mt-0">{t('center.roster')}</h2>
        <RosterTable
          rows={roster}
          showCategory
          showMentor
          onView={(row) => navigate(`/students/${row.id}`)}
        />
      </div>
    </div>
  );
}
