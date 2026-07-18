import React from "react";
import { Bin } from "./bin";

const SRackDetailView = ({ children, fill = "#5C4D45", fill2 = "#787472" }) => {
  return (
    <div className="w-full h-full flex justify-center items-center p-4 bg-gray-50 rounded-2xl overflow-auto">
      {/* 
        ✅ Removed explicit 1000x800 pixel constraints.
        ✅ Added a matching viewBox of "0 0 450 450" so it scales perfectly into its parent panel.
      */}
      <svg 
        viewBox="0 0 450 450"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        
        {/* Modern Shelf Levels (Softened Colors) */}
        <rect className="levels" x="10" y="125" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />
        <rect className="levels" x="10" y="225" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />
        <rect className="levels" x="10" y="325" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />

        {/* Architectural Legs */}
        <rect x="10" y="30" width="12" height="400" rx="6" fill={fill} />
        <rect x="420" y="30" width="12" height="400" rx="6" fill={fill} />

        {/* Grouping bins with consistent spacing */}
        {[40, 140, 240, 340].map((y, levelIndex) => (
          <g key={levelIndex}>
            {[30, 160, 290].map((x, binIndex) => (
              <g key={binIndex} transform={`translate(${x}, ${y})`}>
                <Bin data={{ id: levelIndex * 3 + binIndex + 1 }} onSelect={(item) => console.log(item)} width={120} height={85} />
              </g>
            ))}
          </g>
        ))}

        {children}
      </svg>
    </div>
  );
};

export default SRackDetailView;