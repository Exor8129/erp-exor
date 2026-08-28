import React, { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { Poppins } from "next/font/google";

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
  const [storedContainers, setStoredContainers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal & Creation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const rackLabel = item?.metadata?.custom_label_id || item?.id || "R1";
  const rackDbId = item?.dbId || item?.id;

  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      if (!rackDbId) return;
      setLoading(true);

      try {
        const [whRes, tierRes, levelsRes, containersRes] = await Promise.all([
          item?.warehouse_id
            ? supabase
                .schema("wms")
                .from("warehouses")
                .select("name, code")
                .eq("id", item.warehouse_id)
                .single()
            : Promise.resolve({ data: null }),
          item?.tier_id
            ? supabase
                .schema("wms")
                .from("warehouse_tiers")
                .select("name, tier_number")
                .eq("id", item.tier_id)
                .single()
            : Promise.resolve({ data: null }),
          supabase
            .schema("wms")
            .from("rack_levels")
            .select("id, level_index, barcode")
            .eq("rack_id", rackDbId)
            .order("level_index", { ascending: true }),
          supabase
            .schema("purchase")
            .from("container_locations")
            .select(
              `
              id,
              container_id,
              rack_level_id,
              status,
              containers!container_id (
                id,
                barcode
              )
            `,
            )
            .eq("rack_id", rackDbId)
            .eq("status", "STORED")
            .is("removed_at", null),
        ]);

        if (!isMounted) return;

        if (whRes.data) setWarehouseInfo(whRes.data);
        if (tierRes.data) setTierInfo(tierRes.data);

        const fetchedLevels = levelsRes.data || [];
        setRackLevels(fetchedLevels);

        if (fetchedLevels.length === 0) {
          setShowConfirmModal(true);
        }

        if (containersRes.data) setStoredContainers(containersRes.data);
      } catch (err) {
        console.error("Error fetching location & rack details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [rackDbId, item?.warehouse_id, item?.tier_id]);

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

  const legTopY = 30;
  const legHeight = 400;
  const shelfHeight = 20;

  const totalLevels = rackLevels.length > 0 ? rackLevels.length : 1;
  const numShelves = Math.max(0, totalLevels - 1);

  const totalSpaceHeight = legHeight - numShelves * shelfHeight;
  const slotHeight = totalSpaceHeight / totalLevels;

  return (
    <div className={`relative w-full h-full flex flex-col items-center p-4 bg-gray-50 rounded-2xl overflow-auto gap-3 ${poppins.className}`}>
      {/* Confirmation Modal Overlay */}
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
            <div className="text-[11px] text-gray-400 bg-gray-50 p-2 rounded border border-gray-100 font-mono">
              Format: {warehouseInfo?.code || "WH01"}-T
              {tierInfo?.tier_number || "1"}-R
              {String(rackLabel).match(/\d+/)?.[0] || rackLabel}-L[1-3]
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isCreating}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDefaultLevels}
                disabled={isCreating}
                className="px-4 py-2 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
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

      <svg
        viewBox="0 0 450 450"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        className="bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <style>{`
          text {
            font-family: inherit;
          }
          
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

          .container-barcode {
            font-family: monospace;
            font-weight: 700;
            fill: #ffffff;
          }
        `}</style>

        {/* Level Displays and Containers */}
        {rackLevels.map((lvl, index) => {
          const spaceIndexFromTop = totalLevels - 1 - index;
          const slotTopY =
            legTopY + spaceIndexFromTop * (slotHeight + shelfHeight);
          const centerY = slotTopY + slotHeight / 2;
          const labelX = leftLegX - 12;

          const levelContainers = storedContainers.filter(
            (c) => c.rack_level_id === lvl.id,
          );

          const innerLeftX = leftLegX + 22;
          const innerRightX = rightLegX - 2;
          const availableWidth = innerRightX - innerLeftX;
          const availableHeight = slotHeight - 6;

          const totalCount = levelContainers.length;

          const cols = Math.min(
            Math.max(Math.ceil(Math.sqrt(totalCount)), 1),
            6,
          );
          const rows = Math.ceil(totalCount / cols);

          const gapX = 4;
          const gapY = 3;

          const boxWidth = Math.max(
            (availableWidth - (cols - 1) * gapX) / cols,
            20,
          );
          const boxHeight = Math.min(
            (availableHeight - (rows - 1) * gapY) / rows,
            30,
          );

          const fontSize = Math.max(Math.min(boxHeight * 0.45, 9), 6);

          return (
            <g key={`level-group-${lvl.id || index}`}>
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

              {levelContainers.map((cLoc, cIdx) => {
                const colIdx = cIdx % cols;
                const rowFromBottom = Math.floor(cIdx / cols);

                const boxX = innerLeftX + colIdx * (boxWidth + gapX);
                const boxY =
                  slotTopY +
                  slotHeight -
                  (rowFromBottom + 1) * boxHeight -
                  rowFromBottom * gapY -
                  2;

                const barcode = cLoc.containers?.barcode || "BOX";

                return (
                  <g key={cLoc.id || cIdx}>
                    <rect
                      x={boxX}
                      y={boxY}
                      width={boxWidth}
                      height={boxHeight}
                      rx="3"
                      fill="#3B82F6"
                      stroke="#1D4ED8"
                      strokeWidth="1"
                    />
                    <text
                      x={boxX + boxWidth / 2}
                      y={boxY + boxHeight / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="container-barcode select-none"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {boxWidth < 35
                        ? barcode.slice(-3)
                        : barcode.length > 7
                          ? `${barcode.slice(0, 5)}…`
                          : barcode}
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
              className="levels"
              x={shelfX}
              y={shelfY}
              width={shelfWidth}
              height={shelfHeight}
              rx="4"
              fill={fill2}
            />
          );
        })}

        {/* Side Pillars */}
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