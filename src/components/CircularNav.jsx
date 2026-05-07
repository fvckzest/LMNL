import { Link } from 'react-router-dom';

const NODE_MAP_POSITIONS = [
  { x: 18, y: 18, align: 'left' },
  { x: 82, y: 18, align: 'right' },
  { x: 18, y: 38, align: 'left' },
  { x: 82, y: 38, align: 'right' },
  { x: 18, y: 58, align: 'left' },
  { x: 82, y: 58, align: 'right' },
  { x: 18, y: 78, align: 'left' },
  { x: 82, y: 78, align: 'right' },
];

export default function CircularNav({
  nodes,
  activePath,
  onNodeEnter,
  onNodeLeave,
}) {
  return (
    <div className="circular-nav" aria-label="Primary navigation">
      <div className="circular-nav__grid" aria-hidden="true" />
      <div className="circular-nav__axis circular-nav__axis--vertical" aria-hidden="true" />
      <div className="circular-nav__axis circular-nav__axis--horizontal" aria-hidden="true" />
      <div className="circular-nav__core" aria-hidden="true">
        <span className="circular-nav__core-ring" />
        <span className="circular-nav__core-label">NODE MAP</span>
      </div>
      {nodes.map((node, index) => {
        const position = NODE_MAP_POSITIONS[index] || NODE_MAP_POSITIONS[0];
        const isActive = activePath === node.to;

        return (
          <Link
            key={node.to}
            to={node.to}
            className={`circular-nav__node circular-nav__node--${position.align} ${isActive ? 'is-active' : ''}`}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              '--node-color': node.color,
            }}
            onMouseEnter={() => onNodeEnter?.(index)}
            onMouseLeave={() => onNodeLeave?.()}
          >
            <span className="circular-nav__node-rail" aria-hidden="true" />
            <span className="circular-nav__node-pin" aria-hidden="true" />
            <span className="circular-nav__node-meta">
              <span className="circular-nav__node-index">{node.index}</span>
              <span className="circular-nav__node-label">{node.label}</span>
            </span>
            <span className="circular-nav__node-action" aria-hidden="true">ENTER</span>
          </Link>
        );
      })}
    </div>
  );
}
