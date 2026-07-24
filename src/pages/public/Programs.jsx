import { GraduationCap, Users, Trophy, Compass, Award } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const PROGRAMS = [
  { key: 'prepa', Icon: GraduationCap, accent: false },
  { key: 'mentorship', Icon: Users, accent: false },
  { key: 'olympiads', Icon: Trophy, accent: true },
  { key: 'leadershipProg', Icon: Compass, accent: true },
  { key: 'scholarship', Icon: Award, accent: true },
];

export default function Programs() {
  const { t } = useLanguage();

  return (
    <div className="public-section">
      <div className="public-section-inner">
        <div className="section-title">
          <h1>{t('site.programs.title')}</h1>
          <p className="muted">{t('site.programs.subtitle')}</p>
        </div>

        <div className="grid-cards">
          {PROGRAMS.map(({ key, Icon, accent }) => (
            <div key={key} className="card">
              <span className={`feature-icon${accent ? ' accent' : ''}`}>
                <Icon size={22} strokeWidth={2} />
              </span>
              <h3>{t(`site.programs.${key}Title`)}</h3>
              <p className="muted small">{t(`site.programs.${key}Desc`)}</p>
              <span className="badge badge-neutral mt-1">{t(`site.programs.${key}For`)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
