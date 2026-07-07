import { useLanguage } from '../i18n/LanguageContext';

export default function Loading() {
  const { t } = useLanguage();
  return <p className="muted">{t('common.loading')}</p>;
}
