"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Input,
  DatePicker,
  Select,
  Radio,
  Space,
  Button,
  Typography,
  Alert,
  message,
  Tag,
} from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const { Title, Text } = Typography;

export default function YearEndInitiatePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [cycleCreated, setCycleCreated] = useState(false);
  const [cycleData, setCycleData] = useState(null);

  const [form, setForm] = useState({
    name: "",
    date: dayjs(),
    financial_year: "",
    scope: "all",
    warehouses: [],
  });

  const [totalItems, setTotalItems] = useState(0);

  // 🔹 Auto FY Name
  useEffect(() => {
    const today = dayjs();
    const year = today.year();
    const month = today.month() + 1;

    let startYear, endYear;

    if (month >= 4) {
      startYear = year;
      endYear = year + 1;
    } else {
      startYear = year - 1;
      endYear = year;
    }

    setForm((prev) => ({
      ...prev,
      name: `FY-${startYear}-${endYear}`,
      financial_year: `${startYear}-${endYear}`,
    }));
  }, []);

  // 🔹 Fetch item count
  const fetchItemCount = async () => {
    try {
      let query = supabase.from("item_master").select("id", { count: "exact" });

      if (form.scope === "warehouse" && form.warehouses.length > 0) {
        query = query.in("warehouse_id", form.warehouses);
      }

      const { count, error } = await query;
      if (error) throw error;

      setTotalItems(count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchItemCount();
  }, [form.scope, form.warehouses]);

  // 🔹 CREATE CYCLE ID
  const handleCreateCycle = async () => {
    if (!form.name) {
      message.error("Please enter count name");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Check active cycle
      const { data: activeCycles, error: checkError } = await supabase
        .from("count_cycles")
        .select("id, cycle_number, status")
        .eq("cycle_name", form.name)
        .eq("cycle_type", "year_end")
        .neq("status", "closed");

      if (checkError) throw checkError;

      if (activeCycles && activeCycles.length > 0) {
        const active = activeCycles[0];
        message.error(
          `Cycle ${active.cycle_number} is still active. Close it first.`
        );
        return;
      }

      // 2️⃣ Get last cycle number
      const { data: lastCycle } = await supabase
        .from("count_cycles")
        .select("cycle_number")
        .eq("cycle_name", form.name)
        .eq("cycle_type", "year_end")
        .order("cycle_number", { ascending: false })
        .limit(1);

      const lastNumber =
        lastCycle && lastCycle.length > 0
          ? lastCycle[0].cycle_number
          : 0;

      const nextNumber = lastNumber + 1;

      // 3️⃣ Insert new cycle
      const { data, error } = await supabase
        .from("count_cycles")
        .insert([
          {
            cycle_name: form.name,
            cycle_type: "year_end",
            cycle_number: nextNumber,
            status: "active",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setCycleData(data);
      setCycleCreated(true);

      message.success(`Cycle Created (No: ${nextNumber})`);
    } catch (err) {
      console.error(err);
      message.error("Failed to create cycle");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 INITIATE COUNT
const handleInitiate = async () => {
  if (!cycleData) {
    message.error("Create Cycle ID first");
    return;
  }

  setLoading(true);

  try {
    const { error } = await supabase.rpc("initiate_year_end_cycle", {
      p_cycle_id: cycleData.id,
    });

    if (error) throw error;

    message.success("Cycle Items Created Successfully");

    // optional
    // router.push(`/admin/yearend/${cycleData.id}`);
  } catch (err) {
    console.error(err);
    message.error("Failed to initiate count");
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <Title level={3}>Year-End Stock Count</Title>

      <Alert
        type="warning"
        message="Stock movement may be restricted after initiation."
        style={{ marginTop: 16 }}
      />

      {/* SESSION */}
      <Card title="Session Details" style={{ marginTop: 16 }}>
        {cycleCreated && cycleData && (
          <div style={{ marginBottom: 12, padding: 10, background: "#fafafa" }}>
            <Row justify="space-between">
              <Col>
                <Text strong>Cycle ID: #{cycleData.id}</Text>
                <div>Cycle No: {cycleData.cycle_number}</div>
              </Col>
              <Tag color="orange">ACTIVE</Tag>
            </Row>
          </div>
        )}

        <Row gutter={16}>
          <Col span={8}>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <Button
              type="primary"
              style={{ marginTop: 12 }}
              onClick={handleCreateCycle}
              loading={loading}
            >
              Create Cycle ID
            </Button>
          </Col>

          <Col span={8}>
            <DatePicker value={form.date} disabled style={{ width: "100%" }} />
          </Col>
        </Row>
      </Card>

      {/* SCOPE */}
      <Card title="Scope Selection" style={{ marginTop: 16 }}>
        {cycleCreated && (
          <div style={{ marginBottom: 10 }}>
            <Tag color="blue">Cycle #{cycleData?.cycle_number}</Tag>
          </div>
        )}

        <div
          style={{
            pointerEvents: cycleCreated ? "auto" : "none",
            opacity: cycleCreated ? 1 : 0.5,
          }}
        >
          <Radio.Group
            value={form.scope}
            onChange={(e) =>
              setForm({ ...form, scope: e.target.value })
            }
          >
            <Space direction="vertical">
              <Radio value="all">All Products</Radio>
              <Radio value="warehouse">By Warehouse</Radio>
            </Space>
          </Radio.Group>
        </div>

        {form.scope === "warehouse" && (
          <Select
            mode="multiple"
            style={{ width: "100%", marginTop: 12 }}
            value={form.warehouses}
            onChange={(v) =>
              setForm({ ...form, warehouses: v })
            }
            options={[
              { label: "Main Warehouse", value: "main" },
              { label: "Godown 1", value: "godown-1" },
            ]}
          />
        )}
      </Card>

      {/* SUMMARY */}
      <Card style={{ marginTop: 16 }}>
        <Row justify="space-between">
          <Text strong>Total Items: {totalItems}</Text>

          <Button
            type="primary"
            onClick={handleInitiate}
            disabled={!cycleCreated}
            loading={loading}
          >
            Initiate Count
          </Button>
        </Row>
      </Card>
    </div>
  );
}