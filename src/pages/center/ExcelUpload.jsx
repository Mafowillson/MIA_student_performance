import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useCategories, useWeekOptions } from '../../hooks';
import * as api from '../../data/api';
import Loading from '../../components/Loading';

function downloadCsv(filename, header, rows) {
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ExcelUpload() {
  const { t } = useLanguage();
  const { actor } = useRole();
  const { data: categories } = useCategories();
  const { data: weeks } = useWeekOptions();

  const [templateCategoryId, setTemplateCategoryId] = useState('');

  const [categoryId, setCategoryId] = useState('');
  const [week, setWeek] = useState('');
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null); // { subjects, rows }
  const [saveResult, setSaveResult] = useState(null);

  async function handleDownloadTemplate() {
    if (!templateCategoryId) return;
    const { header, sampleRows } = await api.getExcelTemplate(templateCategoryId, actor.centerId);
    const category = categories.find((c) => c.id === templateCategoryId);
    downloadCsv(`MIA_${category.name.replace(/\s+/g, '_')}_template.csv`, header, sampleRows);
  }

  function handleFileChosen(e) {
    setFile(e.target.files?.[0] || null);
  }

  async function handleParse() {
    setParsing(true);
    setSaveResult(null);
    const result = await api.parseExcelUpload({ file, categoryId, centerId: actor.centerId });
    setPreview(result);
    setParsing(false);
  }

  async function handleConfirm() {
    const result = await api.confirmExcelUpload({
      centerId: actor.centerId,
      week: Number(week),
      subjects: preview.subjects,
      rows: preview.rows,
    });
    setSaveResult(result);
  }

  return (
    <div className="stack">
      <h1>{t('upload.title')}</h1>

      <div className="card">
        <h2 className="mt-0">{t('upload.step1')}</h2>
        <p className="muted small">{t('upload.step1desc')}</p>
        <div className="row">
          <select value={templateCategoryId} onChange={(e) => setTemplateCategoryId(e.target.value)}>
            <option value="">—</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary" disabled={!templateCategoryId} onClick={handleDownloadTemplate}>
            {t('upload.downloadTemplate', { category: categories?.find((c) => c.id === templateCategoryId)?.name ?? '' })}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="mt-0">{t('upload.step2')}</h2>
        <p className="muted small">{t('upload.step2desc')}</p>
        <div className="row">
          <div className="field">
            <label>{t('common.category')}</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">—</option>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
          <div className="field">
            <label>{t('upload.chooseFile')}</label>
            {/* CSV only — matches what "Download template" above generates.
                Real .xlsx parsing isn't supported: the `xlsx` npm package
                has unpatched high-severity advisories, not worth the risk
                for parsing untrusted uploaded files. */}
            <input type="file" accept=".csv" onChange={handleFileChosen} />
          </div>
        </div>
        <button
          type="button"
          className="btn mt-1"
          disabled={!categoryId || !week || !file || parsing}
          onClick={handleParse}
        >
          {parsing ? t('common.loading') : t('upload.parseFile')}
        </button>
      </div>

      {preview && (
        <div className="card">
          <h2 className="mt-0">{t('upload.step3')}</h2>
          <div className="row mb-2">
            <span className="badge badge-improving">
              {t('upload.validRows')}: {preview.rows.filter((r) => r.issues.length === 0).length}
            </span>
            <span className="badge badge-needs_attention">
              {t('upload.invalidRows')}: {preview.rows.filter((r) => r.issues.length > 0).length}
            </span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student ID</th>
                  <th>{t('common.student')}</th>
                  {preview.subjects.map((s) => (
                    <th key={s.id}>{s.name}</th>
                  ))}
                  <th>Issue</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className={row.issues.length ? 'row-issue' : 'row-ok'}>
                    <td>{row.rowNumber}</td>
                    <td>{row.studentId}</td>
                    <td>{row.studentName}</td>
                    {row.marks.map((m, i) => (
                      <td key={i}>{m}</td>
                    ))}
                    <td>{row.issues.map((issue) => t(`upload.issue_${issue}`)).join('; ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn mt-2" onClick={handleConfirm} disabled={!!saveResult}>
            {t('upload.confirmSave')}
          </button>
          {saveResult && (
            <p className="badge badge-improving mt-1">
              {t('upload.uploadSuccess', { count: saveResult.savedCount, skipped: saveResult.skippedCount })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
