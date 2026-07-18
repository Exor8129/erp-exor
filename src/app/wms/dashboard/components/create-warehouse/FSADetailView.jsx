import React from "react";
import { Bin } from "./bin";

const FSADetailView = ({ children, fill = "#5C4D45", fill2 = "#5C4D45" }) => {
  return (
    <div className="w-full h-full flex justify-center items-center p-4 bg-gray-50 rounded-2xl overflow-auto">
      {/* 
        ✅ Removed explicit 1000x800 size restrictions.
        ✅ Added a tight viewBox="0 0 450 470" based on your max shapes coordinates 
           (width spans up to ~432, height spans up to ~450 for the leg extensions).
      */}
      <svg 
        viewBox="0 0 450 470"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        
        {/* Modern Shelf Levels (Softened Colors) */}
        <rect className="levels" x="10" y="400" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />

        {/* Architectural Legs */}
        <rect x="10" y="400" width="12" height="50" rx="6" fill={fill} />
        <rect x="420" y="400" width="12" height="50" rx="6" fill={fill} />

        {/* Grouping bins with consistent spacing */}
        {[90, 195, 300].map((y, levelIndex) => (
          <g key={levelIndex}>
            {[25, 230].map((x, binIndex) => (
              <g key={binIndex} transform={`translate(${x}, ${y})`}>
                <Bin data={{ id: levelIndex * 3 + binIndex + 1 }} onSelect={(item) => console.log(item)} width={190} height={100} />
              </g>
            ))}
          </g>
        ))}

        {children}
      </svg>
    </div>
  );
};

export default FSADetailView;