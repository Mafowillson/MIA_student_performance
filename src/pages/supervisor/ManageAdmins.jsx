import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ROLES } from '../../context/RoleContext';
import { useAdmins, useCategories, useSubjects, useCenters } from '../../hooks';
import * as api from '../../data/api';
import Modal from '../../components/Modal';
import Loading from '../../components/Loading';

const TABS = [
  { role: ROLES.REGIONAL_COORDINATOR, key: 'regional_coordinator' },
  { role: ROLES.HOD, key: 'hod' },
  { role: ROLES.CENTER_COORDINATOR, key: 'center_coordinator' },
];

const emptyForm = { name: '', email: '', password: '', categoryId: '', subjectId: '', centerId: '' };

export default function ManageAdmins() {
  const { t } = useLanguage();
  const [role, setRole] = useState(ROLES.REGIONAL_COORDINATOR);
  const { data: admins, loading, reload } = useAdmins(role);
  const { data: categories } = useCategories();
  const { data: subjects } = useSubjects();
  const { data: centers } = useCenters();

  const [editingId, setEditingId] = useState(null); // null = not editing, 'new' = creating
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function openCreate() {
    setForm(emptyForm);
    setFormError('');
    setEditingId('new');
  }

  function openEdit(admin) {
    setForm({
      name: admin.name,
      email: admin.email,
      password: '',
      categoryId: admin.categoryId ?? '',
      subjectId: admin.subjectId ?? '',
      centerId: admin.centerId ?? '',
    });
    setFormError('');
    setEditingId(admin.id);
  }

  function closeModal() {
    setEditingId(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    if (editingId === 'new') {
      const result = await api.createAdmin({
        role,
        name: form.name,
        email: form.email,
        password: form.password,
        categoryId: form.categoryId || undefined,
        subjectId: form.subjectId || undefined,
        centerId: form.centerId || undefined,
      });
      setSaving(false);
      if (!result.success) {
        setFormError(t(`manageAdmins.error_${result.error}`));
        return;
      }
    } else {
      const result = await api.updateAdmin(role, editingId, {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        categoryId: form.categoryId || undefined,
        subjectId: form.subjectId || undefined,
        centerId: form.centerId || undefined,
      });
      setSaving(false);
      if (!result.success) {
        setFormError(t(`manageAdmins.error_${result.error}`));
        return;
      }
    }
    setEditingId(null);
    reload();
  }

  async function handleDelete(admin) {
    if (!window.confirm(t('manageAdmins.confirmDelete', { name: admin.name }))) return;
    await api.deleteAdmin(role, admin.id);
    reload();
  }

  const currentHodForSubject = (subjectId) =>
    role === ROLES.HOD ? admins?.find((a) => a.subjectId === subjectId && a.id !== editingId) : null;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h1>{t('manageAdmins.title')}</h1>
          <p className="muted">{t('manageAdmins.summary')}</p>
        </div>
        <button type="button" className="btn" onClick={openCreate}>
          <Plus size={16} strokeWidth={2} />
          {t('manageAdmins.addNew')}
        </button>
      </div>

      <div className="chip-row">
        {TABS.map((tab) => (
          <button
            key={tab.role}
            type="button"
            className={`chip${role === tab.role ? ' active' : ''}`}
            onClick={() => setRole(tab.role)}
          >
            {t(`roles.${tab.key}`)}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t('login.email')}</th>
                  <th>{t(`manageAdmins.contextLabel_${role}`)}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.name}</td>
                    <td>{admin.email}</td>
                    <td>{admin.contextLabel || '—'}</td>
                    <td>
                      <div className="manage-row-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(admin)}>
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(admin)}>
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">{t('common.noData')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingId && (
        <Modal
          title={editingId === 'new' ? t('manageAdmins.addNew') : t('manageAdmins.editTitle')}
          onClose={closeModal}
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

            {role === ROLES.REGIONAL_COORDINATOR && (
              <div className="field">
                <label>{t('common.category')}</label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">—</option>
                  {(categories || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {role === ROLES.HOD && (
              <div className="field">
                <label>{t('common.subject')}</label>
                <select
                  required
                  value={form.subjectId}
                  onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
                >
                  <option value="">—</option>
                  {(subjects || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({categories?.find((c) => c.id === s.categoryId)?.name})
                    </option>
                  ))}
                </select>
                {form.subjectId && currentHodForSubject(form.subjectId) && (
                  <p className="field-hint">
                    {t('manageAdmins.replacesHod', { name: currentHodForSubject(form.subjectId).name })}
                  </p>
                )}
              </div>
            )}

            {role === ROLES.CENTER_COORDINATOR && (
              <div className="field">
                <label>{t('common.center')}</label>
                <select
                  required
                  value={form.centerId}
                  onChange={(e) => setForm((f) => ({ ...f, centerId: e.target.value }))}
                >
                  <option value="">—</option>
                  {(centers || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

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
