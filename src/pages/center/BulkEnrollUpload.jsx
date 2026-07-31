import { useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole } from '../../context/RoleContext';
import { useCategories } from '../../hooks';
import * as api from '../../data/api';

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

export default function BulkEnrollUpload() {
  const { t } = useLanguage();
  const { actor } = useRole();
  const { data: categories } = useCategories({ regionId: actor?.regionId });

  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null); // { rows }
  const [saveResult, setSaveResult] = useState(null);
  const fileInputRef = useRef(null);

  async function handleDownloadTemplate() {
    const { header, sampleRows } = await api.getBulkEnrollTemplate();
    downloadCsv('MIA_bulk_enroll_template.csv', header, sampleRows);
  }

  function handleFileChosen(e) {
    setFile(e.target.files?.[0] || null);
  }

  async function handleParse() {
    setParsing(true);
    setSaveResult(null);
    const result = await api.parseBulkEnroll({ file });
    setPreview(result);
    setParsing(false);
  }

  async function handleConfirm() {
    const result = await api.confirmBulkEnroll({
      centerId: actor.centerId,
      categoryId,
      rows: preview.rows,
    });
    setSaveResult(result);
  }

  function handleCancel() {
    setCategoryId('');
    setFile(null);
    setPreview(null);
    setSaveResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDownloadResults() {
    downloadCsv(
      'MIA_bulk_enroll_results.csv',
      ['Name', 'Matricule'],
      saveResult.created.map((s) => [s.name, s.studentCode]),
    );
  }

  return (
    <div className="stack">
      <h1>{t('bulkEnroll.title')}</h1>

      <div className="card">
        <h2 className="mt-0">{t('bulkEnroll.step1')}</h2>
        <p className="muted small">{t('bulkEnroll.step1desc')}</p>
        <button type="button" className="btn btn-secondary" onClick={handleDownloadTemplate}>
          {t('bulkEnroll.downloadTemplate')}
        </button>
      </div>

      <div className="card">
        <h2 className="mt-0">{t('bulkEnroll.step2')}</h2>
        <p className="muted small">{t('bulkEnroll.step2desc')}</p>
        <div className="row">
          <div className="field">
            <label>{t('common.category')}</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select…</option>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t('upload.chooseFile')}</label>
            <input ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={handleFileChosen} />
          </div>
        </div>
        <button
          type="button"
          className="btn mt-1"
          disabled={!categoryId || !file || parsing}
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
                  <th>{t('common.name')}</th>
                  <th>Issue</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className={row.issues.length ? 'row-issue' : 'row-ok'}>
                    <td>{row.rowNumber}</td>
                    <td>{row.name || '-'}</td>
                    <td>{row.issues.map((issue) => t(`bulkEnroll.issue_${issue}`)).join('; ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row mt-2">
            <button type="button" className="btn" onClick={handleConfirm} disabled={!!saveResult}>
              {t('bulkEnroll.confirmSave')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              {t('common.cancel')}
            </button>
          </div>
          {saveResult && (
            <div className="stack mt-1">
              <p className="badge badge-improving">
                {t('bulkEnroll.uploadSuccess', { count: saveResult.savedCount, skipped: saveResult.skippedCount })}
              </p>
              {saveResult.created.length > 0 && (
                <button type="button" className="btn btn-secondary" onClick={handleDownloadResults}>
                  {t('bulkEnroll.downloadResults')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
