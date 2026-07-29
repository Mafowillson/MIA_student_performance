import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useRole, ROLES } from '../context/RoleContext';
import * as api from '../data/api';
import LanguageToggle from '../components/LanguageToggle';

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
      </div>
    </div>
  );
}
