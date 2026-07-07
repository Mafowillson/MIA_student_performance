import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole, ROLES } from '../../context/RoleContext';
import LanguageToggle from '../LanguageToggle';

const NAV_BY_ROLE = {
  [ROLES.REGIONAL_SUPERVISOR]: [
    { to: '/supervisor', key: 'dashboard' },
    { to: '/supervisor/admins', key: 'manageAdmins' },
  ],
  [ROLES.REGIONAL_COORDINATOR]: [{ to: '/coordinator', key: 'dashboard' }],
  [ROLES.HOD]: [{ to: '/hod', key: 'dashboard' }],
  [ROLES.CENTER_COORDINATOR]: [
    { to: '/center', key: 'dashboard' },
    { to: '/center/mark-entry', key: 'markEntry' },
    { to: '/center/upload', key: 'excelUpload' },
    { to: '/center/mentors', key: 'manageMentors' },
  ],
  [ROLES.MENTOR]: [{ to: '/mentor', key: 'mentees' }],
};

const ROLE_LABEL_KEY = {
  [ROLES.REGIONAL_SUPERVISOR]: 'regional_supervisor',
  [ROLES.REGIONAL_COORDINATOR]: 'regional_coordinator',
  [ROLES.HOD]: 'hod',
  [ROLES.CENTER_COORDINATOR]: 'center_coordinator',
  [ROLES.MENTOR]: 'mentor',
};

export default function AppShell() {
  const { t } = useLanguage();
  const { role, actor, clearRole } = useRole();
  const navigate = useNavigate();
  const navItems = NAV_BY_ROLE[role] || [];

  function handleLogout() {
    clearRole();
    navigate('/');
  }

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink to="/" className="app-brand">
            <img src="/MIA_logo.jpg" alt="MIA" className="app-logo" />
            <span className="app-brand-text">
              <strong>{t('appName')}</strong>
              <span>{t('appSubtitle')}</span>
            </span>
          </NavLink>

          <nav className="app-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/center'}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {t(`nav.${item.key}`)}
              </NavLink>
            ))}
          </nav>

          <div className="spacer" />

          <div className="role-pill">
            {t('common.viewing')}: {role ? t(`roles.${ROLE_LABEL_KEY[role]}`) : ''}
            {actor?.name ? ` — ${actor.name}` : ''}
            <button type="button" onClick={handleLogout}>
              {t('nav.logout')}
            </button>
          </div>

          <LanguageToggle />
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
