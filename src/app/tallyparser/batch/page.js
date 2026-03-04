"use client";

import { useEffect, useState, useMemo } from "react";
import { Table, Input } from "antd";

export default function TallyBatchPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/tally/item-batch");
        const data = await res.json();
        setItems(data.items || []);
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // ✅ FILTER DATA BASED ON SEARCH
  const filteredData = useMemo(() => {
    return items.filter((item) => {
      const searchValue = search.toLowerCase();

      return (
        item.item_name?.toLowerCase().includes(searchValue) ||
        item.voucher_type?.toLowerCase().includes(searchValue) ||
        item.batch_name?.toLowerCase().includes(searchValue) ||
        item.godown?.toLowerCase().includes(searchValue)
      );
    });
  }, [items, search]);

  const columns = [
    {
      title: "Item Name",
      dataIndex: "item_name",
      key: "item_name",
    },
    {
      title: "Date",
      dataIndex: "voucher_date",
      key: "voucher_date",
    },
    {
      title: "Voucher Type",
      dataIndex: "voucher_type",
      key: "voucher_type",
    },
    {
      title: "Godown",
      dataIndex: "godown",
      key: "godown",
    },
    {
      title: "Batch Name",
      dataIndex: "batch_name",
      key: "batch_name",
    },
    {
      title: "Billed Qty",
      dataIndex: "billed_qty",
      key: "billed_qty",
    },
    {
      title: "Actual Qty",
      dataIndex: "actual_qty",
      key: "actual_qty",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2>Voucher Based Batch Transactions</h2>

      {/* ✅ SEARCH INPUT */}
      <Input
        placeholder="Search by item, voucher, batch, godown..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, width: 400 }}
        allowClear
      />

      <Table
        columns={columns}
        dataSource={filteredData.map((item, index) => ({
          ...item,
          key: index,
        }))}
        loading={loading}
        bordered
      />
    </div>
  );
}