import React, { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { Poppins } from "next/font/google";
import { Button } from "antd";

const poppins = Poppins({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const WarehouseCanvas = ({
  item,
  children,
  fill = "#334155",
  fill2 = "#F54927",
}) => {
  const leftLegX = 50;
  const rightLegX = 420;
  const shelfX = leftLegX;
  const shelfWidth = rightLegX - leftLegX;

  const [warehouseInfo, setWarehouseInfo] = useState({ name: "", code: "" });
  const [tierInfo, setTierInfo] = useState({ name: "", tier_number: "" });
  const [rackLevels, setRackLevels] = useState([]);
  const [containersByLevel, setContainersByLevel] = useState({});
  const [loading, setLoading] = useState(false);

  // Modal & Creation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const rackLabel = item?.metadata?.custom_label_id || item?.id || "R1";
  const rackDbId = item?.rack_id || item?.dbId || item?.id;

  useEffect(() => {
    let isMounted = true;

    const loadLevelsAndContainers = async () => {
      if (!rackDbId) return;
      setLoading(true);

      try {
        const [whRes, tierRes, levelsRes] = await Promise.all([
          item?.warehouse_id
            ? supabase
                .schema("wms")
                .from("warehouses")
                .select("name, code")
                .eq("id", item.warehouse_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),

          item?.tier_id
            ? supabase
                .schema("wms")
                .from("warehouse_tiers")
                .select("name, tier_number")
                .eq("id", item.tier_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),

          Array.isArray(item?.rack_levels) && item.rack_levels.length > 0
            ? Promise.resolve({ data: item.rack_levels })
            : supabase
                .schema("wms")
                .from("rack_levels")
                .select("id, rack_id, level_index, barcode")
                .eq("rack_id", rackDbId)
                .order("level_index", { ascending: true }),
        ]);

        if (!isMounted) return;

        if (whRes.data) setWarehouseInfo(whRes.data);
        if (tierRes.data) setTierInfo(tierRes.data);

        const levels = (levelsRes.data || []).sort(
          (a, b) => Number(a.level_index) - Number(b.level_index)
        );

        setRackLevels(levels);

        if (levels.length === 0) {
          setShowConfirmModal(true);
          setContainersByLevel({});
          return;
        }

        const levelIds = levels.map((lvl) => lvl.id).filter(Boolean);

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

        if (locError) {
          console.error("Error fetching container locations:", locError);
          return;
        }

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
        console.error("Error loading warehouse canvas data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadLevelsAndContainers();

    return () => {
      isMounted = false;
    };
  }, [rackDbId, item?.warehouse_id, item?.tier_id, JSON.stringify(item?.rack_levels)]);

  const handleCreateDefaultLevels = async () => {
    setIsCreating(true);

    const whCode = warehouseInfo?.code || "WH01";
    const tierNum = tierInfo?.tier_number || "1";
    const rackMatch = String(rackLabel).match(/\d+/);
    const rackNum = rackMatch ? rackMatch[0] : rackLabel.replace(/\s+/g, "");

    try {
      const defaultLevelsToCreate = [1, 2, 3].map((lvlIndex) => ({
        rack_id: rackDbId,
        level_index: lvlIndex,
        barcode: `${whCode}-T${tierNum}-R${rackNum}-L${lvlIndex}`,
      }));

      const { data: createdLevels, error: createError } = await supabase
        .schema("wms")
        .from("rack_levels")
        .insert(defaultLevelsToCreate)
        .select("id, level_index, barcode")
        .order("level_index", { ascending: true });

      if (createError) {
        console.error("Error creating default rack levels:", createError);
      } else if (createdLevels) {
        setRackLevels(createdLevels);
      }
    } catch (err) {
      console.error("Failed to insert default levels:", err);
    } finally {
      setIsCreating(false);
      setShowConfirmModal(false);
    }
  };

  // Dimensions
  const legTopY = 30;
  const legHeight = 400;
  const shelfHeight = 18;

  const totalLevels = rackLevels.length > 0 ? rackLevels.length : 3;
  const numShelves = Math.max(0, totalLevels - 1);
  const totalSpaceHeight = legHeight - numShelves * shelfHeight;
  const slotHeight = totalSpaceHeight / totalLevels;

  // Container configuration: capped dimensions & spacing
  const BOX_MAX_WIDTH = 48; // Max width per container
  const BOX_HEIGHT = 28;    // Height per container
  const GAP_X = 5;          // Horizontal gap between containers
  const GAP_Y = 4;          // Vertical gap between stacked rows
  const PADDING_LEFT = 24;  // Margin from the left pillar

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center p-4 bg-gray-50 rounded-2xl overflow-auto gap-3 ${poppins.className}`}
    >
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-5 max-w-sm w-full text-center space-y-4">
            <h3 className="text-base font-semibold text-gray-800">
              No Levels Configured
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Rack{" "}
              <span className="font-semibold text-orange-600">{rackLabel}</span>{" "}
              has no levels. Auto-generate 3 default levels?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isCreating}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDefaultLevels}
                disabled={isCreating}
                className="px-4 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="w-full max-w-112.5 bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center justify-between text-xs text-gray-600">
        <div>
          <span className="rack-title">Warehouse</span>
          <div className="ml-4 mt-2">
            <span className="rack-title1">
              {loading ? "Loading..." : warehouseInfo.name || "N/A"}
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <div>
          <span className="rack-title">Tier</span>
          <div className="mt-2">
            <span className="rack-title1">
              {loading
                ? "Loading..."
                : tierInfo.name ||
                  (tierInfo.tier_number ? `Tier ${tierInfo.tier_number}` : "N/A")}
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <div className="mr-5">
          <span className="rack-title">Rack</span>
          <div className="ml-2 mt-2">
            <span className="rack-title1">{rackLabel}</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 450 450"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <style>{`
          text { font-family: inherit; }
          .level-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            fill: #64748b;
          }
          .rack-title {
            display: block;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #64748b;
          }
          .rack-title1 {
            display: block;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #000000;
          }
          .container-text {
            font-family: monospace;
            font-weight: 700;
            fill: #ffffff;
          }
        `}</style>

        {/* Shelves & Placed Containers */}
        {rackLevels.map((lvl, index) => {
          // Bottom-up shelf calculation
          const spaceIndexFromTop = totalLevels - 1 - index;
          const slotTopY =
            legTopY + spaceIndexFromTop * (slotHeight + shelfHeight);
          const centerY = slotTopY + slotHeight / 2;
          const labelX = leftLegX - 12;

          const levelContainers = containersByLevel[lvl.id] || [];

          // Usable shelf boundaries
          const shelfFloorY = slotTopY + slotHeight; // The exact surface of the shelf
          const startX = leftLegX + PADDING_LEFT;
          const availableWidth = rightLegX - 10 - startX;

          // Compute how many boxes fit horizontally before wrapping to the next stacked row
          const maxColsPerRow = Math.max(
            1,
            Math.floor((availableWidth + GAP_X) / (BOX_MAX_WIDTH + GAP_X))
          );

          return (
            <g key={`level-group-${lvl.id || index}`}>
              {/* Vertical Level Tag */}
              <text
                x={labelX}
                y={centerY}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(-90, ${labelX}, ${centerY})`}
                className="level-label select-none"
              >
                LEVEL {lvl.level_index ?? index + 1}
              </text>

              {/* Containers: Stacking Left -> Right, Bottom -> Top */}
              {levelContainers.map((cLoc, cIdx) => {
                const colIdx = cIdx % maxColsPerRow;
                const rowIdx = Math.floor(cIdx / maxColsPerRow); // 0 = resting on shelf floor, 1 = stacked above

                // Left-to-right positioning
                const boxX = startX + colIdx * (BOX_MAX_WIDTH + GAP_X);

                // Bottom-to-top stacking: anchor to shelfFloorY and subtract row heights
                const boxY =
                  shelfFloorY -
                  (rowIdx + 1) * BOX_HEIGHT -
                  rowIdx * GAP_Y -
                  2; // 2px lift off shelf

                const barcode =
                  cLoc.containers?.barcode ||
                  cLoc.container_id?.slice(0, 6) ||
                  "BOX";

                return (
                  <g key={cLoc.id || cIdx} className="cursor-pointer">
                    <title>
                      {`Level: ${lvl.level_index}\nBarcode: ${barcode}\nPlaced: ${
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
                      strokeWidth="1"
                    />
                    <text
                      x={boxX + BOX_MAX_WIDTH / 2}
                      y={boxY + BOX_HEIGHT / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="container-text select-none pointer-events-none"
                      style={{ fontSize: "8px" }}
                    >
                      {barcode.length > 7 ? `${barcode.slice(0, 5)}…` : barcode}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Shelf Dividers */}
        {Array.from({ length: numShelves }).map((_, index) => {
          const shelfY =
            legTopY + (index + 1) * slotHeight + index * shelfHeight;

          return (
            <rect
              key={`shelf-${index}`}
              x={shelfX}
              y={shelfY}
              width={shelfWidth}
              height={shelfHeight}
              rx="4"
              fill={fill2}
            />
          );
        })}

        {/* Left and Right Rack Legs */}
        <rect
          x={leftLegX}
          y={legTopY}
          width="20"
          height={legHeight}
          rx="6"
          fill={fill}
        />
        <rect
          x={rightLegX}
          y={legTopY}
          width="20"
          height={legHeight}
          rx="6"
          fill={fill}
        />

        {children}
      </svg>
    </div>
  );
};

export default WarehouseCanvas;