import React from 'react';

const FSA = ({ data, onSelect }) => {
  const { id, x, y, status, orientation } = data;
  const isHorizontal = orientation === 'horizontal';
  const width = isHorizontal ? 50 : 40;
  const height = isHorizontal ? 40 : 50;

  // Use the same status color palette for consistency
  const statusColors = { 
    full: { stop1: '#f87171', stop2: '#b91c1c' },
    vacant: { stop1: '#4ade80', stop2: '#15803d' },
    maintenance: { stop1: '#facc15', stop2: '#a16207' }
  };
  
  const colors = statusColors[status] || { stop1: '#94a3b8', stop2: '#475569' };

  return (
    <g 
      onClick={() => onSelect(data)} 
      className="cursor-pointer"
      style={{ transition: 'transform 0.2s ease-in-out' }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.005)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <defs>
        {/* Unique gradient ID for FSA items */}
        <linearGradient id={`fsa-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.stop1} />
          <stop offset="100%" stopColor={colors.stop2} />
        </linearGradient>
      </defs>

      {/* Main FSA block with depth */}
      <rect 
        x={x} y={y} 
        width={width} height={height} 
        rx="6" 
        fill={`url(#fsa-grad-${id})`} 
        style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.2))' }}
      />
      
      {/* Centered label */}
      <text 
        x={x + width / 2} 
        y={y + height / 2 + 4} 
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

export { FSA };
export default FSA;