"use client";

import React, { useEffect, useState } from "react";
import { Select, Typography, Divider, message } from "antd";
import { ShopOutlined } from "@ant-design/icons";

import { supabase } from "../../../lib/supabase";
import MapCanvas from "../components/create-warehouse/MapCanvas";

const { Option } = Select;

export default function Warehouse() {
  const [warehouses, setWarehouses] = useState([]);

  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  const [tiers, setTiers] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);

  const [elements, setElements] = useState([]);

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
   <div className="w-full h-full flex bg-gray-100 overflow-hidden rounded-4xl">
      {/* LEFT 70% AREA */}
      <div className="basis-[80%] flex flex-col bg-white border-r overflow-hidden">
        <div className="h-16 px-6 flex items-center border-b">
          <Typography.Title level={4} style={{ margin: 0 }}>
            <ShopOutlined />
            &nbsp; Warehouse Viewer
          </Typography.Title>
        </div>

        {/* Dropdown Section */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Warehouse Dropdown */}
            <div>
              <label className="text-xs text-gray-500">Select Warehouse</label>

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
              <label className="text-xs text-gray-500">Select Tier</label>

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

        <Divider className="my-0" />

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-200">
          {selectedTier ? (
            <MapCanvas
              warehouse={selectedWarehouse}
              tier={selectedTier}
              elements={elements}
              onElementSelect={() => {}}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select warehouse and tier to view layout
            </div>
          )}
        </div>
      </div>

     
      {/* RIGHT DETAILS AREA */}
<div className="basis-[20%] bg-white overflow-hidden">
        <div className="p-5">
          <Typography.Title level={5}>Warehouse Details</Typography.Title>

          <p className="text-gray-400 text-sm">
            Details panel will be added here
          </p>
        </div>
      </div>
    </div>
  );
}
