export default function CommunityStatCard({ label, value, color }) {
  return (
    <div className="community-stat-card">
      <p className="community-stat-card-label">{label}</p>
      <div className="community-stat-card-content">
        <div className="community-stat-card-number">{value}</div>
        <div className="community-stat-card-bar">
          <div className="community-stat-card-bar-fill" style={{ backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}
