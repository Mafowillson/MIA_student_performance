import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useMentees, useCenters, useCategories } from '../../hooks';
import Sparkline from '../../components/charts/Sparkline';
import StatusTag from '../../components/StatusTag';
import Loading from '../../components/Loading';

export default function MentorDashboard() {
  const { t } = useLanguage();
  const { actor } = useRole();
  const navigate = useNavigate();
  const { data: mentees, loading } = useMentees(actor?.id);
  const { data: centers } = useCenters();
  const { data: categories } = useCategories();

  if (loading || !centers || !categories) return <Loading />;

  const centerName = (id) => centers.find((c) => c.id === id)?.name ?? '—';
  const categoryName = (id) => categories.find((c) => c.id === id)?.name ?? '—';

  return (
    <div className="stack">
      <div>
        <h1>{t('mentor.title')}</h1>
        <p className="muted">{t('mentor.summary')}</p>
      </div>

      <div className="grid-cards">
        {mentees.map((student) => (
          <button
            key={student.id}
            type="button"
            className="card card-link"
            style={{ textAlign: 'left', cursor: 'pointer' }}
            onClick={() => navigate(`/mentor/mentee/${student.id}`)}
          >
            <div className="row-between">
              <div>
                <h3 className="mt-0">{student.name}</h3>
                <p className="muted small mt-0">
                  {centerName(student.centerId)} · {categoryName(student.categoryId)}
                </p>
              </div>
              <Sparkline
                history={student.headlineHistory}
                color={
                  student.status === 'needs_attention'
                    ? 'var(--status-attention)'
                    : student.status === 'improving'
                      ? 'var(--status-improving)'
                      : 'var(--status-steady)'
                }
              />
            </div>
            <StatusTag status={student.status} />
          </button>
        ))}
      </div>
    </div>
  );
}
