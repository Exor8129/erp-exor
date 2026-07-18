import React from "react";
import { Bin } from "./bin";

const WarehouseCanvas = ({ children, fill = "#334155", fill2 = "#94a3b8" }) => {
  return (
    <div className="w-full h-full flex justify-center items-center p-4 bg-gray-50 rounded-2xl overflow-auto">
     
      <svg  
        viewBox="0 0 450 450"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        
        {/* Modern Shelf Levels */}
        <rect className="levels" x="10" y="150" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />
        <rect className="levels" x="10" y="290" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />

        {/* Architectural Legs */}
        <rect x="10" y="30" width="12" height="400" rx="6" fill={fill} />
        <rect x="420" y="30" width="12" height="400" rx="6" fill={fill} />

        {/* Grouping bins with consistent spacing */}
        {[40, 180, 315].map((y, levelIndex) => (
          <g key={levelIndex}>
            {[30, 160, 290].map((x, binIndex) => (
              <g key={binIndex} transform={`translate(${x}, ${y})`}>
                <Bin data={{ id: levelIndex * 3 + binIndex + 1 }} onSelect={(item) => console.log(item)} width={125} height={110} />
              </g>
            ))}
          </g>
        ))}

        {children}
      </svg>
    </div>
  );
};

export default WarehouseCanvas;