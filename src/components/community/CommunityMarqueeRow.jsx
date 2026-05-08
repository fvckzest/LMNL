export default function CommunityMarqueeRow({ items, rowClassName, rowKey }) {
  const repeatedItems = [...items, ...items];

  return (
    <div className={`marquee-row ${rowClassName}`}>
      <div className="marquee-track">
        {repeatedItems.map((item, idx) => (
          <div key={`${rowKey}-${idx}`} className="marquee-item">
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="marquee-name-link marquee-name-link--linked"
              >
                {item.name}
              </a>
            ) : (
              <span className="marquee-name">{item.name}</span>
            )}
            <span className="marquee-event">{item.event}</span>
            <span className="marquee-divider">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
