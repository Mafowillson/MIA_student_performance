import { Star, HeartHandshake, Globe2, Users } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import RegionBadgeList from '../../components/RegionBadgeList';

export default function About() {
  const { t } = useLanguage();

  return (
    <div>
      <section className="public-section">
        <div className="public-section-inner">
          <div className="section-title">
            <h1>{t('site.about.title')}</h1>
            <p className="muted">{t('site.about.subtitle')}</p>
          </div>

          <div className="grid-cards">
            <div className="card">
              <h2 className="mt-0">{t('site.about.missionTitle')}</h2>
              <p className="muted">{t('site.about.missionBody')}</p>
            </div>
            <div className="card">
              <h2 className="mt-0">{t('site.about.storyTitle')}</h2>
              <p className="muted">{t('site.about.storyBody')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section public-section-alt">
        <div className="public-section-inner">
          <div className="section-title">
            <h2>{t('site.about.valuesTitle')}</h2>
          </div>
          <div className="grid-cards">
            <div className="card">
              <span className="feature-icon"><Star size={22} strokeWidth={2} /></span>
              <h3>{t('site.about.value1Title')}</h3>
              <p className="muted small">{t('site.about.value1Desc')}</p>
            </div>
            <div className="card">
              <span className="feature-icon"><HeartHandshake size={22} strokeWidth={2} /></span>
              <h3>{t('site.about.value2Title')}</h3>
              <p className="muted small">{t('site.about.value2Desc')}</p>
            </div>
            <div className="card">
              <span className="feature-icon accent"><Globe2 size={22} strokeWidth={2} /></span>
              <h3>{t('site.about.value3Title')}</h3>
              <p className="muted small">{t('site.about.value3Desc')}</p>
            </div>
            <div className="card">
              <span className="feature-icon accent"><Users size={22} strokeWidth={2} /></span>
              <h3>{t('site.about.value4Title')}</h3>
              <p className="muted small">{t('site.about.value4Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-section-inner">
          <div className="section-title">
            <h2>{t('site.about.regionsTitle')}</h2>
          </div>
          <RegionBadgeList />
        </div>
      </section>

      <section className="public-section public-section-alt">
        <div className="public-section-inner">
          <div className="section-title">
            <h2>{t('site.about.leadershipTitle')}</h2>
            <p className="muted">{t('site.about.leadershipBody')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
