import { Link } from 'react-router-dom';

export default function Circle({ images, className, links }) {
  const renderDot = (index) => {
    const img = <img alt="" src={images[index]} style={links ? { cursor: 'pointer' } : {}} />;
    return links && links[index] ? (
      <Link to={links[index]} style={{ display: 'block', width: '100%', height: '100%' }}>
        {img}
      </Link>
    ) : img;
  };

  return (
    <div className={`circle-container ${className || ''}`}>
      <div className="circle-ellipse ce-1">{renderDot(0)}</div>
      <div className="circle-ellipse ce-2">{renderDot(1)}</div>
      <div className="circle-ellipse ce-3">{renderDot(2)}</div>
      <div className="circle-ellipse ce-4">{renderDot(3)}</div>
      <div className="circle-ellipse ce-5">{renderDot(4)}</div>
      <div className="circle-ellipse ce-6">{renderDot(5)}</div>
      <div className="circle-ellipse ce-7">{renderDot(6)}</div>
      <div className="circle-ellipse ce-8">{renderDot(7)}</div>
    </div>
  );
}
