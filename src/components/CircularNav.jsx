import { Link } from 'react-router-dom';

const LEGACY_NODE_POSITIONS = [
  { x: 91.52, y: 50.72 },
  { x: 80.99, y: 19.62 },
  { x: 49.67, y: 8.48 },
  { x: 18.59, y: 19.62 },
  { x: 8.48, y: 50.72 },
  { x: 18.59, y: 81.72 },
  { x: 49.67, y: 91.52 },
  { x: 81.04, y: 81.72 },
];

export default function CircularNav({
  nodes,
  activePath,
  onNodeEnter,
  onNodeLeave,
}) {
  return (
    <div className="circular-nav" aria-label="Primary navigation">
      {nodes.map((node, index) => {
        const position = LEGACY_NODE_POSITIONS[index] || LEGACY_NODE_POSITIONS[0];
        const isActive = activePath === node.to;

        return (
          <Link
            key={node.to}
            to={node.to}
            className={`circular-nav__node ${isActive ? 'is-active' : ''}`}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              '--node-color': node.color,
            }}
            onMouseEnter={() => onNodeEnter?.(index)}
            onMouseLeave={() => onNodeLeave?.()}
          >
            <span className="circular-nav__node-circle" />
          </Link>
        );
      })}
    </div>
  );
}
