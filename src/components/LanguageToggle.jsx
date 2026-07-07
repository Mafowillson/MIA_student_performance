import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
        EN
      </button>
      <button type="button" className={lang === 'fr' ? 'active' : ''} onClick={() => setLang('fr')}>
        FR
      </button>
    </div>
  );
}
