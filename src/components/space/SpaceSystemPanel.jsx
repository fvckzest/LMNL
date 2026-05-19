export default function SpaceSystemPanel({ totalRaised, totalGoal, totalPct, currency, rows }) {
  return (
    <div className="space-system-container">
      <p className="space-system-header">system diagnostics</p>

      <div className="space-system-progress">
        <div className="space-system-amounts">
          <span>{currency(totalRaised)} raised</span>
          <span>goal: {currency(totalGoal)}</span>
        </div>
        <div className="space-system-bar-bg">
          <div className="space-system-bar-fill" style={{ width: `${totalPct}%` }} />
        </div>
      </div>

      <div className="space-system-nodes">
        {rows.map((row, index) => {
          const pct = row.goal > 0 ? Math.round((row.raised / row.goal) * 100) : 0;
          return (
            <div key={row.name} className="space-system-node-item">
              <div className="space-node-info">
                <span className="space-node-name">
                  {row.isOnline && index === 0 ? <span className="space-pulse-dot" /> : null}
                  {row.name}
                </span>
                <span className="space-node-status">
                  {row.isOnline ? 'ONLINE' : currency(row.goal)}
                </span>
              </div>
              <div className="space-node-bar-bg">
                <div
                  className={`space-node-bar-fill${row.isOnline ? ' completed' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
