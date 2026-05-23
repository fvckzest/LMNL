import { ChevronIcon, PinIcon } from './Icons';

export default function AdminSectionHeader({
  title,
  isPinned = false,
  onTogglePin = null,
  isCollapsed = false,
  onToggleCollapse = () => {},
  collapsedCount = null,
}) {
  return (
    <div className="section-title-container">
      <h2 className="section-title">{title}</h2>
      {isCollapsed && Number.isFinite(collapsedCount) ? (
        <span
          className="section-collapsed-count"
          aria-label={`${collapsedCount} active entries`}
        >
          {collapsedCount}
        </span>
      ) : null}
      {onTogglePin ? (
        <button
          type="button"
          className={`pin-toggle-btn ${isPinned ? 'pinned' : ''}`}
          onClick={onTogglePin}
          title={isPinned ? 'Unpin from top' : 'Pin to top'}
          aria-label={isPinned ? `Unpin ${title}` : `Pin ${title}`}
        >
          <PinIcon filled={isPinned} />
        </button>
      ) : null}
      <button
        type="button"
        className={`section-collapse-btn ${isCollapsed ? 'collapsed' : ''}`}
        onClick={onToggleCollapse}
        title={isCollapsed ? 'Expand section' : 'Collapse section'}
        aria-label={isCollapsed ? `Expand ${title}` : `Collapse ${title}`}
        aria-expanded={!isCollapsed}
      >
        <ChevronIcon collapsed={isCollapsed} />
      </button>
    </div>
  );
}
