"use client";

import { useEffect, useState } from "react";
import { Select, Card, Collapse, Spin, message } from "antd";
import { supabase } from "@/app/lib/supabase";

const { Panel } = Collapse;

export default function WarehouseLayouts() {

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  const [racks, setRacks] = useState([]);
  const [compartments, setCompartments] = useState([]);
  const [fsa, setFsa] = useState([]);

  const [loading, setLoading] = useState(false);

  // Fetch Warehouses
  const fetchWarehouses = async () => {

    const { data, error } = await supabase
      .from("warehouses")
      .select("id, code, name")
      .order("code");

    if (error) {
      console.error(error);
      message.error("Failed to load warehouses");
    } else {
      setWarehouses(data);
    }
  };

  // Fetch Layout
  const fetchLayout = async (warehouseId) => {

    setLoading(true);

    try {

      const { data: racksData } = await supabase
        .from("racks")
        .select("*")
        .eq("warehouse_id", warehouseId)
        .order("rack_code");

      const rackIds = racksData?.map((r) => r.id) || [];

      const { data: compData } = await supabase
        .from("compartments")
        .select("*")
        .in("rack_id", rackIds);

      const { data: fsaData } = await supabase
        .from("floor_stack_areas")
        .select("*")
        .eq("warehouse_id", warehouseId)
        .order("name");

      setRacks(racksData || []);
      setCompartments(compData || []);
      setFsa(fsaData || []);

    } catch (err) {
      console.error(err);
      message.error("Failed to load layout");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleWarehouseChange = (value) => {
    setSelectedWarehouse(value);
    fetchLayout(value);
  };

  // Build rack structure
  const buildRackLevels = (rackId) => {

    const rackCompartments = compartments.filter(c => c.rack_id === rackId);

    const levels = {};

    rackCompartments.forEach((c) => {

      if (!levels[c.level]) {
        levels[c.level] = [];
      }

      levels[c.level].push(c);

    });

    return levels;
  };

  return (

    <Card title="Warehouse Layout">

      <Select
        style={{ width: 300, marginBottom: 20 }}
        placeholder="Select Warehouse"
        options={warehouses.map((w) => ({
          value: w.id,
          label: `${w.code} - ${w.name}`,
        }))}
        onChange={handleWarehouseChange}
      />

      {loading && <Spin />}

      {!loading && selectedWarehouse && (

        <>

          {/* RACKS */}

          <h3>Racks</h3>

          <Collapse>

            {racks.map((rack) => {

              const levels = buildRackLevels(rack.id);

              return (

                <Panel header={rack.rack_code} key={rack.id}>

                  {Object.keys(levels)
                    .sort((a, b) => a - b)
                    .map((level) => (

                      <div key={level} style={{ marginBottom: 10 }}>

                        <strong>Level {level}</strong>

                        <div style={{ display: "flex", gap: 10, marginTop: 5 }}>

                          {levels[level]
                            .sort((a, b) => a.position - b.position)
                            .map((comp) => (

                              <div
                                key={comp.id}
                                style={{
                                  padding: "6px 10px",
                                  border: "1px solid #ddd",
                                  borderRadius: 4,
                                  background: "#fafafa",
                                }}
                              >
                                {comp.compartment_code}
                              </div>

                            ))}

                        </div>

                      </div>

                    ))}

                </Panel>

              );

            })}

          </Collapse>

          {/* FSA */}

          <h3 style={{ marginTop: 30 }}>Floor Stack Areas</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>

            {fsa.map((area) => (

              <div
                key={area.id}
                style={{
                  padding: "8px 14px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  background: "#f6f6f6",
                }}
              >
                {area.name}
              </div>

            ))}

          </div>

        </>

      )}

    </Card>

  );
}