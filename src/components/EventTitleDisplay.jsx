export default function EventTitleDisplay({
  title,
  imageUrl,
  className = '',
  imageClassName = '',
}) {
  const classes = ['event-title-display', className].filter(Boolean).join(' ');

  if (imageUrl) {
    return (
      <span className={classes}>
        <img
          src={imageUrl}
          alt={title}
          className={['event-title-display__image', imageClassName].filter(Boolean).join(' ')}
        />
      </span>
    );
  }

  return <span className={classes}>{title}</span>;
}
