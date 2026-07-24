import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Trophy, Award } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRegions, useCenters, useMentors, useCategories } from '../../hooks';
import RegionBadgeList from '../../components/RegionBadgeList';
import Loading from '../../components/Loading';

export default function Home() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: regions, loading: regionsLoading } = useRegions();
  const { data: centers, loading: centersLoading } = useCenters();
  const { data: mentors, loading: mentorsLoading } = useMentors();
  const { data: categories, loading: categoriesLoading } = useCategories();

  const loading = regionsLoading || centersLoading || mentorsLoading || categoriesLoading;
  const trackCount = categories ? new Set(categories.map((c) => c.name)).size : 0;

  return (
    <div>
      <section className="hero-section">
        <div className="hero-inner">
          <h1>{t('site.home.heroTitle')}</h1>
          <p>{t('site.home.heroSubtitle')}</p>
          <div className="hero-actions">
            <button type="button" className="btn" onClick={() => navigate('/programs')}>
              {t('site.home.ctaPrograms')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/contact')}>
              {t('site.home.ctaContact')}
            </button>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-section-inner">
          <div className="section-title">
            <h2>{t('site.home.statsTitle')}</h2>
          </div>
          {loading ? (
            <Loading />
          ) : (
            <div className="stats-strip">
              <div className="stat-block">
                <div className="stat-block-value">{regions.length}</div>
                <div className="stat-block-label">{t('site.home.statRegions')}</div>
              </div>
              <div className="stat-block">
                <div className="stat-block-value">{centers.length}</div>
                <div className="stat-block-label">{t('site.home.statCenters')}</div>
              </div>
              <div className="stat-block">
                <div className="stat-block-value">{trackCount}</div>
                <div className="stat-block-label">{t('site.home.statTracks')}</div>
              </div>
              <div className="stat-block">
                <div className="stat-block-value">{mentors.length}</div>
                <div className="stat-block-label">{t('site.home.statMentors')}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="public-section public-section-alt">
        <div className="public-section-inner">
          <div className="section-title">
            <h2>{t('site.home.highlightsTitle')}</h2>
          </div>
          <div className="grid-cards">
            <div className="card">
              <span className="feature-icon"><GraduationCap size={22} strokeWidth={2} /></span>
              <h3>{t('site.home.highlightPrepaTitle')}</h3>
              <p className="muted small">{t('site.home.highlightPrepaDesc')}</p>
            </div>
            <div className="card">
              <span className="feature-icon"><Users size={22} strokeWidth={2} /></span>
              <h3>{t('site.home.highlightMentorshipTitle')}</h3>
              <p className="muted small">{t('site.home.highlightMentorshipDesc')}</p>
            </div>
            <div className="card">
              <span className="feature-icon accent"><Trophy size={22} strokeWidth={2} /></span>
              <h3>{t('site.home.highlightOlympiadsTitle')}</h3>
              <p className="muted small">{t('site.home.highlightOlympiadsDesc')}</p>
            </div>
            <div className="card">
              <span className="feature-icon accent"><Award size={22} strokeWidth={2} /></span>
              <h3>{t('site.home.highlightScholarshipTitle')}</h3>
              <p className="muted small">{t('site.home.highlightScholarshipDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-section-inner">
          <div className="section-title">
            <h2>{t('site.home.regionsTitle')}</h2>
            <p className="muted">{t('site.home.regionsDesc')}</p>
          </div>
          <RegionBadgeList />
        </div>
      </section>

      <section className="cta-banner">
        <h2>{t('site.home.ctaBannerTitle')}</h2>
        <p>{t('site.home.ctaBannerDesc')}</p>
        <button type="button" className="btn btn-accent" onClick={() => navigate('/login')}>
          {t('site.home.ctaBannerButton')}
        </button>
      </section>
    </div>
  );
}
