import React from "react";

const CompartmentTag = ({
  count = 3,
  shelfX = 30,
  shelfWidth = 390,
  y = 150,
  height = 20,
  strokeColor = "#FFFFFF",
  markerWidth = 4,
}) => {
  if (count <= 1) return null;

  // Calculate equal distance between inner dividers
  const step = shelfWidth / count;

  return (
    <g className="compartment-dividers">
      {Array.from({ length: count - 1 }).map((_, index) => {
        const xPos = shelfX + step * (index + 1) - markerWidth / 2;
        return (
          <rect
            key={index}
            x={xPos}
            y={y}
            width={markerWidth}
            height={height}
            fill={strokeColor}
            rx={1}
            opacity={0.85}
          />
        );
      })}
    </g>
  );
};

export default CompartmentTag;