export default function StatCard({ label, value, tone, icon: Icon }) {
  return (
    <div className={`stat-card${tone ? ` ${tone}` : ''}`}>
      <div className="stat-card-top">
        {Icon && (
          <span className="stat-icon">
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
