import React from "react";
import Rack from "./Rack";
import SRack from "./SRack";
import FSA from "./FSA";
import Entry from "./Entry";
import WarehouseObject from "./WarehouseObject";

const MapCanvas = ({ elements, onElementSelect }) => {
  // Calculate warehouse dimensions safely
  const warehouseWidth =
    Math.max(...elements.map(el => (Number(el.x) || 0) + (Number(el.width) || 0)), 1000) + 100;

  const warehouseHeight =
    Math.max(...elements.map(el => (Number(el.y) || 0) + (Number(el.height) || 0)), 700) + 100;

  return (
    <div
      className="w-full h-full bg-slate-50 border border-slate-200 rounded-lg overflow-auto shadow-inner"
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${warehouseWidth} ${warehouseHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="bg-white"
      >
        <defs>
          <pattern
            id="grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M20 0 L0 0 0 20"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect
          width={warehouseWidth}
          height={warehouseHeight}
          fill="url(#grid)"
        />

        {elements.map((el) => {
          // Extract the JSON metadata payload safely
          const meta = el.metadata || {};

          // Flatten values into a single configuration object 
          // to perfectly mimic your original data structure for child props
          const standardDataFormat = {
            ...el,
            dbId: el.id, // <-- PRESERVE THE TRUE DB PRIMARY KEY HERE
            id: meta.custom_label_id || el.id, // Keeps the custom string label for visual rendering inside components
            status: meta.status || "vacant",
            orientation: meta.orientation || "vertical",
            rotation: meta.rotation || 0,
            textX: meta.textX || 0,
            color: meta.color || "#CDE6FE"
          };

          switch (el.type) {
            case "s-rack":
              return (
                <SRack
                  key={el.id}
                  data={standardDataFormat}
                  onSelect={onElementSelect}
                />
              );

            case "fsa":
              return (
                <FSA
                  key={el.id}
                  data={standardDataFormat}
                  onSelect={onElementSelect}
                />
              );

            case "entry":
              return (
                <Entry
                  key={el.id}
                  data={standardDataFormat}
                  onSelect={onElementSelect}
                />
              );

            case "object":
              return (
                <WarehouseObject
                  key={el.id}
                  data={standardDataFormat}
                  onSelect={onElementSelect}
                />
              );

            default:
              return (
                <Rack
                  key={el.id}
                  data={standardDataFormat}
                  onSelect={onElementSelect}
                />
              );
          }
        })}
      </svg>
    </div>
  );
};

export default MapCanvas;