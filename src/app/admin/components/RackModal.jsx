"use client";

import { Modal, Form, Select, InputNumber, Button, Checkbox, message } from "antd";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function RackModal({ open, onClose }) {

  const [form] = Form.useForm();

  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editLayout, setEditLayout] = useState(false);

  const [existingRacks, setExistingRacks] = useState(0);
  const [existingFSA, setExistingFSA] = useState(0);

  // Fetch warehouses
  const fetchWarehouses = async () => {

    const { data, error } = await supabase
      .from("warehouses")
      .select("id, code, name");

    if (error) {
      console.error(error);
      message.error("Failed to load warehouses");
    } else {
      setWarehouses(data);
    }

  };

  useEffect(() => {

    if (open) {

      fetchWarehouses();

      form.setFieldsValue({
        level_count: 3,
        position_count: 3,
      });

      setEditLayout(false);

    }

  }, [open]);

  // When warehouse selected
  const handleWarehouseChange = async (warehouse_id) => {

    try {

      const { data: racks } = await supabase
        .from("racks")
        .select("id")
        .eq("warehouse_id", warehouse_id);

      const { data: fsa } = await supabase
        .from("floor_stack_areas")
        .select("id")
        .eq("warehouse_id", warehouse_id);

      setExistingRacks(racks ? racks.length : 0);
      setExistingFSA(fsa ? fsa.length : 0);

    } catch (err) {

      console.error(err);

    }

  };

  const handleSubmit = async (values) => {

    try {

      setLoading(true);

      const startRack = existingRacks + 1;

      const racks = [];

      for (let i = 0; i < values.rack_count; i++) {

        racks.push({
          warehouse_id: values.warehouse_id,
          rack_code: `R${startRack + i}`,
          levels: values.level_count,
          compartments_per_level: values.position_count,
        });

      }

      const { data: insertedRacks, error: rackError } = await supabase
        .from("racks")
        .insert(racks)
        .select();

      if (rackError) throw rackError;

      // Generate compartments
      const compartments = [];

      insertedRacks.forEach((rack) => {

        for (let level = 1; level <= values.level_count; level++) {

          for (let pos = 1; pos <= values.position_count; pos++) {

            compartments.push({
              rack_id: rack.id,
              level: level,
              position: pos,
              compartment_code: `${rack.rack_code}-L${level}-P${pos}`,
            });

          }

        }

      });

      if (compartments.length > 0) {

        const { error } = await supabase
          .from("compartments")
          .insert(compartments);

        if (error) throw error;

      }

      // Generate FSA
      const fsa = [];
      const startFSA = existingFSA + 1;

      for (let i = 0; i < values.fsa_count; i++) {

        fsa.push({
          warehouse_id: values.warehouse_id,
          name: `FSA${startFSA + i}`,
        });

      }

      if (fsa.length > 0) {

        const { error } = await supabase
          .from("floor_stack_areas")
          .insert(fsa);

        if (error) throw error;

      }

      message.success("Warehouse layout created");

      form.resetFields();
      onClose();

    } catch (err) {

      console.error(err);
      message.error("Failed to generate layout");

    }

    setLoading(false);

  };

  return (

    <Modal
      open={open}
      title="Generate Warehouse Layout"
      footer={null}
      onCancel={onClose}
      width={500}
    >

      <Form
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
      >

        <Form.Item
          name="warehouse_id"
          label="Select Warehouse"
          rules={[{ required: true }]}
        >
          <Select
            placeholder="Select warehouse"
            onChange={handleWarehouseChange}
            options={warehouses.map((w) => ({
              value: w.id,
              label: `${w.code} - ${w.name}`,
            }))}
          />
        </Form.Item>

        {/* STATUS PANEL */}

        <div
          style={{
            background: "#fafafa",
            padding: 12,
            border: "1px solid #e5e5e5",
            borderRadius: 6,
            marginBottom: 16
          }}
        >

          <div><b>Warehouse Status</b></div>

          <div>Existing Racks : {existingRacks}</div>
          <div>Next Rack Code : R{existingRacks + 1}</div>

          <div style={{ marginTop: 6 }}>
            Existing FSA : {existingFSA}
          </div>

          <div>Next FSA : FSA{existingFSA + 1}</div>

        </div>

        <Form.Item
          name="rack_count"
          label="Number of Racks"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>

        <Checkbox
          checked={editLayout}
          onChange={(e) => setEditLayout(e.target.checked)}
          style={{ marginBottom: 10 }}
        >
          Customize Rack Layout
        </Checkbox>

        <Form.Item
          name="level_count"
          label="Levels per Rack"
        >
          <InputNumber
            min={1}
            disabled={!editLayout}
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          name="position_count"
          label="Compartments per Level"
        >
          <InputNumber
            min={1}
            disabled={!editLayout}
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          name="fsa_count"
          label="Number of Floor Stack Areas"
          initialValue={0}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
        >
          Generate Layout
        </Button>

      </Form>

    </Modal>
  );
}