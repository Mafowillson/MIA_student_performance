import { useParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useSharedStudentView } from '../hooks';
import TrendChart from '../components/charts/TrendChart';
import LanguageToggle from '../components/LanguageToggle';

// Standalone, no-login, mobile-first route — what a student/parent would see
// via a WhatsApp-shared link. No comparison to named classmates; plain,
// encouraging language only.
export default function SharedStudentView() {
  const { t } = useLanguage();
  const { studentId } = useParams();
  const { data, loading } = useSharedStudentView(studentId);

  return (
    <div className="shared-view">
      <header className="shared-header">
        <img src="/MIA_logo.jpg" alt="MIA" className="shared-logo" />
        <div className="row-between" style={{ justifyContent: 'center', position: 'relative' }}>
          <h1>{t('shared.headerTitle')}</h1>
          <div style={{ position: 'absolute', right: 0 }} className="no-print">
            <LanguageToggle />
          </div>
        </div>
        {data?.student && <p>{t('shared.summaryFor', { name: data.student.name })}</p>}
      </header>

      <div className="shared-body">
        {loading && <p className="muted">{t('shared.loading')}</p>}
        {!loading && !data && <p className="muted">{t('shared.notFound')}</p>}

        {!loading && data && (
          <div className="stack">
            {data.subjects.map(({ subject, history, narrative }) => (
              <div key={subject.id}>
                <div className="summary-sentence">
                  {t(`shared.trend.${narrative.kind}`, {
                    subject: subject.name,
                    weeks: narrative.streakWeeks,
                  })}
                </div>
                <TrendChart title={subject.name} history={history} height={180} />
              </div>
            ))}

            <button type="button" className="btn btn-secondary no-print" onClick={() => window.print()}>
              {t('shared.print')}
            </button>
          </div>
        )}
      </div>

      <footer className="shared-footer">{t('shared.poweredBy')}</footer>
    </div>
  );
}
