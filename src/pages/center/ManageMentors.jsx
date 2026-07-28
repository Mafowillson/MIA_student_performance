import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useMentorsByCenter } from '../../hooks';
import * as api from '../../data/api';
import Modal from '../../components/Modal';
import Loading from '../../components/Loading';
import { useConfirmDialog } from '../../components/ConfirmDialogProvider';

const emptyForm = { name: '', email: '', password: '' };

export default function ManageMentors() {
  const { t } = useLanguage();
  const { confirm } = useConfirmDialog();
  const { actor } = useRole();
  const { data: mentors, loading, reload } = useMentorsByCenter(actor?.centerId);

  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = creating
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setEditingId('new');
  }

  function openEdit(mentor) {
    setForm({ name: mentor.name, email: mentor.email, password: '' });
    setFormError('');
    setEditingId(mentor.id);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const result =
      editingId === 'new'
        ? await api.createMentor({ name: form.name, email: form.email, password: form.password, centerId: actor.centerId })
        : await api.updateMentor(editingId, {
            name: form.name,
            email: form.email,
            password: form.password || undefined,
          });
    setSaving(false);
    if (!result.success) {
      setFormError(t(`manageAdmins.error_${result.error}`));
      return;
    }
    setEditingId(null);
    reload();
  }

  async function handleDelete(mentor) {
    const message =
      mentor.menteeCount > 0
        ? t('manageMentors.confirmDeleteWithMentees', { name: mentor.name, count: mentor.menteeCount })
        : t('manageAdmins.confirmDelete', { name: mentor.name });
    const ok = await confirm({ message });
    if (!ok) return;
    await api.deleteMentor(mentor.id);
    reload();
  }

  if (loading) return <Loading />;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>{t('manageMentors.title')}</h1>
          <p className="muted">{t('manageMentors.summary')}</p>
        </div>
        <button type="button" className="btn" onClick={openCreate}>
          <Plus size={16} strokeWidth={2} />
          {t('manageAdmins.addNew')}
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('login.email')}</th>
                <th>{t('manageMentors.mentees')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {mentors.map((mentor) => (
                <tr key={mentor.id}>
                  <td>{mentor.name}</td>
                  <td>{mentor.email}</td>
                  <td>{mentor.menteeCount}</td>
                  <td>
                    <div className="manage-row-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(mentor)}>
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(mentor)}>
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {mentors.length === 0 && (
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
          title={editingId === 'new' ? t('manageAdmins.addNew') : t('manageAdmins.editTitle')}
          onClose={() => setEditingId(null)}
        >
          <form className="stack" onSubmit={handleSave}>
            <div className="field">
              <label>{t('common.name')}</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>{t('login.email')}</label>
              <input
                type="text"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>
                {t('login.password')}
                {editingId !== 'new' && ` (${t('manageAdmins.leaveBlank')})`}
              </label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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
