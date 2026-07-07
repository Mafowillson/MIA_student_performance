import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useFollowUpNotes } from '../../hooks';
import * as api from '../../data/api';
import StudentProfile from '../../components/StudentProfile';
import ShareReportActions from '../../components/ShareReportActions';
import Loading from '../../components/Loading';

export default function MenteeDetail() {
  const { t } = useLanguage();
  const { studentId } = useParams();
  const { actor } = useRole();
  const navigate = useNavigate();
  const { data: notes, loading: notesLoading, reload } = useFollowUpNotes(studentId);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function handleSaveNote() {
    if (!draft.trim()) return;
    setSaving(true);
    await api.addFollowUpNote({ studentId, mentorId: actor.id, note: draft.trim() });
    setDraft('');
    setSaving(false);
    setJustSaved(true);
    reload();
    setTimeout(() => setJustSaved(false), 2000);
  }

  return (
    <div className="stack">
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/mentor')}>
        ← {t('nav.backToDashboard')}
      </button>

      <StudentProfile studentId={studentId} actions={<ShareReportActions studentId={studentId} />} />

      <div className="card">
        <h2 className="mt-0">{t('mentor.addNote')}</h2>
        <div className="field">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('mentor.notePlaceholder')}
          />
        </div>
        <div className="row mt-1">
          <button type="button" className="btn" disabled={!draft.trim() || saving} onClick={handleSaveNote}>
            {saving ? t('common.saving') : t('mentor.saveNote')}
          </button>
          {justSaved && <span className="badge badge-improving">{t('mentor.noteSaved')}</span>}
        </div>

        <h3 className="mt-2">{t('mentor.pastNotes')}</h3>
        {notesLoading ? (
          <Loading />
        ) : notes.length === 0 ? (
          <p className="muted small">{t('mentor.noNotes')}</p>
        ) : (
          <ul className="stack" style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
            {notes.map((note) => (
              <li key={note.id} className="card card-tight">
                <p className="muted small mt-0">{note.date}</p>
                <p className="mt-0">{note.note}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
