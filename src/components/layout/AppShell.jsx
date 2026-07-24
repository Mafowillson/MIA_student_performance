import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole, ROLES } from '../../context/RoleContext';
import { useRegions } from '../../hooks';
import LanguageToggle from '../LanguageToggle';

const NAV_BY_ROLE = {
  [ROLES.NATIONAL_SUPERVISOR]: [
    { to: '/national', key: 'dashboard' },
    { to: '/national/regions', key: 'manageRegions' },
    { to: '/national/admins', key: 'manageRegionalSupervisors' },
  ],
  [ROLES.REGIONAL_SUPERVISOR]: [
    { to: '/supervisor', key: 'dashboard' },
    { to: '/supervisor/centers', key: 'manageCenters' },
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
  [ROLES.NATIONAL_SUPERVISOR]: 'national_supervisor',
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
  const { regionId: regionIdParam } = useParams();
  const { data: regions } = useRegions();
  const navItems = NAV_BY_ROLE[role] || [];

  function handleLogout() {
    clearRole();
    // Straight back to the login screen (not the public marketing home) —
    // this is a demo app where switching between role accounts is the most
    // common action, so don't make that a two-click trip.
    navigate('/login');
  }

  // Which region the nav bar should reflect right now: the National
  // Supervisor's own scope is "every region" until they drill into one
  // (route param), while every other role is always scoped to their own
  // region (attached to `actor` at login) regardless of which page they're
  // on within their dashboard.
  const currentRegionId = role === ROLES.NATIONAL_SUPERVISOR ? regionIdParam : actor?.regionId;
  const currentRegionName = currentRegionId
    ? regions?.find((r) => r.id === currentRegionId)?.name
    : null;
  const showAllRegions = role === ROLES.NATIONAL_SUPERVISOR && !regionIdParam;

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

          {(currentRegionName || showAllRegions) && (
            <div className="region-pill">
              <MapPin size={13} strokeWidth={2} />
              {showAllRegions ? t('national.allRegions') : currentRegionName}
            </div>
          )}

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
