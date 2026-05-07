import TerminalShell from './TerminalShell';
import './ContentPageShell.css';

export function PageStatus({ children, className = '' }) {
  const classes = ['page-status-message', className].filter(Boolean).join(' ');

  return (
    <p className={classes}>
      <span className="page-status-message__dot" />
      {children}
    </p>
  );
}

export function PageEmptyState({ children, className = '' }) {
  const classes = ['page-empty-state', className].filter(Boolean).join(' ');

  return <p className={classes}>{children}</p>;
}

export function PageStatGrid({ children, className = '', ...rest }) {
  const classes = ['page-stat-grid', className].filter(Boolean).join(' ');

  return (
    <section className={classes} {...rest}>
      {children}
    </section>
  );
}

export function PageStat({ label, value, className = '' }) {
  const classes = ['page-stat', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <p className="page-stat__label">{label}</p>
      <p className="page-stat__value">{value}</p>
    </div>
  );
}

export function SectionRail({
  label,
  title,
  copy,
  aside,
  children,
  className = '',
}) {
  const classes = ['page-section-rail', className].filter(Boolean).join(' ');

  return (
    <section className={classes}>
      <div className="page-section-rail__intro">
        {label ? <p className="page-section-rail__label">{label}</p> : null}
        {title ? <h2 className="page-section-rail__title">{title}</h2> : null}
        {copy ? <p className="page-section-rail__copy">{copy}</p> : null}
      </div>
      {aside ? <div className="page-section-rail__aside">{aside}</div> : null}
      {children ? <div className="page-section-rail__body">{children}</div> : null}
    </section>
  );
}

export function MetadataList({ items, className = '' }) {
  const classes = ['page-metadata-list', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {items.map((item) => (
        <div key={item.label} className="page-metadata-list__row">
          <span className="page-metadata-list__label">{item.label}</span>
          <span className="page-metadata-list__value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ModuleStrip({ items, className = '' }) {
  const classes = ['page-module-strip', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {items.map((item) => (
        <div key={item.label} className="page-module-strip__item">
          <div className="page-module-strip__topline">
            <span>{item.label}</span>
            {item.value ? <span>{item.value}</span> : null}
          </div>
          {item.copy ? <p className="page-module-strip__copy">{item.copy}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function SignalList({ items, className = '' }) {
  const classes = ['page-signal-list', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {items.map((item, index) => (
        <div key={item.id || `${item.label}-${index}`} className="page-signal-list__item">
          <span className="page-signal-list__dot" style={item.color ? { backgroundColor: item.color } : undefined} />
          <div className="page-signal-list__content">
            <span className="page-signal-list__label">{item.label}</span>
            {item.meta ? <span className="page-signal-list__meta">{item.meta}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ContentPageShell({
  title,
  color,
  children,
  contentClassName = '',
  introLabel,
  introTitle,
  introCopy,
}) {
  const contentClasses = ['content-page-shell__content', contentClassName].filter(Boolean).join(' ');

  return (
    <TerminalShell
      title={title}
      color={color}
      metaNote={null}
      introLabel={introLabel}
      introTitle={introTitle}
      introCopy={introCopy}
      rightSidebarFooter={(
        <p className="home-terminal__system-note">
          A creative platform for events, artists, artifacts, and cultural systems.
        </p>
      )}
      contentClassName={contentClasses}
    >
      {children}
    </TerminalShell>
  );
}
