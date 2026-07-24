import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRegions, useRegionalSupervisors, useCenters } from '../../hooks';
import * as api from '../../data/api';
import Modal from '../../components/Modal';
import Loading from '../../components/Loading';

const emptyForm = { name: '' };

export default function ManageRegions() {
  const { t } = useLanguage();
  const { data: regions, loading: regionsLoading, reload } = useRegions();
  const { data: supervisors, loading: supervisorsLoading } = useRegionalSupervisors();
  const { data: centers, loading: centersLoading } = useCenters();

  const [editingId, setEditingId] = useState(null); // null = closed, 'new' = creating
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setEditingId('new');
  }

  function openEdit(region) {
    setForm({ name: region.name });
    setFormError('');
    setEditingId(region.id);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const result =
      editingId === 'new'
        ? await api.createRegion({ name: form.name })
        : await api.updateRegion(editingId, { name: form.name });
    setSaving(false);
    if (!result.success) {
      setFormError(t(`manageRegions.error_${result.error}`));
      return;
    }
    setEditingId(null);
    reload();
  }

  // Deletion can be blocked by the data layer (region still has centers or a
  // supervisor) — surfaced as an alert rather than a form error since there's
  // no form open at that point, just a row action.
  async function handleDelete(region) {
    if (!window.confirm(t('manageAdmins.confirmDelete', { name: region.name }))) return;
    const result = await api.deleteRegion(region.id);
    if (!result.success) {
      window.alert(t(`manageRegions.error_${result.error}`));
      return;
    }
    reload();
  }

  const loading = regionsLoading || supervisorsLoading || centersLoading;
  if (loading) return <Loading />;

  const centerCountFor = (regionId) => centers.filter((c) => c.regionId === regionId).length;
  const supervisorNameFor = (regionId) => supervisors.find((s) => s.regionId === regionId)?.name;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>{t('manageRegions.title')}</h1>
          <p className="muted">{t('manageRegions.summary')}</p>
        </div>
        <button type="button" className="btn" onClick={openCreate}>
          <Plus size={16} strokeWidth={2} />
          {t('manageRegions.addNew')}
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('manageRegions.name')}</th>
                <th>{t('manageRegions.centers')}</th>
                <th>{t('manageRegions.supervisor')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {regions.map((region) => (
                <tr key={region.id}>
                  <td>{region.name}</td>
                  <td>{centerCountFor(region.id)}</td>
                  <td>{supervisorNameFor(region.id) ?? t('national.noSupervisor')}</td>
                  <td>
                    <div className="manage-row-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(region)}>
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(region)}>
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {regions.length === 0 && (
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
          title={editingId === 'new' ? t('manageRegions.addNew') : t('manageRegions.editTitle')}
          onClose={() => setEditingId(null)}
        >
          <form className="stack" onSubmit={handleSave}>
            <div className="field">
              <label>{t('manageRegions.name')}</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
