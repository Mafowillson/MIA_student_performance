import { createContext, useContext, useMemo, useState } from 'react';
import { strings } from './strings';

const LanguageContext = createContext(null);

function lookup(dict, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), dict);
}

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (vars[key] != null ? vars[key] : match));
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => sessionStorage.getItem('mia-lang') || 'en');

  const setLanguage = (next) => {
    setLang(next);
    sessionStorage.setItem('mia-lang', next);
  };

  const t = useMemo(() => {
    return (key, vars) => {
      const value = lookup(strings[lang], key) ?? lookup(strings.en, key) ?? key;
      return typeof value === 'string' ? interpolate(value, vars) : value;
    };
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang: setLanguage, toggleLang: () => setLanguage(lang === 'en' ? 'fr' : 'en'), t }),
    [lang, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
