import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, AlertTriangle, FileWarning, Pencil, Upload } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useCenter, useCenterRoster, useMarkEntryStatus, useCategories } from '../../hooks';
import StatCard from '../../components/StatCard';
import RosterTable from '../../components/RosterTable';
import Loading from '../../components/Loading';

export default function CenterCoordinatorDashboard() {
  const { t } = useLanguage();
  const { actor } = useRole();
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: center, loading: centerLoading } = useCenter(actor?.centerId);
  const { data: categories, loading: categoriesLoading } = useCategories();
  const { data: roster, loading: rosterLoading } = useCenterRoster(actor?.centerId, {
    categoryId: categoryFilter || undefined,
  });
  const { data: markEntry, loading: markEntryLoading } = useMarkEntryStatus();

  if (centerLoading || rosterLoading || markEntryLoading || categoriesLoading) return <Loading />;

  const incompleteHere = markEntry.filter((r) => r.centerId === actor.centerId && !r.complete);
  const atRiskCount = roster.filter((s) => s.status === 'needs_attention').length;

  return (
    <div className="stack">
      <div className="row-between">
        <div className="row">
          <span className="page-header-icon">
            <Building2 size={22} strokeWidth={2} />
          </span>
          <div>
            <h1 className="mt-0">{t('center.title', { center: center?.name })}</h1>
            <p className="muted mt-0">{center?.location}</p>
          </div>
        </div>
        <div className="row header-actions">
          <button type="button" className="btn" onClick={() => navigate('/center/mark-entry')}>
            <Pencil size={16} strokeWidth={2} />
            {t('center.manualEntry')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/center/upload')}>
            <Upload size={16} strokeWidth={2} />
            {t('center.excelUpload')}
          </button>
        </div>
      </div>

      <div className="grid">
        <StatCard label={t('common.students')} value={roster.length} icon={Users} />
        <StatCard label={t('supervisor.atRisk')} value={atRiskCount} tone="warn" icon={AlertTriangle} />
        <StatCard
          label={t('center.incompleteThisWeek')}
          value={incompleteHere.length}
          tone="info"
          icon={FileWarning}
        />
      </div>

      {incompleteHere.length > 0 && (
        <div className="alert-banner">
          <div className="alert-banner-title">
            <AlertTriangle size={18} strokeWidth={2} />
            {t('center.incompleteThisWeek')}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.category')}</th>
                  <th>{t('common.subject')}</th>
                  <th>{t('common.week')}</th>
                  <th>Entered</th>
                </tr>
              </thead>
              <tbody>
                {incompleteHere.map((row) => (
                  <tr key={row.subjectId}>
                    <td>{row.categoryName}</td>
                    <td>{row.subjectName}</td>
                    <td>{row.week}</td>
                    <td>{row.entered}/{row.expected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row-between mb-2">
          <h2 className="mt-0">{t('center.roster')}</h2>
          <div className="chip-row">
            <button
              type="button"
              className={`chip${categoryFilter === '' ? ' active' : ''}`}
              onClick={() => setCategoryFilter('')}
            >
              {t('common.categories')}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip${categoryFilter === c.id ? ' active' : ''}`}
                onClick={() => setCategoryFilter(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
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
