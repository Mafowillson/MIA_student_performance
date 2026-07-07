import { useLanguage } from '../i18n/LanguageContext';

export default function StatusTag({ status }) {
  const { t } = useLanguage();
  if (!status) return <span className="badge badge-neutral">—</span>;
  return <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>;
}
