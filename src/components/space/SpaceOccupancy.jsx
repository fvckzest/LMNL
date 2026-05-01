export default function SpaceOccupancy({ sold, capacity }) {
  const isLoaded = sold !== undefined && capacity !== undefined;
  const pct = isLoaded && capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;

  return (
    <div className="space-occupancy-container">
      <p className="space-occupancy-label">tickets sold</p>
      <div className="space-occupancy-content">
        <div className="space-occupancy-number">
          {isLoaded ? String(sold).padStart(3, '0') : '---'}
          <span className="separator">/</span>
          {isLoaded ? String(capacity).padStart(3, '0') : '---'}
        </div>
        <div className="space-occupancy-bar-bg">
          <div className="space-occupancy-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
