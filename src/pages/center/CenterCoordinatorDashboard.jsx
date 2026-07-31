import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, AlertTriangle, FileWarning, Pencil, Upload, UserPlus, UserX, UserCheck, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useCenter, useCenterRoster, useMarkEntryStatus, useCategories, useMentorsByCenter } from '../../hooks';
import * as api from '../../data/api';
import { useConfirmDialog } from '../../components/ConfirmDialogProvider';
import StatCard from '../../components/StatCard';
import RosterTable from '../../components/RosterTable';
import Modal from '../../components/Modal';
import Loading from '../../components/Loading';

const emptyEnrollForm = { name: '', categoryId: '', mentorId: '' };

export default function CenterCoordinatorDashboard() {
  const { t } = useLanguage();
  const { actor } = useRole();
  const { alert, confirm } = useConfirmDialog();
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: center, loading: centerLoading } = useCenter(actor?.centerId);
  const { data: categories, loading: categoriesLoading } = useCategories({ regionId: actor?.regionId });
  const { data: roster, loading: rosterLoading, reload: reloadRoster } = useCenterRoster(actor?.centerId, {
    categoryId: categoryFilter || undefined,
  });
  const { data: mentors, loading: mentorsLoading } = useMentorsByCenter(actor?.centerId);
  const { data: markEntry, loading: markEntryLoading } = useMarkEntryStatus();

  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = enrolling
  const [enrollForm, setEnrollForm] = useState(emptyEnrollForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  if (centerLoading || rosterLoading || markEntryLoading || categoriesLoading || mentorsLoading) return <Loading />;

  async function handleMentorChange(student, mentorId) {
    const result = await api.updateStudentMentor(student.id, mentorId);
    if (!result.success) {
      await alert({ message: t('manageAdmins.error_save_failed') });
      return;
    }
    reloadRoster();
  }

  function openEnroll() {
    setEnrollForm(emptyEnrollForm);
    setFormError('');
    setEditingId('new');
  }

  function openEditStudent(student) {
    setEnrollForm({
      name: student.name,
      categoryId: student.categoryId,
      mentorId: student.mentorId ?? '',
    });
    setFormError('');
    setEditingId(student.id);
  }

  async function handleEnrollSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const mentorId = enrollForm.mentorId || null;
    const result =
      editingId === 'new'
        ? await api.createStudent({
            name: enrollForm.name,
            categoryId: enrollForm.categoryId,
            mentorId,
            centerId: actor.centerId,
          })
        : await api.updateStudent(editingId, { name: enrollForm.name, categoryId: enrollForm.categoryId, mentorId });
    setSaving(false);
    if (!result.success) {
      setFormError(t(`center.error_${result.error}`));
      return;
    }
    setEditingId(null);
    reloadRoster();
    if (result.studentCode) {
      await alert({ message: t('center.enrolledSuccess', { matricule: result.studentCode }), tone: 'info' });
    }
  }

  async function handleWithdrawToggle(student) {
    const withdrawing = student.status !== 'withdrawn';
    const ok = await confirm({
      message: t(withdrawing ? 'center.confirmWithdraw' : 'center.confirmReactivate', { name: student.name }),
      danger: withdrawing,
      confirmLabel: t(withdrawing ? 'center.withdraw' : 'center.reactivate'),
    });
    if (!ok) return;
    const result = await api.updateStudentStatus(student.id, withdrawing ? 'withdrawn' : 'active');
    if (!result.success) {
      await alert({ message: t('manageAdmins.error_save_failed') });
      return;
    }
    reloadRoster();
  }

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
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/center/bulk-enroll')}>
            <FileSpreadsheet size={16} strokeWidth={2} />
            {t('center.bulkEnroll')}
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
          <div className="row-between" style={{ gap: 12 }}>
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
            <button type="button" className="btn btn-sm" onClick={openEnroll}>
              <UserPlus size={14} strokeWidth={2} />
              {t('center.enrollStudent')}
            </button>
          </div>
        </div>
        <RosterTable
          rows={roster}
          showCategory
          showMentor
          onView={(row) => navigate(`/students/${row.id}`)}
          mentorOptions={mentors}
          onMentorChange={handleMentorChange}
          extraAction={(row) => (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditStudent(row)}>
                <Pencil size={14} strokeWidth={2} />
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleWithdrawToggle(row)}>
                {row.status === 'withdrawn' ? <UserCheck size={14} strokeWidth={2} /> : <UserX size={14} strokeWidth={2} />}
              </button>
            </>
          )}
        />
      </div>

      {editingId && (
        <Modal
          title={editingId === 'new' ? t('center.enrollStudent') : t('center.editStudent')}
          onClose={() => setEditingId(null)}
        >
          <form className="stack" onSubmit={handleEnrollSave}>
            <div className="field">
              <label>{t('common.name')}</label>
              <input
                type="text"
                required
                value={enrollForm.name}
                onChange={(e) => setEnrollForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>{t('common.category')}</label>
              <select
                required
                value={enrollForm.categoryId}
                onChange={(e) => setEnrollForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t('common.mentor')}</label>
              <select
                value={enrollForm.mentorId}
                onChange={(e) => setEnrollForm((f) => ({ ...f, mentorId: e.target.value }))}
              >
                <option value="">{t('common.unassigned')}</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {formError && <p className="badge badge-needs_attention">{formError}</p>}

            <button type="submit" className="btn btn-block" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
