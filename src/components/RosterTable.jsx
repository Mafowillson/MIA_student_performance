import { useLanguage } from '../i18n/LanguageContext';
import StatusTag from './StatusTag';

// rows: [{ id, name, studentCode, centerName?, categoryName?, mentorName?, status }]
export default function RosterTable({ rows, showCenter, showCategory, showMentor, onView, extraAction }) {
  const { t } = useLanguage();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('common.student')}</th>
            {showCenter && <th>{t('common.center')}</th>}
            {showCategory && <th>{t('common.category')}</th>}
            {showMentor && <th>{t('common.mentor')}</th>}
            <th>{t('common.status')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.name}
                <div className="muted small">{row.studentCode}</div>
              </td>
              {showCenter && <td>{row.centerName}</td>}
              {showCategory && <td>{row.categoryName}</td>}
              {showMentor && <td>{row.mentorName}</td>}
              <td><StatusTag status={row.status} /></td>
              <td>
                <div className="row">
                  {onView && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onView(row)}>
                      {t('supervisor.drillIn')}
                    </button>
                  )}
                  {extraAction && extraAction(row)}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">{t('common.noData')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
