import { useLanguage } from '../i18n/LanguageContext';
import StatusTag from './StatusTag';

// rows: [{ id, name, studentCode, centerName?, categoryName?, mentorName?, mentorId?, status }]
// mentorOptions/onMentorChange are optional — pass both to turn the mentor
// column from plain text into an editable "assign a mentor" dropdown (only
// the Center Coordinator's own roster does this; every other screen that
// renders this table just displays mentorName as read-only text).
export default function RosterTable({
  rows,
  showCenter,
  showCategory,
  showMentor,
  onView,
  extraAction,
  mentorOptions,
  onMentorChange,
}) {
  const { t } = useLanguage();
  const editableMentor = showMentor && mentorOptions && onMentorChange;
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
              {showMentor && (
                <td>
                  {editableMentor ? (
                    <select
                      value={row.mentorId ?? ''}
                      onChange={(e) => onMentorChange(row, e.target.value || null)}
                    >
                      <option value="">{t('common.unassigned')}</option>
                      {mentorOptions.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  ) : (
                    row.mentorName
                  )}
                </td>
              )}
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
