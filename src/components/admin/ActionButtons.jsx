import { ArchiveIcon, UnarchiveIcon, TrashIcon } from './Icons';

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function IconActionButton({
  title,
  onClick,
  children,
  className = '',
  variant = 'default'
}) {
  return (
    <button
      type="button"
      className={joinClassNames(
        'icon-btn',
        'table-action-btn',
        variant === 'danger' && 'table-action-btn--danger',
        variant === 'muted' && 'table-action-btn--muted',
        className
      )}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ArchiveToggleButton({
  isArchived,
  onArchive,
  onUnarchive,
  archiveTitle = 'Archive',
  unarchiveTitle = 'Unarchive'
}) {
  if (isArchived) {
    return (
      <IconActionButton
        className="unarchive-btn"
        title={unarchiveTitle}
        onClick={onUnarchive}
      >
        <UnarchiveIcon />
      </IconActionButton>
    );
  }

  return (
    <IconActionButton
      className="archive-btn"
      title={archiveTitle}
      onClick={onArchive}
    >
      <ArchiveIcon />
    </IconActionButton>
  );
}

export function DeleteActionButton({
  title = 'Delete',
  onClick,
  className = '',
  variant = 'danger'
}) {
  return (
    <IconActionButton
      className={joinClassNames('delete-btn', className)}
      title={title}
      onClick={onClick}
      variant={variant}
    >
      <TrashIcon />
    </IconActionButton>
  );
}
