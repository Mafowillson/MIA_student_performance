import { useState } from 'react';
import { Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRegions } from '../../hooks';
import Loading from '../../components/Loading';

const emptyForm = { name: '', email: '', regionId: '', message: '' };

export default function Contact() {
  const { t } = useLanguage();
  const { data: regions, loading } = useRegions();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    // No real backend for the public site yet — this mirrors the simulated
    // network delay used everywhere else in the mock data layer.
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setForm(emptyForm);
    }, 500);
  }

  return (
    <div className="public-section">
      <div className="public-section-inner">
        <div className="section-title">
          <h1>{t('site.contact.title')}</h1>
          <p className="muted">{t('site.contact.subtitle')}</p>
        </div>

        <div className="contact-layout">
          <div className="card">
            {submitted ? (
              <div className="stack" style={{ alignItems: 'center', textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={36} strokeWidth={2} color="var(--status-improving)" />
                <h2 className="mt-1">{t('site.contact.formSuccessTitle')}</h2>
                <p className="muted">{t('site.contact.formSuccessBody')}</p>
                <button type="button" className="btn btn-secondary" onClick={() => setSubmitted(false)}>
                  {t('common.back')}
                </button>
              </div>
            ) : (
              <form className="stack" onSubmit={handleSubmit}>
                <div className="field">
                  <label>{t('site.contact.formName')}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>{t('site.contact.formEmail')}</label>
                  <input
                    type="text"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>{t('site.contact.formRegion')}</label>
                  {loading ? (
                    <Loading />
                  ) : (
                    <select
                      value={form.regionId}
                      onChange={(e) => setForm((f) => ({ ...f, regionId: e.target.value }))}
                    >
                      <option value="">—</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="field">
                  <label>{t('site.contact.formMessage')}</label>
                  <textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn btn-block" disabled={submitting}>
                  {submitting ? t('common.saving') : t('site.contact.formSubmit')}
                </button>
              </form>
            )}
          </div>

          <div className="stack">
            <div className="card">
              <h3 className="mt-0">{t('site.contact.detailsTitle')}</h3>
              <div className="stack" style={{ gap: 10 }}>
                <div className="row"><Mail size={16} strokeWidth={2} /> {t('site.contactEmail')}</div>
                <div className="row"><Phone size={16} strokeWidth={2} /> {t('site.contactPhone')}</div>
                <div className="row"><MapPin size={16} strokeWidth={2} /> {t('site.contactRegionsLine')}</div>
              </div>
            </div>
            <div className="notice-banner">
              <span>{t('site.contact.studentNote')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
