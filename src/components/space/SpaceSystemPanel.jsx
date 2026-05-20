import { useRef, useState } from 'react';

export default function SpaceSystemPanel({ totalRaised, totalGoal, totalPct, currency, rows }) {
  const [tooltip, setTooltip] = useState(null);
  const [openRow, setOpenRow] = useState(null);
  const containerRef = useRef(null);
  const usesInlineDetails = () =>
    typeof window !== 'undefined'
    && window.matchMedia('(max-width: 640px), (hover: none), (pointer: coarse)').matches;

  const showTooltip = (row, clientX, clientY) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    setTooltip({
      name: row.name,
      detail: row.detail,
      x: clientX - bounds.left + 16,
      y: clientY - bounds.top + 16,
    });
  };

  const hideTooltip = (name) => {
    setTooltip((current) => (current?.name === name ? null : current));
  };

  const toggleRow = (name) => {
    setOpenRow((current) => (current === name ? null : name));
  };

  return (
    <div ref={containerRef} className="space-system-container">
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
          const isTooltipActive = tooltip?.name === row.name;
          const isRowOpen = openRow === row.name;

          return (
            <div
              key={row.name}
              className="space-system-node-item"
              onMouseEnter={(event) => {
                if (usesInlineDetails()) return;
                showTooltip(row, event.clientX, event.clientY);
              }}
              onMouseMove={(event) => {
                if (usesInlineDetails()) return;
                showTooltip(row, event.clientX, event.clientY);
              }}
              onMouseLeave={() => {
                if (usesInlineDetails()) return;
                hideTooltip(row.name);
              }}
            >
              <button
                type="button"
                className={`space-node-trigger${isTooltipActive || isRowOpen ? ' is-active' : ''}`}
                onClick={(event) => {
                  if (!usesInlineDetails()) {
                    if (isTooltipActive) {
                      hideTooltip(row.name);
                      return;
                    }

                    showTooltip(row, event.clientX, event.clientY);
                    return;
                  }

                  hideTooltip(row.name);
                  toggleRow(row.name);
                }}
                onFocus={(event) => {
                  if (usesInlineDetails()) return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  showTooltip(row, bounds.left, bounds.bottom);
                }}
                onBlur={() => hideTooltip(row.name)}
                aria-expanded={usesInlineDetails() ? isRowOpen : isTooltipActive}
              >
                <div className="space-node-info">
                  <span className="space-node-name">
                    {row.name}
                    <span className={`space-node-chevron${isRowOpen ? ' is-open' : ''}`} aria-hidden="true">
                      ▾
                    </span>
                  </span>
                  <span className="space-node-status">
                    {row.isOnline && index === 0 ? <span className="space-pulse-dot" /> : null}
                    {row.isOnline ? 'ONLINE' : currency(row.goal)}
                  </span>
                </div>
              </button>
              <div className="space-node-bar-bg">
                <div
                  className={`space-node-bar-fill${row.isOnline ? ' completed' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className={`space-node-mobile-detail${isRowOpen ? ' is-open' : ''}`}>{row.detail}</p>
            </div>
          );
        })}
      </div>
      {tooltip?.detail ? (
        <div
          className="space-node-tooltip"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          {tooltip.detail}
        </div>
      ) : null}
    </div>
  );
}
