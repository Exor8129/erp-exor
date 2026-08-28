"use client";

import React, { useEffect, useState } from "react";
import { Select, Typography, Divider, message } from "antd";
import { ShopOutlined } from "@ant-design/icons";

import { supabase } from "../../../lib/supabase";
import MapCanvas from "../components/create-warehouse/MapCanvas";
import RackDetailView from "../components/create-warehouse/RackDetailView";
import SRackDetailView from "../components/create-warehouse/SRackDetailView";
import FSADetailView from "../components/create-warehouse/FSADetailView";

const { Option } = Select;

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);

  // Load warehouses
  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    const { data, error } = await supabase
      .schema("wms")
      .from("warehouses")
      .select("*")
      .order("created_at");

    if (error) {
      message.error(error.message);
      return;
    }

    setWarehouses(data);
  };

  // Load tiers based on warehouse
  const loadTiers = async (warehouseId) => {
    const { data, error } = await supabase
      .schema("wms")
      .from("warehouse_tiers")
      .select("*")
      .eq("warehouse_id", warehouseId)
      .order("tier_number");

    if (error) {
      message.error(error.message);
      return;
    }

    setTiers(data);
  };

  // Load layout elements for tier
  const loadElements = async (tierId) => {
    const { data, error } = await supabase
      .schema("wms")
      .from("warehouse_elements")
      .select("*")
      .eq("tier_id", tierId);

    if (error) {
      message.error(error.message);
      return;
    }

    setElements(data || []);
  };

  return (
    <div className="w-full h-full flex flex-row gap-5 p-5 bg-gray-100 box-border overflow-hidden">
      {/* LEFT AREA: MAP SECTION (Takes up all remaining space) */}
      <div className="flex-1 min-w-0 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Dropdown Header */}
        <div className="p-5 border-b border-gray-100 bg-white shrink-0">
          <div className="grid grid-cols-2 gap-4">
            {/* Warehouse Dropdown */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">
                Select Warehouse
              </label>
              <Select
                className="w-full"
                placeholder="Choose Warehouse"
                value={selectedWarehouse?.id}
                onChange={async (id) => {
                  const warehouse = warehouses.find((w) => w.id === id);
                  setSelectedWarehouse(warehouse);
                  setSelectedTier(null);
                  setElements([]);
                  await loadTiers(id);
                }}
              >
                {warehouses.map((wh) => (
                  <Option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </Option>
                ))}
              </Select>
            </div>

            {/* Tier Dropdown */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">
                Select Tier
              </label>
              <Select
                className="w-full"
                placeholder="Choose Tier"
                value={selectedTier?.id}
                disabled={!selectedWarehouse}
                onChange={async (id) => {
                  const tier = tiers.find((t) => t.id === id);
                  setSelectedTier(tier);
                  await loadElements(id);
                }}
              >
                {tiers.map((tier) => (
                  <Option key={tier.id} value={tier.id}>
                    {tier.name}
                  </Option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* MAP CANVAS PANEL */}
        <div className="flex-1 min-h-0 bg-gray-200 relative">
          {selectedTier ? (
            <MapCanvas
              warehouse={selectedWarehouse}
              tier={selectedTier}
              elements={elements}
              onElementSelect={(element) => setSelectedElement(element)}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              Select warehouse and tier to view layout
            </div>
          )}
        </div>
      </div>

      {/* RIGHT AREA: DETAILS SECTION (Fixed Width, Side-by-Side) */}
      <div className="w-115 shrink-0 flex flex-col bg-white border border-gray-200 rounded-xl p-5 shadow-sm overflow-y-auto">
        <h3 className="font-semibold text-gray-800 text-sm border-b border-gray-100 pb-3 mb-4 shrink-0">
          Details
        </h3>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!selectedElement && (
            <div className="flex h-full items-center justify-center text-gray-400">
              Select a rack to view details
            </div>
          )}

          {selectedElement?.type === "rack" && (
            <RackDetailView item={selectedElement} />
          )}

          {selectedElement?.type === "srack" && (
            <SRackDetailView item={selectedElement} />
          )}

          {selectedElement?.type === "fsa" && (
            <FSADetailView item={selectedElement} />
          )}
        </div>
      </div>
    </div>
  );
}
