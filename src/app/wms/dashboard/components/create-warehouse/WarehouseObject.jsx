import React from 'react';

const WarehouseObject = ({ data, onSelect }) => {
  const { 
    id, x, y, 
    rotation = 0, 
    textX = 0,   // Defaults to 0 if missing
    textY = 0,   // Defaults to 0 if missing
    width = 60, 
    height = 90, 
    status, 
    color 
  } = data;

  // Status mapping
  const statusColors = { 
    full: '#fca5a5', 
    vacant: '#86efac', 
    maintenance: '#fde047' 
  };
  
  const fillColor = color || statusColors[status] || '#e2e8f0';

  return (
    <g 
      onClick={() => onSelect(data)} 
      className="cursor-pointer" // Uncommented for better UX
      transform={`translate(${x}, ${y}) rotate(${rotation})`}
    >
      {/* Main Object Body */}
      <rect 
        x={-width / 2} 
        y={-height / 2} 
        width={width} 
        height={height} 
        rx="4"
        fill={fillColor} 
        stroke="#64748b" 
        strokeWidth="1"
        className="hover:opacity-80 transition-opacity"
      />
      
      {/* 
        Text Element: 
        To make textX and textY easy to handle, we first translate to the 
        intended text position, AND THEN cancel out the parent's rotation.
      */}
      <text 
        transform={`translate(${textX}, ${textY}) rotate(${-rotation})`} 
        x="0" 
        y="0" 
        fontSize="8" 
        fill="#1e293b" 
        textAnchor="middle" 
        dominantBaseline="middle"
        className="pointer-events-none select-none font-bold"
      >
        {id}
      </text>
    </g>
  );
};

export { WarehouseObject };
export default WarehouseObject;