import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useCategories, useSubjects, useWeekOptions, useManualEntryTable } from '../../hooks';
import * as api from '../../data/api';
import Loading from '../../components/Loading';

export default function ManualMarkEntry() {
  const { t } = useLanguage();
  const { actor } = useRole();
  const { data: categories } = useCategories();
  const [categoryId, setCategoryId] = useState('');
  const { data: subjects } = useSubjects({ categoryId });
  const [subjectId, setSubjectId] = useState('');
  const { data: weeks } = useWeekOptions();
  const [week, setWeek] = useState('');

  const { data: rows, loading: rowsLoading, reload } = useManualEntryTable({
    centerId: actor?.centerId,
    subjectId,
    week: week ? Number(week) : null,
  });

  const [localMarks, setLocalMarks] = useState({});
  const [saveState, setSaveState] = useState('idle');

  useEffect(() => {
    if (rows) {
      const next = {};
      rows.forEach((r) => {
        next[r.studentId] = r.marksObtained === '' || r.marksObtained == null ? '' : String(r.marksObtained);
      });
      setLocalMarks(next);
    }
  }, [rows]);

  function handleChange(studentId, value) {
    setLocalMarks((m) => ({ ...m, [studentId]: value }));
  }

  async function handleSave() {
    setSaveState('saving');
    const entries = Object.entries(localMarks).map(([studentId, marksObtained]) => ({ studentId, marksObtained }));
    await api.saveManualMarks({ centerId: actor.centerId, subjectId, week: Number(week), entries });
    setSaveState('saved');
    reload();
    setTimeout(() => setSaveState('idle'), 2000);
  }

  const subject = (subjects || []).find((s) => s.id === subjectId);
  const canShowTable = subjectId && week;

  return (
    <div className="stack">
      <h1>{t('markEntry.title')}</h1>

      <div className="card row">
        <div className="field">
          <label>{t('common.category')}</label>
          <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubjectId(''); }}>
            <option value="">—</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('markEntry.chooseSubject')}</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!categoryId}>
            <option value="">—</option>
            {(subjects || []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('markEntry.chooseWeek')}</label>
          <select value={week} onChange={(e) => setWeek(e.target.value)}>
            <option value="">—</option>
            {(weeks || []).map((w) => (
              <option key={w} value={w}>{t('common.week')} {w}</option>
            ))}
          </select>
        </div>
      </div>

      {canShowTable && (
        <div className="card">
          <div className="row-between">
            <h2 className="mt-0">{subject?.name} — {t('common.week')} {week}</h2>
            <span className="muted small">{t('markEntry.maxScoreNote', { max: subject?.maxScore })}</span>
          </div>
          {rowsLoading ? (
            <Loading />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table data-table-compact">
                  <thead>
                    <tr>
                      <th>{t('common.student')}</th>
                      <th>{t('common.score')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.studentId}>
                        <td>{row.name}<div className="muted small">{row.studentCode}</div></td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            max={row.maxScore}
                            value={localMarks[row.studentId] ?? ''}
                            onChange={(e) => handleChange(row.studentId, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row mt-2">
                <button type="button" className="btn" onClick={handleSave} disabled={saveState === 'saving'}>
                  {saveState === 'saving' ? t('common.saving') : t('common.save')}
                </button>
                {saveState === 'saved' && <span className="badge badge-improving">{t('markEntry.saveSuccess')}</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
