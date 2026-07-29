import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useLanguage } from '../../i18n/LanguageContext';

// Renders a subject score-history trend with an accessible plain-number-table
// fallback/toggle, as required for low-end-device accessibility.
export default function TrendChart({ history, title, height = 220 }) {
  const { t } = useLanguage();
  const [showTable, setShowTable] = useState(false);

  const chartData = history.map((h) => ({
    week: `${t('common.week')} ${h.week}`,
    pct: h.pct != null ? Math.round(h.pct) : null,
  }));

  return (
    <div className="card chart-card">
      <div className="row-between chart-toggle-row">
        <h3 className="mt-0">{title}</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowTable((s) => !s)}>
          {showTable ? t('common.showChart') : t('common.showTable')}
        </button>
      </div>

      {showTable ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.week')}</th>
                <th>{t('common.score')}</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.week}>
                  <td>{h.week}</td>
                  <td>{h.marksObtained != null ? `${h.marksObtained}/${h.maxScore}` : t('common.noData')}</td>
                  <td>{h.pct != null ? `${Math.round(h.pct)}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <ReferenceLine y={50} stroke="var(--status-incomplete)" strokeDasharray="4 4" />
            <Tooltip formatter={(value) => (value != null ? `${value}%` : '-')} />
            <Line
              type="monotone"
              dataKey="pct"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
