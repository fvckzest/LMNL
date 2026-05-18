import { useEffect, useState } from 'react';

function formatActivityTimeAgo(value, nowTick) {
  void nowTick;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const elapsed = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round(elapsed / (1000 * 60));

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour');
  }

  const days = Math.round(hours / 24);
  return formatter.format(days, 'day');
}

export default function SpaceActivityList({ items = [], isLive = false }) {
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTick(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="space-activity-container">
      <div className="space-activity-header">
        <p className="space-activity-label">activity list</p>
        <p className="space-activity-status">
          <span className={`space-pulse-dot ${isLive ? 'is-live' : ''}`} />
          {isLive ? 'live' : 'syncing'}
        </p>
      </div>

      {items.length ? (
        <div className="space-activity-list" role="list" aria-live="polite">
          {items.map((item) => (
            <div key={item.id} className="space-activity-item" role="listitem">
              <div className="space-activity-copy">
                <p className="space-activity-title">{item.customerName}</p>
                <p className="space-activity-meta">ticket purchased</p>
              </div>
              <p className="space-activity-time">{formatActivityTimeAgo(item.createdAt, nowTick)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="space-activity-empty">No ticket activity yet.</p>
      )}
    </div>
  );
}
