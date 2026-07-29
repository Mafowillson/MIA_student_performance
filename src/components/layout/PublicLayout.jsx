import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageToggle from '../LanguageToggle';

const NAV_ITEMS = [
  { to: '/', key: 'home' },
  { to: '/about', key: 'about' },
  { to: '/programs', key: 'programs' },
  { to: '/contact', key: 'contact' },
];

export default function PublicLayout() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink to="/" className="app-brand">
            <img src="/MIA_logo.jpg" alt="MIA" className="app-logo" />
            <span className="app-brand-text">
              <strong>{t('appName')}</strong>
              <span>{t('site.orgName')}</span>
            </span>
          </NavLink>

          <nav className="app-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {t(`site.nav.${item.key}`)}
              </NavLink>
            ))}
          </nav>

          <div className="spacer" />

          <button type="button" className="btn btn-accent btn-sm" onClick={() => navigate('/login')}>
            {t('site.nav.platformLogin')}
          </button>

          <LanguageToggle />
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <div className="public-footer-brand">
            <img src="/MIA_logo.jpg" alt="MIA" className="app-logo" />
            <div>
              <strong>{t('appName')}: {t('site.orgName')}</strong>
              <p className="muted small mt-0">{t('site.footerTagline')}</p>
            </div>
          </div>

          <div className="public-footer-col">
            <h3>{t('site.footerLinksTitle')}</h3>
            <NavLink to="/">{t('site.nav.home')}</NavLink>
            <NavLink to="/about">{t('site.nav.about')}</NavLink>
            <NavLink to="/programs">{t('site.nav.programs')}</NavLink>
            <NavLink to="/contact">{t('site.nav.contact')}</NavLink>
          </div>

          <div className="public-footer-col">
            <h3>{t('site.footerContactTitle')}</h3>
            <p className="muted small">{t('site.contactEmail')}</p>
            <p className="muted small">{t('site.contactPhone')}</p>
            <p className="muted small">{t('site.contactRegionsLine')}</p>
          </div>
        </div>
        <div className="public-footer-bottom">
          {t('site.copyright', { year: new Date().getFullYear() })}
        </div>
      </footer>
    </>
  );
}
