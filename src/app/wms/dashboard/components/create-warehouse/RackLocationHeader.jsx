import React from "react";

const RackLocationHeader = ({ warehouseName, tierName, rackLabel }) => {
  return (
    <div className="w-full max-w-112.5 bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center justify-between text-xs text-gray-600">
      <div>
        <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Warehouse</span>
        <span className="font-medium text-gray-800">{warehouseName || "N/A"}</span>
      </div>
      <div className="h-6 w-px bg-gray-200" />
      <div>
        <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Tier</span>
        <span className="font-medium text-gray-800">{tierName || "N/A"}</span>
      </div>
      <div className="h-6 w-px bg-gray-200" />
      <div>
        <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-semibold">Rack</span>
        <span className="font-bold text-orange-600">{rackLabel}</span>
      </div>
    </div>
  );
};

export default RackLocationHeader;