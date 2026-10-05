import React, { useEffect, useState } from "react";
import { Bin } from "./bin";
import RackLocationHeader from "./RackLocationHeader";
import { useLocationDetails } from "../hooks/useLocationDetails";
import CompartmentTag from "./compartmentTag";
import { supabase } from "../../../../lib/supabase";

const FSADetailView = ({
  item,
  children,
  fill = "#5C4D45",
  fill2 = "#5C4D45",
  level1Compartments = 2,
}) => {
  const { warehouseInfo, tierInfo, rackLabel } = useLocationDetails(item);

  const [rackLevels, setRackLevels] = useState([]);
  const [storedContainers, setStoredContainers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fsaDbId = item?.rack_id || item?.dbId || item?.id;

  const shelfX = 30;
  const shelfWidth = 390;
  const floorY = 400; // The surface where containers rest

  const formattedTier =
    tierInfo.name || (tierInfo.tier_number ? `Tier ${tierInfo.tier_number}` : "N/A");

  // Fetch Level IDs and Stored Containers
  useEffect(() => {
    let isMounted = true;

    const fetchContainers = async () => {
      if (!fsaDbId) return;
      setLoading(true);

      try {
        // Step 1: Fetch rack levels for this FSA element
        const levelsPromise =
          Array.isArray(item?.rack_levels) && item.rack_levels.length > 0
            ? Promise.resolve({ data: item.rack_levels })
            : supabase
                .schema("wms")
                .from("rack_levels")
                .select("id, rack_id, level_index, barcode")
                .eq("rack_id", fsaDbId)
                .order("level_index", { ascending: true });

        const { data: levelsData, error: levelsErr } = await levelsPromise;
        if (levelsErr) throw levelsErr;

        const levels = levelsData || [];
        if (isMounted) setRackLevels(levels);

        if (levels.length === 0) {
          if (isMounted) setStoredContainers([]);
          return;
        }

        // Step 2: Extract level IDs
        const levelIds = levels.map((lvl) => lvl.id).filter(Boolean);

        // Step 3: Fetch containers currently stored at these level IDs
        const { data: containersData, error: containersErr } = await supabase
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

        if (containersErr) throw containersErr;

        if (isMounted) {
          setStoredContainers(containersData || []);
        }
      } catch (err) {
        console.error("Error loading FSA containers:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContainers();

    return () => {
      isMounted = false;
    };
  }, [fsaDbId, JSON.stringify(item?.rack_levels)]);

  // Container Box Layout Constants
  const BOX_MAX_WIDTH = 52;
  const BOX_HEIGHT = 32;
  const GAP_X = 6;
  const GAP_Y = 5;
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
        viewBox="0 0 450 470"
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
        `}</style>

        {/* Floor Shelf Base */}
        <rect
          className="levels"
          x="10"
          y={floorY}
          width="422"
          height="20"
          rx="4"
          fill={fill2}
          opacity="0.8"
        />

        {/* Dynamic Compartment Divider Tags */}
        <CompartmentTag
          count={level1Compartments}
          shelfX={shelfX}
          shelfWidth={shelfWidth}
          y={floorY}
          height={8}
        />

        {/* Architectural Support Legs */}
        <rect x="10" y={floorY} width="12" height="50" rx="6" fill={fill} />
        <rect x="420" y={floorY} width="12" height="50" rx="6" fill={fill} />

        {/* Containers Stacking: Left -> Right, Bottom -> Top */}
        {storedContainers.map((cLoc, cIdx) => {
          const colIdx = cIdx % maxCols;
          const rowIdx = Math.floor(cIdx / maxCols);

          const boxX = PADDING_LEFT + colIdx * (BOX_MAX_WIDTH + GAP_X);
          // Stack upward from floorY
          const boxY = floorY - (rowIdx + 1) * BOX_HEIGHT - rowIdx * GAP_Y - 2;

          const barcode =
            cLoc.containers?.barcode ||
            cLoc.container_id?.slice(0, 6) ||
            "BOX";

          return (
            <g key={cLoc.id || cIdx} className="cursor-pointer">
              <title>
                {`FSA Area: ${rackLabel}\nBarcode: ${barcode}\nPlaced: ${
                  cLoc.placed_at
                    ? new Date(cLoc.placed_at).toLocaleString()
                    : "N/A"
                }`}
              </title>
              <rect
                x={boxX}
                y={boxY}
                width={BOX_MAX_WIDTH}
                height={BOX_HEIGHT}
                rx="4"
                fill="#2563EB"
                stroke="#1D4ED8"
                strokeWidth="1.5"
              />
              <text
                x={boxX + BOX_MAX_WIDTH / 2}
                y={boxY + BOX_HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="container-text select-none pointer-events-none"
                style={{ fontSize: "9px" }}
              >
                {barcode.length > 7 ? `${barcode.slice(0, 5)}…` : barcode}
              </text>
            </g>
          );
        })}

        {/* Empty State Tag if no stored containers */}
        {!loading && storedContainers.length === 0 && (
          <text
            x="225"
            y={floorY - 40}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="12"
            fontWeight="500"
            className="select-none"
          >
            FSA Floor Vacant (No Containers)
          </text>
        )}

        {children}
      </svg>
    </div>
  );
};

export default FSADetailView;