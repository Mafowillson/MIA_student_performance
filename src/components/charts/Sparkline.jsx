import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function Sparkline({ history, color = 'var(--primary)' }) {
  const data = history.map((h) => ({ pct: h.pct }));
  return (
    <div className="sparkline-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="pct" stroke={color} strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
