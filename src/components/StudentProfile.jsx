import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useStudent, useSubjectHistories, useAtRiskFlags } from '../hooks';
import TrendChart from './charts/TrendChart';
import StatusTag from './StatusTag';
import FlagList from './FlagList';
import Loading from './Loading';

// Read-only student detail: subject-by-subject trend charts + computed
// at-risk flags. Reused by regional/coordinator drill-downs, the mentor's
// mentee detail page, and the center coordinator's roster.
export default function StudentProfile({ studentId, actions }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: student, loading: studentLoading } = useStudent(studentId);
  const { data: histories, loading: historiesLoading } = useSubjectHistories(studentId);
  const { data: analysis, loading: analysisLoading } = useAtRiskFlags(studentId);

  if (studentLoading || historiesLoading || analysisLoading) return <Loading />;
  if (!student) return <p>{t('common.noData')}</p>;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h2 className="mt-0">{student.name}</h2>
          <p className="muted small">{student.studentCode}</p>
        </div>
        <StatusTag status={analysis?.status} />
      </div>

      <div className="card">
        <h3 className="mt-0">{t('mentor.flagsTitle')}</h3>
        <FlagList bySubject={analysis?.bySubject} />
      </div>

      {actions}

      <div className="grid-cards">
        {Object.entries(histories || {}).map(([subjectId, { subject, history }]) => (
          <TrendChart key={subjectId} title={subject.name} history={history} />
        ))}
      </div>
    </div>
  );
}
