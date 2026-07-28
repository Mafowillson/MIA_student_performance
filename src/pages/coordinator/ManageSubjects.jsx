import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useSubjectsManaged } from '../../hooks';
import * as api from '../../data/api';
import Modal from '../../components/Modal';
import Loading from '../../components/Loading';
import { useConfirmDialog } from '../../components/ConfirmDialogProvider';

const emptyForm = { name: '', maxScore: '20' };

export default function ManageSubjects() {
  const { t } = useLanguage();
  const { confirm, alert } = useConfirmDialog();
  const { actor } = useRole();
  const categoryId = actor?.categoryId;
  // Scoped to the acting Regional Coordinator's own program — a Regional
  // Coordinator never sees or edits another program's subjects.
  const { data: subjects, loading, reload } = useSubjectsManaged(categoryId);

  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = creating
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setEditingId('new');
  }

  function openEdit(subject) {
    setForm({ name: subject.name, maxScore: String(subject.maxScore) });
    setFormError('');
    setEditingId(subject.id);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const result =
      editingId === 'new'
        ? await api.createSubject({ name: form.name, maxScore: Number(form.maxScore), categoryId })
        : await api.updateSubject(editingId, { name: form.name, maxScore: Number(form.maxScore) });
    setSaving(false);
    if (!result.success) {
      setFormError(t(`manageSubjects.error_${result.error}`));
      return;
    }
    setEditingId(null);
    reload();
  }

  // Deletion can be blocked by the data layer (subject already has real
  // assessments/scores recorded) — surfaced as an alert since there's no
  // open form at that point, just a row action.
  async function handleDelete(subject) {
    const ok = await confirm({ message: t('manageAdmins.confirmDelete', { name: subject.name }) });
    if (!ok) return;
    const result = await api.deleteSubject(subject.id);
    if (!result.success) {
      await alert({ message: t(`manageSubjects.error_${result.error}`) });
      return;
    }
    reload();
  }

  if (loading) return <Loading />;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>{t('manageSubjects.title')}</h1>
          <p className="muted">{t('manageSubjects.summary')}</p>
        </div>
        <button type="button" className="btn" onClick={openCreate}>
          <Plus size={16} strokeWidth={2} />
          {t('manageSubjects.addNew')}
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('manageSubjects.name')}</th>
                <th>{t('manageSubjects.maxScore')}</th>
                <th>{t('manageSubjects.hod')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id}>
                  <td>{subject.name}</td>
                  <td>{subject.maxScore}</td>
                  <td>{subject.hodName ?? t('manageSubjects.noHod')}</td>
                  <td>
                    <div className="manage-row-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(subject)}>
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(subject)}>
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingId && (
        <Modal
          title={editingId === 'new' ? t('manageSubjects.addNew') : t('manageSubjects.editTitle')}
          onClose={() => setEditingId(null)}
        >
          <form className="stack" onSubmit={handleSave}>
            <div className="field">
              <label>{t('manageSubjects.name')}</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>{t('manageSubjects.maxScore')}</label>
              <input
                type="number"
                min={1}
                required
                value={form.maxScore}
                onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
              />
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
