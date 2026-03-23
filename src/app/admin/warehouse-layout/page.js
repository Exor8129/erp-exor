"use client";

import { useEffect, useState } from "react";
import { Card, Select, Row, Col, Spin } from "antd";
import { supabase } from "@/app/lib/supabase";

export default function WarehouseLayouts() {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  const [racks, setRacks] = useState([]);
  const [fsa, setFsa] = useState([]);

  const [loading, setLoading] = useState(false);

  // ✅ Fetch Warehouses
  const fetchWarehouses = async () => {
    const { data, error } = await supabase
      .from("warehouses")
      .select("id, name, code")
      .order("code");

    if (!error) setWarehouses(data || []);
  };

  // ✅ Fetch Layout
  const fetchLayout = async (warehouseId) => {
    setLoading(true);

    // ❌ Removed string ordering from query
    const { data: rackData } = await supabase
      .from("racks")
      .select("*")
      .eq("warehouse_id", warehouseId);

    const { data: fsaData } = await supabase
      .from("floor_stack_areas")
      .select("*")
      .eq("warehouse_id", warehouseId);

    // ✅ Numeric Sort for Racks (R1, R2, R10 -> correct order)
    const sortedRacks = rackData?.sort((a, b) => {
      const numA = parseInt(a.rack_code.replace(/\D/g, ""), 10);
      const numB = parseInt(b.rack_code.replace(/\D/g, ""), 10);
      return numA - numB;
    });

    // ✅ Numeric Sort for FSA (FSA1, FSA2, FSA10 -> correct order)
    const sortedFsa = fsaData?.sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, ""), 10);
      const numB = parseInt(b.name.replace(/\D/g, ""), 10);
      return numA - numB;
    });

    setRacks(sortedRacks || []);
    setFsa(sortedFsa || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchLayout(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  return (
    <div className="p-8">

      <h1 className="text-2xl font-semibold mb-6">
        Warehouse Layout
      </h1>

      {/* Warehouse Dropdown */}

      <Select
        placeholder="Select Warehouse"
        style={{ width: 300 }}
        options={warehouses.map((w) => ({
          value: w.id,
          label: `${w.code} - ${w.name}`,
        }))}
        onChange={(value) => setSelectedWarehouse(value)}
      />

      {/* Loading Spinner */}

      {loading && (
        <div className="mt-10">
          <Spin />
        </div>
      )}

      {/* Layout View */}

      {!loading && selectedWarehouse && (

        <div className="mt-8 space-y-8">

          {/* RACK SECTION */}

          <Card title="Racks">

            <Row gutter={[16, 16]}>

              {racks.length > 0 ? (
                racks.map((rack) => (
                  <Col key={rack.id} span={4}>
                    <Card
                      size="small"
                      className="text-center cursor-pointer hover:border-blue-500 transition"
                    >
                      {rack.rack_code}
                    </Card>
                  </Col>
                ))
              ) : (
                <p>No racks created</p>
              )}

            </Row>

          </Card>

          {/* FLOOR STACK AREA SECTION */}

          <Card title="Floor Stack Areas">

            <Row gutter={[16, 16]}>

              {fsa.length > 0 ? (
                fsa.map((area) => (
                  <Col key={area.id} span={4}>
                    <Card
                      size="small"
                      className="text-center cursor-pointer hover:border-green-500 transition"
                    >
                      {area.name}
                    </Card>
                  </Col>
                ))
              ) : (
                <p>No floor stack areas</p>
              )}

            </Row>

          </Card>

        </div>
      )}

    </div>
  );
}