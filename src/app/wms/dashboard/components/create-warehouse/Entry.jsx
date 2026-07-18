import React from 'react';

const Entry = ({ data, onSelect }) => {
  // Extract custom textX and textY, default to -20 if not provided
  const { id, x, y, rotation = 0, textX = -20, textY = 0 } = data;

  return (
    <g 
      onClick={() => onSelect(data)} 
      // className="cursor-pointer"
      transform={`translate(${x}, ${y}) rotate(${rotation})`}
    >
      <polygon
        points="-40,-20 -10,-20 0,0 -10,20 -40,20"
        className="fill-blue-600 stroke-black stroke-1 hover:fill-blue-700 transition-colors"
      />
      <text 
        transform={`rotate(${-rotation})`} 
        x={textX} // Uses the value from your JSON
        y=  {textY} // Uses the value from your JSON 
        fontSize="8" 
        fill="white" 
        textAnchor="middle"
        dominantBaseline="middle"
        className="pointer-events-none select-none font-bold"
      >
        {id}
      </text>
    </g>
  );
};

export { Entry };
export default Entry;