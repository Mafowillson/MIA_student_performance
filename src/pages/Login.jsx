import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Landmark, Globe2, Layers, BookOpen, Building2, Users } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useRole, ROLES } from '../context/RoleContext';
import { useDemoAccounts, useShareableStudents } from '../hooks';
import * as api from '../data/api';
import LanguageToggle from '../components/LanguageToggle';

const ROLE_META = [
  { role: ROLES.NATIONAL_SUPERVISOR, key: 'national_supervisor', color: 'var(--role-national)', Icon: Landmark },
  { role: ROLES.REGIONAL_SUPERVISOR, key: 'regional_supervisor', color: 'var(--role-supervisor)', Icon: Globe2 },
  { role: ROLES.REGIONAL_COORDINATOR, key: 'regional_coordinator', color: 'var(--role-coordinator)', Icon: Layers },
  { role: ROLES.HOD, key: 'hod', color: 'var(--role-hod)', Icon: BookOpen },
  { role: ROLES.CENTER_COORDINATOR, key: 'center_coordinator', color: 'var(--role-center)', Icon: Building2 },
  { role: ROLES.MENTOR, key: 'mentor', color: 'var(--role-mentor)', Icon: Users },
];

const DASHBOARD_ROUTE_BY_ROLE = {
  [ROLES.NATIONAL_SUPERVISOR]: '/national',
  [ROLES.REGIONAL_SUPERVISOR]: '/supervisor',
  [ROLES.REGIONAL_COORDINATOR]: '/coordinator',
  [ROLES.HOD]: '/hod',
  [ROLES.CENTER_COORDINATOR]: '/center',
  [ROLES.MENTOR]: '/mentor',
};

export default function Login() {
  const { t } = useLanguage();
  const { setRoleAndActor } = useRole();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const { data: demo } = useDemoAccounts();
  const [shareStudentId, setShareStudentId] = useState('');
  const { data: students } = useShareableStudents();

  async function performLogin(emailValue, passwordValue) {
    setError('');
    setSubmitting(true);
    const result = await api.login({ email: emailValue, password: passwordValue });
    setSubmitting(false);
    if (!result.success) {
      setError(t('login.invalidCredentials'));
      return;
    }
    setRoleAndActor(result.role, result.actor);
    navigate(DASHBOARD_ROUTE_BY_ROLE[result.role]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    performLogin(email, password);
  }

  function handleUseDemoAccount(account) {
    setEmail(account.email);
    setPassword(demo.password);
    performLogin(account.email, demo.password);
  }

  function handleShareView() {
    if (!shareStudentId) return;
    navigate(`/share/${shareStudentId}`);
  }

  const groupedAccounts = (demo?.accounts || []).reduce((acc, account) => {
    (acc[account.role] ||= []).push(account);
    return acc;
  }, {});

  return (
    <div className="landing">
      <header className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-brand">
            <img src="/MIA_logo.jpg" alt="MIA" className="landing-logo" />
            <div>
              <h1>{t('appName')}</h1>
              <p>{t('appSubtitle')}</p>
            </div>
          </div>
          <LanguageToggle />
        </div>
      </header>

      <div className="landing-body">
        <div className="grid-cards" style={{ alignItems: 'start' }}>
          <div className="card login-card">
            <h2 className="mt-0">{t('login.title')}</h2>
            <p className="muted small">{t('login.subtitle')}</p>
            <form className="stack mt-1" onSubmit={handleSubmit}>
              <div className="field">
                <label>{t('login.email')}</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label>{t('login.password')}</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <div className="alert-banner alert-banner-danger">
                  <div className="alert-banner-title">
                    <AlertCircle size={16} strokeWidth={2} />
                    {error}
                  </div>
                </div>
              )}
              <button type="submit" className="btn btn-block" disabled={submitting || !email || !password}>
                {submitting ? t('login.signingIn') : t('login.signIn')}
              </button>
            </form>
          </div>

          <div className="card">
            <button type="button" className="demo-toggle" onClick={() => setShowDemo((s) => !s)}>
              {showDemo ? t('login.demoAccountsHide') : t('login.demoAccountsToggle')}
            </button>
            {showDemo && (
              <>
                <p className="demo-hint">{t('login.demoAccountsHint', { password: demo?.password })}</p>
                <div className="demo-list">
                  {ROLE_META.map(({ role, key }) => {
                    const accounts = groupedAccounts[role] || [];
                    if (accounts.length === 0) return null;
                    return (
                      <div key={role}>
                        <div className="demo-group-label">{t(`roles.${key}`)}</div>
                        {accounts.map((account) => (
                          <button
                            key={account.email}
                            type="button"
                            className="demo-item"
                            onClick={() => handleUseDemoAccount(account)}
                          >
                            <strong>{account.name}</strong>
                            <span>{account.contextLabel} — {account.email}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                  {(demo?.accounts || []).length === 0 && (
                    <p className="muted small" style={{ padding: 12 }}>
                      {t('login.demoAccountsEmpty')}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="landing-section-title mt-2">{t('login.orSharedView')}</p>
        <div className="card shared-view-card">
          <h3>{t('roles.shared_view')}</h3>
          <p className="muted small">{t('roles.shared_view_desc')}</p>
          <div className="row mt-1">
            <select value={shareStudentId} onChange={(e) => setShareStudentId(e.target.value)}>
              <option value="">{t('common.student')}…</option>
              {(students || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.studentCode})
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-accent" disabled={!shareStudentId} onClick={handleShareView}>
              {t('common.viewAsStudent')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
