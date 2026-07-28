import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useCentersManaged } from '../../hooks';
import * as api from '../../data/api';
import Modal from '../../components/Modal';
import Loading from '../../components/Loading';
import { useConfirmDialog } from '../../components/ConfirmDialogProvider';

const emptyForm = { name: '', location: '' };

export default function ManageCenters() {
  const { t } = useLanguage();
  const { confirm, alert } = useConfirmDialog();
  const { actor } = useRole();
  const regionId = actor?.regionId;
  // Scoped to the acting Regional Supervisor's own region — a Regional
  // Supervisor never sees or edits another region's centers.
  const { data: centers, loading, reload } = useCentersManaged(regionId);

  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = creating
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setEditingId('new');
  }

  function openEdit(center) {
    setForm({ name: center.name, location: center.location ?? '' });
    setFormError('');
    setEditingId(center.id);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const result =
      editingId === 'new'
        ? await api.createCenter({ name: form.name, location: form.location, regionId })
        : await api.updateCenter(editingId, { name: form.name, location: form.location });
    setSaving(false);
    if (!result.success) {
      setFormError(t(`manageCenters.error_${result.error}`));
      return;
    }
    setEditingId(null);
    reload();
  }

  // Deletion can be blocked by the data layer (center still has students, a
  // coordinator, or mentors) — surfaced as an alert since there's no open
  // form at that point, just a row action.
  async function handleDelete(center) {
    const ok = await confirm({ message: t('manageAdmins.confirmDelete', { name: center.name }) });
    if (!ok) return;
    const result = await api.deleteCenter(center.id);
    if (!result.success) {
      await alert({ message: t(`manageCenters.error_${result.error}`) });
      return;
    }
    reload();
  }

  if (loading) return <Loading />;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>{t('manageCenters.title')}</h1>
          <p className="muted">{t('manageCenters.summary')}</p>
        </div>
        <button type="button" className="btn" onClick={openCreate}>
          <Plus size={16} strokeWidth={2} />
          {t('manageCenters.addNew')}
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('manageCenters.name')}</th>
                <th>{t('manageCenters.location')}</th>
                <th>{t('manageCenters.coordinator')}</th>
                <th>{t('common.students')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {centers.map((center) => (
                <tr key={center.id}>
                  <td>{center.name}</td>
                  <td>{center.location}</td>
                  <td>{center.coordinatorName ?? t('manageCenters.noCoordinator')}</td>
                  <td>{center.studentCount}</td>
                  <td>
                    <div className="manage-row-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(center)}>
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(center)}>
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {centers.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingId && (
        <Modal
          title={editingId === 'new' ? t('manageCenters.addNew') : t('manageCenters.editTitle')}
          onClose={() => setEditingId(null)}
        >
          <form className="stack" onSubmit={handleSave}>
            <div className="field">
              <label>{t('manageCenters.name')}</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>{t('manageCenters.location')}</label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
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
