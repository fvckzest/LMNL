export default function SpaceSystemPanel({ totalRaised, totalGoal, totalPct, currency, nodes, soundCovered }) {
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
        <div className="space-system-node-item sound-node">
          <div className="space-node-info">
            <span className="space-node-name">
              <span className="space-pulse-dot" />
              SOUND
            </span>
            <span className="space-node-status">ONLINE ({currency(soundCovered)})</span>
          </div>
          <div className="space-node-bar-bg">
            <div className="space-node-bar-fill completed" style={{ width: '100%' }} />
          </div>
        </div>

        {nodes.map((node) => {
          const pct = Math.round((node.raised / node.goal) * 100);
          return (
            <div key={node.name} className="space-system-node-item">
              <div className="space-node-info">
                <span className="space-node-name">{node.name}</span>
                <span className="space-node-pct">{pct}%</span>
              </div>
              <div className="space-node-bar-bg">
                <div className="space-node-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
