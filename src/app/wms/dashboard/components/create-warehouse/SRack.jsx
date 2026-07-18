import React from 'react';

const SRack = ({ data, onSelect }) => {
  const { id, x, y, status, orientation } = data;
  const isHorizontal = orientation === 'horizontal';
  const width = isHorizontal ? 60 : 20;
  const height = isHorizontal ? 20 : 60;

  // Modern purple gradient palette for SRack
  const colors = status === 'full' 
    ? { stop1: '#a78bfa', stop2: '#6d28d9' } 
    : { stop1: '#c4b5fd', stop2: '#8b5cf6' };

  return (
    <g 
      onClick={() => onSelect(data)} 
      className="cursor-pointer"
      style={{ transition: 'transform 0.2s ease-in-out' }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.005)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <defs>
        {/* Unique gradient ID for SRack items */}
        <linearGradient id={`srack-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.stop1} />
          <stop offset="100%" stopColor={colors.stop2} />
        </linearGradient>
      </defs>

      {/* Main SRack block with depth */}
      <rect 
        x={x} y={y} 
        width={width} height={height} 
        rx="4" 
        fill={`url(#srack-grad-${id})`} 
        style={{ filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.2))' }}
      />
      
      {/* Centered label */}
      <text 
        x={x + width / 2} 
        y={y + height / 2 + 3} 
        fontSize="9" 
        fontWeight="bold" 
        fill="white" 
        textAnchor="middle" 
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {id}
      </text>
    </g>
  );
};

export { SRack };
export default SRack;