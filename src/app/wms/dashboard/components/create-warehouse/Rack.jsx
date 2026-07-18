import React from 'react';

const Rack = ({ data, onSelect }) => {
  const { id, x, y, status, orientation } = data;
  const isHorizontal = orientation === 'horizontal';
  const width = isHorizontal ? 100 : 40;
  const height = isHorizontal ? 40 : 100;

  // Modern status color palette
  const statusColors = { 
    full: { stop1: '#f87171', stop2: '#b91c1c' },      // Red gradient
    vacant: { stop1: '#4ade80', stop2: '#15803d' },    // Green gradient
    maintenance: { stop1: '#facc15', stop2: '#a16207' } // Yellow gradient
  };
  
  const colors = statusColors[status] || { stop1: '#94a3b8', stop2: '#475569' };

  return (
    <g 
      onClick={() => onSelect(data)} 
      className="cursor-pointer"
      style={{ transition: 'transform 0.2s ease-in-out' }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.008)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <defs>
        {/* Unique Gradient ID per Rack ID to prevent rendering conflicts */}
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.stop1} />
          <stop offset="100%" stopColor={colors.stop2} />
        </linearGradient>
      </defs>

      {/* Main Rect with Depth Effect */}
      <rect 
        x={x} y={y} 
        width={width} height={height} 
        rx="6" 
        fill={`url(#grad-${id})`} 
        style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.2))' }}
      />
      
      {/* Label Text with better legibility */}
      <text 
        x={x + width / 2} 
        y={y + height / 2 + 3} 
        fontSize="12" 
        fontWeight="bold" 
        fill="white" 
        textAnchor="middle" 
        style={{ pointerEvents: 'none', userSelect: 'none', textShadow: '0px 1px 1px rgba(0,0,0,0.3)' }}
      >
        {id}
      </text>
    </g>
  );
};

export { Rack };
export default Rack;