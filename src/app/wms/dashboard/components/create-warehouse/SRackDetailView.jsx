import React from "react";
import { Bin } from "./bin";
import Compartment from "./compartmentTag";
import RackLocationHeader from "./RackLocationHeader";
import { useLocationDetails } from "../hooks/useLocationDetails";

const SRackDetailView = ({
  item,
  children,
  fill = "#5C4D45",
  fill2 = "#787472",
  level1Compartments = 3,
  level2Compartments = 3,
  level3Compartments = 3,
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
        viewBox="0 0 450 450"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        {/* Modern Shelf Levels */}
        <rect className="levels" x="10" y="125" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />
        <rect className="levels" x="10" y="225" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />
        <rect className="levels" x="10" y="325" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />

        {/* Dynamic Compartments per Shelf */}
        <Compartment count={level1Compartments} shelfX={shelfX} shelfWidth={shelfWidth} y={125} height={8} />
        <Compartment count={level2Compartments} shelfX={shelfX} shelfWidth={shelfWidth} y={225} height={8} />
        <Compartment count={level3Compartments} shelfX={shelfX} shelfWidth={shelfWidth} y={325} height={8} />

        {/* Architectural Legs */}
        <rect x="10" y="30" width="12" height="400" rx="6" fill={fill} />
        <rect x="420" y="30" width="12" height="400" rx="6" fill={fill} />

        {/* Grouping bins with consistent spacing */}
        {[40, 140, 240, 340].map((y, levelIndex) => (
          <g key={levelIndex}>
            {[30, 160, 290].map((x, binIndex) => (
              <g key={binIndex} transform={`translate(${x}, ${y})`}>
                <Bin data={{ id: levelIndex * 3 + binIndex + 1 }} onSelect={(bin) => console.log(bin)} width={120} height={85} />
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