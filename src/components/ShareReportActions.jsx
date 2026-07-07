import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

export default function ShareReportActions({ studentId }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/share/${studentId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // clipboard API may be unavailable (e.g. insecure context) — fall back silently
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card card-tight row">
      <code className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{shareUrl}</code>
      <div className="spacer" />
      <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
        {copied ? t('common.linkCopied') : t('common.copyLink')}
      </button>
      <a className="btn btn-sm" href={shareUrl} target="_blank" rel="noreferrer">
        {t('common.download')}
      </a>
    </div>
  );
}
