import React from "react";
import { Bin } from "./bin";
// import Compartment from "./compartmentTag";
import RackLocationHeader from "./RackLocationHeader";
import { useLocationDetails } from "../hooks/useLocationDetails";
import CompartmentTag from "./compartmentTag";

const FSADetailView = ({
  item,
  children,
  fill = "#5C4D45",
  fill2 = "#5C4D45",
  level1Compartments = 2,
}) => {
  const { warehouseInfo, tierInfo, rackLabel } = useLocationDetails(item);

  const shelfX = 30;
  const shelfWidth = 390;

  const formattedTier =
    tierInfo.name || (tierInfo.tier_number ? `Tier ${tierInfo.tier_number}` : "N/A");

  return (
    <div className="w-full h-full flex flex-col items-center p-4 bg-gray-50 rounded-2xl overflow-auto gap-3">
      {/* Location Details Header */}
      <RackLocationHeader
        warehouseName={warehouseInfo.name}
        tierName={formattedTier}
        rackLabel={rackLabel}
      />

      <svg
        viewBox="0 0 450 470"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        {/* Modern Shelf Levels */}
        <rect className="levels" x="10" y="400" width="422" height="20" rx="4" fill={fill2} opacity="0.7" />

        {/* Dynamic Compartment Divider */}
        <CompartmentTag count={level1Compartments} shelfX={shelfX} shelfWidth={shelfWidth} y={400} height={8} />

        {/* Architectural Legs */}
        <rect x="10" y="400" width="12" height="50" rx="6" fill={fill} />
        <rect x="420" y="400" width="12" height="50" rx="6" fill={fill} />

        {/* Grouping bins with consistent spacing
        {[90, 195, 300].map((y, levelIndex) => (
          <g key={levelIndex}>
            {[25, 230].map((x, binIndex) => (
              <g key={binIndex} transform={`translate(${x}, ${y})`}>
                <Bin data={{ id: levelIndex * 3 + binIndex + 1 }} onSelect={(bin) => console.log(bin)} width={190} height={100} />
              </g>
            ))}
          </g>
        ))} */}

        {children}
      </svg>
    </div>
  );
};

export default FSADetailView;