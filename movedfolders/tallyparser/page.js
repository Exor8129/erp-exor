"use client";

import { useEffect, useState, useMemo } from "react";
import { Table, Button, message, Input, Tabs, Tag } from "antd";
import { RefreshCcw } from "lucide-react";

const { Search } = Input;

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [changedItems, setChangedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("1");

  /* =========================
     FETCH ALL TALLY ITEMS
  ========================== */
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tally/items");
      const data = await res.json();

      if (res.ok) {
        setItems(data);
      } else {
        message.error(data.error);
      }
    } catch {
      message.error("Cannot connect to Tally");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FETCH NEW / UPDATED ITEMS
  ========================== */
  const fetchChanges = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tally/changes");
      const data = await res.json();

      if (res.ok) {
        setChangedItems(data);
      } else {
        message.error(data.error);
      }
    } catch {
      message.error("Failed to fetch changes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchChanges();
  }, []);

  /* =========================
     SEARCH FILTER
  ========================== */
  const filteredItems = useMemo(() => {
    const source = activeTab === "1" ? items : changedItems;

    if (!searchText) return source;

    return source.filter((item) =>
      Object.values(item)
        .join(" ")
        .toLowerCase()
        .includes(searchText.toLowerCase())
    );
  }, [items, changedItems, searchText, activeTab]);

  /* =========================
     TABLE COLUMNS
  ========================== */
  const baseColumns = [
    { title: "S.No", render: (_, __, index) => index + 1, width: 60 },
    { title: "Item Name", dataIndex: "item_name" },
    { title: "Group", dataIndex: "stock_group" },
    { title: "HSN", dataIndex: "hsn" },
    { title: "GST %", dataIndex: "tax" },
    { title: "MRP", dataIndex: "mrp" },
    { title: "Stock", dataIndex: "current_stock" },
    { title: "Reorder Level", dataIndex: "reorder_level" },
    { title: "UOM", dataIndex: "uom" },
  ];

  const changedColumns = [
    ...baseColumns,
    {
      title: "Change Type",
      dataIndex: "change_type",
      render: (type) =>
        type === "NEW" ? (
          <Tag color="green">NEW</Tag>
        ) : (
          <Tag color="orange">UPDATED</Tag>
        ),
    },
  ];

  /* =========================
     PUSH TO DATABASE
  ========================== */
  const pushToDatabase = async () => {
    console.log("🚀 pushToDatabase triggered");

    try {
      setLoading(true);

      const res = await fetch("/api/tally/sync", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        message.success("Database synced successfully");
        fetchItems();
        fetchChanges();
      } else {
        message.error(data.error || "Sync failed");
      }
    } catch (error) {
      console.log("🔥 Sync error:", error);
      message.error("Sync failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between mb-6 items-center">
        <h1 className="text-2xl font-semibold">
          Items (Live from Tally)
        </h1>

        <div className="flex gap-3">
          <Search
            placeholder="Search item..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />

          <Button
            type="primary"
            icon={<RefreshCcw size={16} />}
            onClick={() => {
              fetchItems();
              fetchChanges();
            }}
            loading={loading}
          >
            Refresh
          </Button>

          <Button
            type="default"
            onClick={pushToDatabase}
            disabled={!changedItems.length}
          >
            Push Changes ({changedItems.length})
          </Button>
        </div>
      </div>

      {/* TABLE WITH TABS */}
      <div className="bg-white p-4 rounded-xl shadow">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "1",
              label: `All Tally Items (${items.length})`,
              children: (
                <Table
                  columns={baseColumns}
                  dataSource={filteredItems}
                  rowKey="item_name"
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: "2",
              label: `New / Updated Items (${changedItems.length})`,
              children: (
                <Table
                  columns={changedColumns}
                  dataSource={filteredItems}
                  rowKey="item_name"
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}