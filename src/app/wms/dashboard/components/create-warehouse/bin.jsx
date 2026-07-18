import React from 'react';

const Bin = ({ data, onSelect, width = 120, height = 110 }) => {
  // Calculate dynamic positions so elements scale beautifully
  const textX = width / 2;
  const textY = height * 0.63; // Roughly centers the text vertically
  const labelWidth = width * 0.75; // 75% of total width
  const labelX = (width - labelWidth) / 2; // Centers the label slot horizontally

  return (
    <g 
      onClick={() => onSelect(data)} 
      className="cursor-pointer"
      style={{ transition: 'transform 0.2s ease-in-out', transformOrigin: 'center' }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <defs>
        {/* Pro Tip: Using a dynamic ID prevents gradient clashing if you have multiple bins */}
        <linearGradient id={`binGradient-${data.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4A373" />
          <stop offset="100%" stopColor="#A67C52" />
        </linearGradient>
      </defs>
      
      {/* Main Bin Body - Now using responsive width and height */}
      <rect 
        width={width} 
        height={height} 
        rx="6" 
        fill={`url(#binGradient-${data.id})`}
        stroke="#8B5A2B" 
        strokeWidth="2" 
        style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15))' }}
      />
      
      {/* Internal "Label" Slot Styling - Scales relative to width */}
      <rect 
        x={labelX} 
        y="15" 
        width={labelWidth} 
        height="20" 
        rx="3" 
        fill="rgba(255,255,255,0.2)" 
      />
      
      {/* Bin ID Text - Always centered perfectly */}
      <text 
        x={textX} 
        y={textY} 
        fontSize="24" 
        fontWeight="bold" 
        fill="#4A3728" 
        textAnchor="middle" 
        style={{ pointerEvents: 'none' }}
      >
        {data.id}
      </text>
    </g>
  );
};

export { Bin };