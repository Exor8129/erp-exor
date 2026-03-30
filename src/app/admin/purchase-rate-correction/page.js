"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Table,
  InputNumber,
  Button,
  message,
  Select,
  Typography,
  Modal,
  Tag,
  Input,
} from "antd";
import { supabase } from "../../lib/supabase";

const { Text } = Typography;

export default function RateUpdatePage() {
  const [cycleId, setCycleId] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [data, setData] = useState([]);
  const [rateMap, setRateMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  // -----------------------------
  // FETCH CYCLES
  // -----------------------------
  const fetchCycles = async () => {
    const { data } = await supabase
      .from("count_cycles")
      .select("id")
      .order("id", { ascending: false });

    setCycles(data || []);
  };

  // -----------------------------
  // FETCH ALL ITEMS (IMPORTANT CHANGE)
  // -----------------------------
  const fetchItems = async (cycleId) => {
    if (!cycleId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("cycle_items")
        .select(
          `
          id,
          sl_no,
          item_id,
          count_batch_no,
          sys_batch_no,
          rate,
          item_master(item_name)
        `,
        )
        .eq("cycle_id", cycleId);

      if (error) throw error;

      // Normalize batch
      const normalized = (data || []).map((row) => ({
        ...row,
        batch: row.count_batch_no || row.sys_batch_no || "NO BATCH",
      }));

      processData(normalized);
    } catch (err) {
      console.error(err);
      message.error("Failed to load data ❌");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // MAIN LOGIC (🔥 CORE)
  // -----------------------------
  const processData = (rows) => {
    const grouped = {};
    const newRateMap = {};
    const finalRows = [];

    // Group by item
    rows.forEach((row) => {
      if (!grouped[row.item_id]) {
        grouped[row.item_id] = [];
      }
      grouped[row.item_id].push(row);
    });

    Object.values(grouped).forEach((items) => {
      const rates = items.map((i) => i.rate).filter((r) => r && r > 0);

      const uniqueRates = [...new Set(rates)];

      // CASE 1: Same rate exists → auto-fill
      if (rates.length > 0 && uniqueRates.length === 1) {
        const autoRate = uniqueRates[0];

        items.forEach((row) => {
          if (!row.rate || row.rate === 0) {
            const key = `${row.item_id}_${row.batch}`;
            newRateMap[key] = autoRate;

            finalRows.push({
              ...row,
              suggestedRate: autoRate,
              status: "auto",
            });
          }
        });
      }

      // CASE 2: Multiple different rates → ask user
      else if (uniqueRates.length > 1) {
        items.forEach((row) => {
          if (!row.rate || row.rate === 0) {
            finalRows.push({
              ...row,
              suggestedRate: null,
              status: "conflict",
              rateOptions: uniqueRates,
            });
          }
        });

        // Show modal ONCE per item
        Modal.confirm({
          title: "Multiple Rates Found",
          content: `${items[0]?.item_master?.item_name} has different batch rates (${uniqueRates.join(
            ", ",
          )}). Please choose manually.`,
        });
      }

      // CASE 3: No rate anywhere
      else {
        items.forEach((row) => {
          if (!row.rate || row.rate === 0) {
            finalRows.push({
              ...row,
              suggestedRate: null,
              status: "manual",
            });
          }
        });
      }
    });

    setRateMap(newRateMap);
    setData(finalRows);
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    if (cycleId) {
      fetchItems(cycleId);
    }
  }, [cycleId]);

  // -----------------------------
  // HANDLE INPUT CHANGE
  // -----------------------------
  const handleRateChange = (record, value) => {
    const key = `${record.item_id}_${record.batch}`;
    setRateMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // -----------------------------
  // SAVE SINGLE
  // -----------------------------
  const handleSave = async (record) => {
    try {
      const key = `${record.item_id}_${record.batch}`;
      const rate = rateMap[key];

      if (!rate || rate <= 0) {
        message.warning("Enter valid rate");
        return;
      }

      const { error } = await supabase.rpc("update_purchase_rate", {
        p_item_id: record.item_id,
        p_batch: record.batch,
        p_rate: rate,
      });

      if (error) throw error;

      message.success("Rate updated ✅");

      setData((prev) =>
        prev.filter(
          (r) => !(r.item_id === record.item_id && r.batch === record.batch),
        ),
      );
    } catch (err) {
      console.error(err);
      message.error("Update failed ❌");
    }
  };

  // -----------------------------
  // BULK SAVE
  // -----------------------------
  const handleBulkSave = async () => {
    try {
      const entries = Object.entries(rateMap);

      if (entries.length === 0) {
        message.warning("No rates entered");
        return;
      }

      message.loading({ content: "Updating...", key: "bulk" });

      for (const [key, rate] of entries) {
        const [item_id, batch] = key.split("_");

        await supabase.rpc("update_purchase_rate", {
          p_item_id: Number(item_id),
          p_batch: batch,
          p_rate: rate,
        });
      }

      message.success({ content: "All rates updated ✅", key: "bulk" });

      setRateMap({});
      fetchItems(cycleId);
    } catch (err) {
      console.error(err);
      message.error({ content: "Bulk update failed ❌", key: "bulk" });
    }
  };

  const filteredData = data.filter((row) => {
    const itemName = row.item_master?.item_name?.toLowerCase() || "";
    const slNo = String(row.sl_no || "");

    return (
      itemName.includes(searchText.toLowerCase()) || slNo.includes(searchText)
    );
  });

  // -----------------------------
  // TABLE COLUMNS
  // -----------------------------
  const columns = [
    {
      title: "SL No",
      dataIndex: "sl_no",
      width: 80,
    },
    {
      title: "Item Name",
      render: (_, r) => r.item_master?.item_name || "-",
    },
    {
      title: "Batch",
      dataIndex: "batch",
    },
    {
      title: "Current Rate",
      render: (_, r) => <Text type="danger">{r.rate || 0}</Text>,
    },
    {
      title: "Suggested",
      render: (_, r) => {
        if (r.status === "auto") {
          return <Tag color="green">{r.suggestedRate}</Tag>;
        }
        if (r.status === "conflict") {
          return (
            <Select
              placeholder="Select"
              style={{ width: 100 }}
              onChange={(val) => handleRateChange(r, val)}
              options={(r.rateOptions || []).map((v) => ({
                label: v,
                value: v,
              }))}
            />
          );
        }
        return <Text type="warning">Manual</Text>;
      },
    },
    {
      title: "Enter Rate",
      render: (_, record) => (
        <InputNumber
          min={0}
          style={{ width: "100%" }}
          placeholder="Enter rate"
          value={rateMap[`${record.item_id}_${record.batch}`]}
          onChange={(val) => handleRateChange(record, val)}
        />
      ),
    },
    {
      title: "Action",
      render: (_, record) => (
        <Button type="primary" onClick={() => handleSave(record)}>
          Save
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card title="Update Purchase Rates (Smart System)">
        <Select
          style={{ width: "100%", marginBottom: 12 }}
          placeholder="Select Cycle"
          value={cycleId}
          onChange={(val) => setCycleId(val)}
          options={cycles.map((c) => ({
            value: c.id,
            label: `Cycle #${c.id}`,
          }))}
        />

        <div style={{ marginBottom: 10, textAlign: "right" }}>
          <Button type="primary" onClick={handleBulkSave}>
            💾 Save All
          </Button>
        </div>
        
        <Input.Search
          placeholder="Search by Item / SL No"
          allowClear
          enterButton
          style={{ width: 350, marginBottom: 10 }}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey={(r) => `${r.item_id}_${r.batch}`}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
