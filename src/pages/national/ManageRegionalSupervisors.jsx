import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRegionalSupervisors, useRegions } from '../../hooks';
import * as api from '../../data/api';
import Modal from '../../components/Modal';
import Loading from '../../components/Loading';
import { useConfirmDialog } from '../../components/ConfirmDialogProvider';

const emptyForm = { name: '', email: '', password: '', regionId: '' };

export default function ManageRegionalSupervisors() {
  const { t } = useLanguage();
  const { confirm } = useConfirmDialog();
  const { data: supervisors, loading, reload } = useRegionalSupervisors();
  const { data: regions } = useRegions();

  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = creating
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setEditingId('new');
  }

  function openEdit(supervisor) {
    setForm({ name: supervisor.name, email: supervisor.email, password: '', regionId: supervisor.regionId ?? '' });
    setFormError('');
    setEditingId(supervisor.id);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const result =
      editingId === 'new'
        ? await api.createRegionalSupervisor({
            name: form.name,
            email: form.email,
            password: form.password,
            regionId: form.regionId || undefined,
          })
        : await api.updateRegionalSupervisor(editingId, {
            name: form.name,
            email: form.email,
            password: form.password || undefined,
            regionId: form.regionId || undefined,
          });
    setSaving(false);
    if (!result.success) {
      setFormError(t(`manageAdmins.error_${result.error}`));
      return;
    }
    setEditingId(null);
    reload();
  }

  async function handleDelete(supervisor) {
    const ok = await confirm({ message: t('manageAdmins.confirmDelete', { name: supervisor.name }) });
    if (!ok) return;
    await api.deleteRegionalSupervisor(supervisor.id);
    reload();
  }

  const currentSupervisorForRegion = (regionId) =>
    supervisors?.find((s) => s.regionId === regionId && s.id !== editingId);

  if (loading) return <Loading />;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>{t('manageRegionalSupervisors.title')}</h1>
          <p className="muted">{t('manageRegionalSupervisors.summary')}</p>
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
                <th>{t('manageRegionalSupervisors.region')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {supervisors.map((supervisor) => (
                <tr key={supervisor.id}>
                  <td>{supervisor.name}</td>
                  <td>{supervisor.email}</td>
                  <td>{supervisor.regionName || t('manageRegionalSupervisors.noRegion')}</td>
                  <td>
                    <div className="manage-row-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(supervisor)}>
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(supervisor)}>
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {supervisors.length === 0 && (
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
            <div className="field">
              <label>{t('manageRegionalSupervisors.region')}</label>
              <select
                required
                value={form.regionId}
                onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value }))}
              >
                <option value="">—</option>
                {(regions || []).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {form.regionId && currentSupervisorForRegion(form.regionId) && (
                <p className="field-hint">
                  {t('manageRegionalSupervisors.replacesSupervisor', {
                    name: currentSupervisorForRegion(form.regionId).name,
                  })}
                </p>
              )}
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
