import React, { useEffect, useState } from "react";
import Compartment from "./compartmentTag";
import RackLocationHeader from "./RackLocationHeader";
import { useLocationDetails } from "../hooks/useLocationDetails";
import { supabase } from "../../../../lib/supabase";

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

  const [rackLevels, setRackLevels] = useState([]);
  const [containersByLevel, setContainersByLevel] = useState({});
  const [loading, setLoading] = useState(false);

  const sRackDbId = item?.rack_id || item?.dbId || item?.id;

  const shelfX = 30;
  const shelfWidth = 390;

  const formattedTier =
    tierInfo.name || (tierInfo.tier_number ? `Tier ${tierInfo.tier_number}` : "N/A");

  // Fetch Rack Levels & Containers Stored at each level
  useEffect(() => {
    let isMounted = true;

    const loadLevelsAndContainers = async () => {
      if (!sRackDbId) return;
      setLoading(true);

      try {
        // Step 1: Fetch rack levels
        const levelsPromise =
          Array.isArray(item?.rack_levels) && item.rack_levels.length > 0
            ? Promise.resolve({ data: item.rack_levels })
            : supabase
                .schema("wms")
                .from("rack_levels")
                .select("id, rack_id, level_index, barcode")
                .eq("rack_id", sRackDbId)
                .order("level_index", { ascending: true });

        const { data: levelsData, error: levelsErr } = await levelsPromise;
        if (levelsErr) throw levelsErr;

        const levels = (levelsData || []).sort(
          (a, b) => Number(a.level_index) - Number(b.level_index)
        );

        if (isMounted) setRackLevels(levels);

        if (levels.length === 0) {
          if (isMounted) setContainersByLevel({});
          return;
        }

        // Step 2: Extract all shelf level IDs
        const levelIds = levels.map((lvl) => lvl.id).filter(Boolean);

        // Step 3: Fetch containers currently stored at these level IDs
        const { data: locData, error: locError } = await supabase
          .schema("purchase")
          .from("container_locations")
          .select(
            `
            id,
            container_id,
            rack_level_id,
            status,
            placed_at,
            containers!container_id (
              id,
              barcode,
              status
            )
          `
          )
          .in("rack_level_id", levelIds)
          .eq("status", "STORED")
          .is("removed_at", null);

        if (locError) throw locError;

        // Group containers by rack_level_id
        const grouped = {};
        levelIds.forEach((id) => {
          grouped[id] = [];
        });

        (locData || []).forEach((row) => {
          if (grouped[row.rack_level_id]) {
            grouped[row.rack_level_id].push(row);
          } else {
            grouped[row.rack_level_id] = [row];
          }
        });

        if (isMounted) {
          setContainersByLevel(grouped);
        }
      } catch (err) {
        console.error("Error loading SRack containers:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLevelsAndContainers();

    return () => {
      isMounted = false;
    };
  }, [sRackDbId, JSON.stringify(item?.rack_levels)]);

  // Shelf coordinates definition (shelves at y = 125, 225, 325, floor at 425)
  // Floor levels from bottom (Level 1) to top (Level 3/4)
  const SHELF_FLOORS = [
    { levelIndex: 1, floorY: 425, shelfY: 425 },
    { levelIndex: 2, floorY: 325, shelfY: 325 },
    { levelIndex: 3, floorY: 225, shelfY: 225 },
    { levelIndex: 4, floorY: 125, shelfY: 125 },
  ];

  // Container dimensions & layout constraints
  const BOX_MAX_WIDTH = 48;
  const BOX_HEIGHT = 28;
  const GAP_X = 5;
  const GAP_Y = 4;
  const PADDING_LEFT = 35;

  const usableWidth = shelfWidth - 10;
  const maxCols = Math.max(1, Math.floor((usableWidth + GAP_X) / (BOX_MAX_WIDTH + GAP_X)));

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
        <style>{`
          text { font-family: inherit; }
          .container-text {
            font-family: monospace;
            font-weight: 700;
            fill: #ffffff;
          }
          .level-indicator {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            fill: #94a3b8;
          }
        `}</style>

        {/* Shelf Levels Dividers */}
        <rect className="levels" x="10" y="125" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />
        <rect className="levels" x="10" y="225" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />
        <rect className="levels" x="10" y="325" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />
        <rect className="levels" x="10" y="425" width="422" height="8" rx="4" fill={fill2} opacity="0.4" />

        {/* Dynamic Compartments per Shelf */}
        <Compartment count={level1Compartments} shelfX={shelfX} shelfWidth={shelfWidth} y={125} height={8} />
        <Compartment count={level2Compartments} shelfX={shelfX} shelfWidth={shelfWidth} y={225} height={8} />
        <Compartment count={level3Compartments} shelfX={shelfX} shelfWidth={shelfWidth} y={325} height={8} />

        {/* Vertical Upright Legs */}
        <rect x="10" y="30" width="12" height="400" rx="6" fill={fill} />
        <rect x="420" y="30" width="12" height="400" rx="6" fill={fill} />

        {/* Render Containers per Shelf (Left to Right, Bottom to Top) */}
        {rackLevels.map((lvl, index) => {
          // Match shelf coordinate by level_index (or by array index from bottom up)
          const lvlNum = lvl.level_index ?? index + 1;
          const shelfConfig =
            SHELF_FLOORS.find((s) => s.levelIndex === lvlNum) ||
            SHELF_FLOORS[Math.min(index, SHELF_FLOORS.length - 1)];

          const levelContainers = containersByLevel[lvl.id] || [];

          return (
            <g key={`s-level-${lvl.id || index}`}>
              {/* Level indicator tag */}
              <text
                x="26"
                y={shelfConfig.floorY - 10}
                className="level-indicator select-none"
              >
                L{lvlNum}
              </text>

              {/* Containers placed on this level */}
              {levelContainers.map((cLoc, cIdx) => {
                const colIdx = cIdx % maxCols;
                const rowIdx = Math.floor(cIdx / maxCols);

                const boxX = PADDING_LEFT + colIdx * (BOX_MAX_WIDTH + GAP_X);
                const boxY =
                  shelfConfig.floorY - (rowIdx + 1) * BOX_HEIGHT - rowIdx * GAP_Y - 2;

                const barcode =
                  cLoc.containers?.barcode ||
                  cLoc.container_id?.slice(0, 6) ||
                  "BOX";

                return (
                  <g key={cLoc.id || cIdx} className="cursor-pointer">
                    <title>
                      {`Level ${lvlNum} | Barcode: ${barcode}\nPlaced: ${
                        cLoc.placed_at
                          ? new Date(cLoc.placed_at).toLocaleTimeString()
                          : "N/A"
                      }`}
                    </title>
                    <rect
                      x={boxX}
                      y={boxY}
                      width={BOX_MAX_WIDTH}
                      height={BOX_HEIGHT}
                      rx="3"
                      fill="#2563EB"
                      stroke="#1D4ED8"
                      strokeWidth="1.2"
                    />
                    <text
                      x={boxX + BOX_MAX_WIDTH / 2}
                      y={boxY + BOX_HEIGHT / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="container-text select-none pointer-events-none"
                      style={{ fontSize: "8.5px" }}
                    >
                      {barcode.length > 7 ? `${barcode.slice(0, 5)}…` : barcode}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {children}
      </svg>
    </div>
  );
};

export default SRackDetailView;