export default function CommunityMarqueeRow({ items, rowClassName, rowKey }) {
  return (
    <div className={`marquee-row ${rowClassName}`}>
      <div className="marquee-track">
        {items.map((item, idx) => (
          <div key={`${rowKey}-${idx}`} className="marquee-item">
            {item.link ? (
              <a href={item.link} target="_blank" rel="noreferrer" className="marquee-name-link">
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
