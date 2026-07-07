import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useRole, ROLES } from '../../context/RoleContext';
import StudentProfile from '../../components/StudentProfile';
import ShareReportActions from '../../components/ShareReportActions';

// Generic read-only drill-down target, reached from Regional Supervisor /
// Regional Coordinator / Center Coordinator roster tables.
export default function StudentProfilePage() {
  const { t } = useLanguage();
  const { studentId } = useParams();
  const { role } = useRole();
  const navigate = useNavigate();

  const canGenerateReport = role === ROLES.CENTER_COORDINATOR;

  return (
    <div className="stack">
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(-1)}>
        ← {t('common.back')}
      </button>
      <StudentProfile
        studentId={studentId}
        actions={canGenerateReport ? <ShareReportActions studentId={studentId} /> : null}
      />
    </div>
  );
}
