import { Link } from 'react-router-dom';

export default function Circle({ images, className, links, onHoverChange, info, hoveredIndex }) {
  const renderDot = (index) => {
    const imgProps = {
      alt: "",
      src: images[index],
      style: links ? { cursor: 'pointer' } : {},
      onMouseEnter: () => onHoverChange && onHoverChange(index),
      onMouseLeave: () => onHoverChange && onHoverChange(null),
      className: hoveredIndex === index ? 'hovered' : ''
    };
    
    const img = <img {...imgProps} />;
    return links && links[index] ? (
      <Link to={links[index]} style={{ display: 'block', width: '100%', height: '100%' }}>
        {img}
      </Link>
    ) : img;
  };

  return (
    <div className={`circle-container ${className || ''}`}>
      {[...Array(8)].map((_, index) => (
        <div 
          className={`circle-ellipse ce-${index + 1}`} 
          key={index}
          style={{ '--circle-color': info && info[index] ? info[index].color : 'transparent' }}
        >
          {renderDot(index)}
        </div>
      ))}
    </div>
  );
}
