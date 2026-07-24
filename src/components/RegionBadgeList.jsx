import { MapPin } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useRegions, useRegionalSupervisors } from '../hooks';
import Loading from './Loading';

// A region counts as "active" once it has a Regional Supervisor assigned —
// same signal the National Supervisor's own dashboard uses to distinguish a
// staffed region from one that's only been registered so far.
export default function RegionBadgeList() {
  const { t } = useLanguage();
  const { data: regions, loading: regionsLoading } = useRegions();
  const { data: supervisors, loading: supervisorsLoading } = useRegionalSupervisors();

  if (regionsLoading || supervisorsLoading) return <Loading />;

  const staffedRegionIds = new Set(supervisors.map((s) => s.regionId));

  return (
    <div className="region-badge-row">
      {regions.map((region) => (
        <span key={region.id} className="region-badge">
          <MapPin size={14} strokeWidth={2} />
          {region.name}
          <span className={`badge badge-${staffedRegionIds.has(region.id) ? 'improving' : 'incomplete_data'}`}>
            {staffedRegionIds.has(region.id) ? t('site.regionActive') : t('site.regionComingSoon')}
          </span>
        </span>
      ))}
    </div>
  );
}
