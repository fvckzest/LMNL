export default function SystemPanel({ title, children, className = '' }) {
  const classes = ['system-panel', 'theme-surface', 'theme-surface--panel', className].filter(Boolean).join(' ');

  return (
    <section className={classes}>
      <div className="system-panel__header theme-surface-header">
        <span className="system-panel__title theme-label">{title}</span>
      </div>
      <div className="system-panel__body theme-surface-body">{children}</div>
    </section>
  );
}
