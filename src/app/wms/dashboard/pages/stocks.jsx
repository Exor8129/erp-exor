"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Card,
  Input,
  Select,
  Tag,
  Button,
  Statistic,
  Badge,
  Tooltip,
  Space,
  Drawer,
  Spin,
  Row,
  Col,
  Progress,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  InboxOutlined,
  EnvironmentOutlined,
  BarcodeOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  FilterOutlined,
  EyeOutlined,
  AppstoreOutlined,
  GoldOutlined,
} from "@ant-design/icons";

// Mock Data featuring 5 Products with Single and Mixed-Batch Containers (C001 - C005)
const MOCK_INVENTORY_DATA = [
  // --- PRODUCT 1: Complex Multi-Batch Scenario (C001 to C005) ---
  {
    id: "bal-001",
    batch_id: "B1",
    status: "AVAILABLE",
    qty: 200,
    updated_at: "2026-08-20T10:00:00Z",
    grn_items: {
      id: "grn-101",
      purchase_order_items: {
        product_code: "PROD-A001",
        product_name: "Surgical Gloves Latex (M)",
        unit: "Boxes",
        unit_price: 250.0,
      },
    },
    containers: { id: "c1", barcode: "C001" },
    rack_levels: { id: "r1", barcode: "RACK-A1-L01", level_index: 1 },
  },
  {
    id: "bal-002",
    batch_id: "B2",
    status: "AVAILABLE",
    qty: 150,
    updated_at: "2026-08-20T10:15:00Z",
    grn_items: {
      id: "grn-101",
      purchase_order_items: {
        product_code: "PROD-A001",
        product_name: "Surgical Gloves Latex (M)",
        unit: "Boxes",
        unit_price: 250.0,
      },
    },
    containers: { id: "c2", barcode: "C002" },
    rack_levels: { id: "r2", barcode: "RACK-A1-L02", level_index: 2 },
  },
  {
    id: "bal-003",
    batch_id: "B3",
    status: "AVAILABLE",
    qty: 300,
    updated_at: "2026-08-20T11:00:00Z",
    grn_items: {
      id: "grn-101",
      purchase_order_items: {
        product_code: "PROD-A001",
        product_name: "Surgical Gloves Latex (M)",
        unit: "Boxes",
        unit_price: 250.0,
      },
    },
    containers: { id: "c3", barcode: "C003" },
    rack_levels: { id: "r3", barcode: "RACK-A2-L01", level_index: 1 },
  },
  // C004: Mixed (B1 + B2)
  {
    id: "bal-004",
    batch_id: "B1",
    status: "AVAILABLE",
    qty: 100,
    updated_at: "2026-08-21T09:00:00Z",
    grn_items: {
      id: "grn-101",
      purchase_order_items: {
        product_code: "PROD-A001",
        product_name: "Surgical Gloves Latex (M)",
        unit: "Boxes",
        unit_price: 250.0,
      },
    },
    containers: { id: "c4", barcode: "C004" },
    rack_levels: { id: "r4", barcode: "RACK-B1-L03", level_index: 3 },
  },
  {
    id: "bal-005",
    batch_id: "B2",
    status: "AVAILABLE",
    qty: 150,
    updated_at: "2026-08-21T09:00:00Z",
    grn_items: {
      id: "grn-101",
      purchase_order_items: {
        product_code: "PROD-A001",
        product_name: "Surgical Gloves Latex (M)",
        unit: "Boxes",
        unit_price: 250.0,
      },
    },
    containers: { id: "c4", barcode: "C004" },
    rack_levels: { id: "r4", barcode: "RACK-B1-L03", level_index: 3 },
  },
  // C005: Mixed (B1 + B2 + B3)
  {
    id: "bal-006",
    batch_id: "B1",
    status: "AVAILABLE",
    qty: 100,
    updated_at: "2026-08-22T08:30:00Z",
    grn_items: {
      id: "grn-101",
      purchase_order_items: {
        product_code: "PROD-A001",
        product_name: "Surgical Gloves Latex (M)",
        unit: "Boxes",
        unit_price: 250.0,
      },
    },
    containers: { id: "c5", barcode: "C005" },
    rack_levels: { id: "r5", barcode: "RACK-C3-L02", level_index: 2 },
  },
  {
    id: "bal-007",
    batch_id: "B2",
    status: "AVAILABLE",
    qty: 100,
    updated_at: "2026-08-22T08:30:00Z",
    grn_items: {
      id: "grn-101",
      purchase_order_items: {
        product_code: "PROD-A001",
        product_name: "Surgical Gloves Latex (M)",
        unit: "Boxes",
        unit_price: 250.0,
      },
    },
    containers: { id: "c5", barcode: "C005" },
    rack_levels: { id: "r5", barcode: "RACK-C3-L02", level_index: 2 },
  },
  {
    id: "bal-008",
    batch_id: "B3",
    status: "AVAILABLE",
    qty: 150,
    updated_at: "2026-08-22T08:30:00Z",
    grn_items: {
      id: "grn-101",
      purchase_order_items: {
        product_code: "PROD-A001",
        product_name: "Surgical Gloves Latex (M)",
        unit: "Boxes",
        unit_price: 250.0,
      },
    },
    containers: { id: "c5", barcode: "C005" },
    rack_levels: { id: "r5", barcode: "RACK-C3-L02", level_index: 2 },
  },

  // --- PRODUCT 2 ---
  {
    id: "bal-009",
    batch_id: "LOT-2026X",
    status: "AVAILABLE",
    qty: 8, // Low Stock Trigger
    updated_at: "2026-08-19T14:20:00Z",
    grn_items: {
      id: "grn-102",
      purchase_order_items: {
        product_code: "PROD-B002",
        product_name: "Digital Syringe Pump X1",
        unit: "Units",
        unit_price: 18500.0,
      },
    },
    containers: { id: "c6", barcode: "C006" },
    rack_levels: { id: "r6", barcode: "RACK-A1-L01", level_index: 1 },
  },

  // --- PRODUCT 3 ---
  {
    id: "bal-010",
    batch_id: "BT-990",
    status: "QUARANTINE",
    qty: 50,
    updated_at: "2026-08-21T16:00:00Z",
    grn_items: {
      id: "grn-103",
      purchase_order_items: {
        product_code: "PROD-C003",
        product_name: "Infusion Sets IV Tubing",
        unit: "Packs",
        unit_price: 120.0,
      },
    },
    containers: { id: "c7", barcode: "C007" },
    rack_levels: { id: "r7", barcode: "RACK-D1-L01", level_index: 1 },
  },

  // --- PRODUCT 4 ---
  {
    id: "bal-011",
    batch_id: "MED-88",
    status: "RESERVED",
    qty: 400,
    updated_at: "2026-08-18T11:10:00Z",
    grn_items: {
      id: "grn-104",
      purchase_order_items: {
        product_code: "PROD-D004",
        product_name: "N95 Respirator Masks",
        unit: "Pcs",
        unit_price: 45.0,
      },
    },
    containers: { id: "c8", barcode: "C008" },
    rack_levels: { id: "r8", barcode: "RACK-B2-L02", level_index: 2 },
  },

  // --- PRODUCT 5 ---
  {
    id: "bal-012",
    batch_id: "DMG-01",
    status: "DAMAGED",
    qty: 5,
    updated_at: "2026-08-15T09:40:00Z",
    grn_items: {
      id: "grn-105",
      purchase_order_items: {
        product_code: "PROD-E005",
        product_name: "ECG Electrode Sensors",
        unit: "Boxes",
        unit_price: 650.0,
      },
    },
    containers: { id: "c9", barcode: "C009" },
    rack_levels: { id: "r9", barcode: "RACK-Z1-L01", level_index: 1 },
  },
];

export default function InventoryStockDashboard() {
  const [loading, setLoading] = useState(false);
  const [rawInventory, setRawInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedLocation, setSelectedLocation] = useState("ALL");
  const [locationsList, setLocationsList] = useState([]);

  // Drawer state for item details
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedProductRecord, setSelectedProductRecord] = useState(null);

  // Mock Fetch
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setTimeout(() => {
      setRawInventory(MOCK_INVENTORY_DATA);

      const locs = new Set();
      MOCK_INVENTORY_DATA.forEach((row) => {
        const locCode = row.rack_levels?.barcode;
        if (locCode) locs.add(locCode);
      });
      setLocationsList(Array.from(locs));
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Aggregate Raw Rows into Product Groups with Multi-Batch Container Trees
  const groupedInventory = useMemo(() => {
    const productsMap = {};

    rawInventory.forEach((row) => {
      const poItem = row.grn_items?.purchase_order_items;
      const productCode = poItem?.product_code || "UNKNOWN";
      const containerBarcode = row.containers?.barcode || "UNPACKED";

      // 1. Initialize Product Group
      if (!productsMap[productCode]) {
        productsMap[productCode] = {
          key: productCode,
          product_code: productCode,
          product_name: poItem?.product_name || "N/A",
          unit: poItem?.unit || "Pcs",
          unit_price: Number(poItem?.unit_price || 0),
          total_qty: 0,
          total_valuation: 0,
          batches_set: new Set(),
          status_set: new Set(),
          locations_set: new Set(),
          containersMap: {},
        };
      }

      const prod = productsMap[productCode];
      const qty = Number(row.qty || 0);

      prod.total_qty += qty;
      prod.total_valuation += qty * prod.unit_price;
      if (row.batch_id) prod.batches_set.add(row.batch_id);
      if (row.status) prod.status_set.add(row.status);
      if (row.rack_levels?.barcode) prod.locations_set.add(row.rack_levels.barcode);

      // 2. Aggregate Containers within Product Group
      if (!prod.containersMap[containerBarcode]) {
        prod.containersMap[containerBarcode] = {
          id: row.containers?.id || containerBarcode,
          barcode: containerBarcode,
          location: row.rack_levels?.barcode || "Unallocated",
          level_index: row.rack_levels?.level_index || 0,
          status: row.status,
          updated_at: row.updated_at,
          total_container_qty: 0,
          batches: [],
        };
      }

      const container = prod.containersMap[containerBarcode];
      container.total_container_qty += qty;
      container.batches.push({
        batch_id: row.batch_id || "NO-BATCH",
        qty: qty,
        status: row.status,
      });
    });

    // Transform Map into nested array structures
    return Object.values(productsMap).map((prod) => ({
      ...prod,
      batches_summary: Array.from(prod.batches_set),
      statuses: Array.from(prod.status_set),
      locations: Array.from(prod.locations_set),
      containers: Object.values(prod.containersMap).map((c) => ({
        ...c,
        is_mixed: c.batches.length > 1,
      })),
    }));
  }, [rawInventory]);

  // Search & Filter Applied on Aggregated Model
  const filteredProducts = useMemo(() => {
    return groupedInventory.filter((prod) => {
      const search = searchQuery.toLowerCase();
      const pName = prod.product_name.toLowerCase();
      const pCode = prod.product_code.toLowerCase();
      const batchesStr = prod.batches_summary.join(" ").toLowerCase();
      const containersStr = prod.containers.map((c) => c.barcode).join(" ").toLowerCase();

      const matchesSearch =
        pName.includes(search) ||
        pCode.includes(search) ||
        batchesStr.includes(search) ||
        containersStr.includes(search);

      const matchesStatus =
        statusFilter === "ALL" || prod.statuses.includes(statusFilter);

      const matchesLocation =
        selectedLocation === "ALL" || prod.locations.includes(selectedLocation);

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [groupedInventory, searchQuery, statusFilter, selectedLocation]);

  // Aggregated Header Metrics
  const totalStockQty = useMemo(
    () => filteredProducts.reduce((sum, p) => sum + p.total_qty, 0),
    [filteredProducts]
  );

  const totalValuation = useMemo(
    () => filteredProducts.reduce((sum, p) => sum + p.total_valuation, 0),
    [filteredProducts]
  );

  const handleOpenDrawer = (record) => {
    setSelectedProductRecord(record);
    setDrawerVisible(true);
  };

  // Status Tag Formatter
  const renderStatusTag = (status) => {
    switch (status) {
      case "AVAILABLE":
        return <Tag color="emerald" icon={<CheckCircleOutlined />}>AVAILABLE</Tag>;
      case "QUARANTINE":
        return <Tag color="amber" icon={<ExclamationCircleOutlined />}>QUARANTINE</Tag>;
      case "RESERVED":
        return <Tag color="blue" icon={<InboxOutlined />}>RESERVED</Tag>;
      case "DAMAGED":
        return <Tag color="rose" icon={<ExclamationCircleOutlined />}>DAMAGED</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  // Color generator for batches
  const getBatchTagColor = (batch) => {
    if (batch === "B1") return "blue";
    if (batch === "B2") return "purple";
    if (batch === "B3") return "orange";
    return "geekblue";
  };

  // Expanded Container Breakdown Row Render
  const renderContainerExpandedRow = (productRecord) => {
    const containerColumns = [
      {
        title: "Container Barcode",
        dataIndex: "barcode",
        key: "barcode",
        width: 170,
        render: (barcode, item) => (
          <div className="flex items-center gap-1.5">
            <Tag color="cyan" icon={<InboxOutlined />} className="font-mono text-xs font-bold">
              {barcode}
            </Tag>
            {item.is_mixed && (
              <Tooltip title="Mixed Container (Multiple Batches inside)">
                <Tag color="magenta" className="text-[10px] uppercase font-bold px-1 m-0">
                  MIXED
                </Tag>
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        title: "Rack Location",
        dataIndex: "location",
        key: "location",
        width: 160,
        render: (loc, item) =>
          loc !== "Unallocated" ? (
            <Tag color="purple" icon={<EnvironmentOutlined />} className="font-mono text-xs">
              {loc} (L{item.level_index})
            </Tag>
          ) : (
            <span className="text-amber-600 text-xs font-semibold">Unallocated</span>
          ),
      },
      {
        title: "Batch Breakdown Inside Container",
        key: "batches",
        render: (_, container) => (
          <div className="space-y-1 my-1">
            {container.batches.map((b, idx) => {
              const pct = Math.round((b.qty / container.total_container_qty) * 100);
              return (
                <div key={idx} className="flex items-center gap-2">
                  <Tag
                    color={getBatchTagColor(b.batch_id)}
                    icon={<BarcodeOutlined />}
                    className="font-mono text-xs m-0 min-w-25"
                  >
                    {b.batch_id}
                  </Tag>
                  <div className="flex-1 max-w-45">
                    <Progress
                      percent={pct}
                      size="small"
                      format={() => `${b.qty} ${productRecord.unit} (${pct}%)`}
                      strokeColor={
                        b.batch_id === "B1"
                          ? "#3b82f6"
                          : b.batch_id === "B2"
                          ? "#a855f7"
                          : "#f97316"
                      }
                    />
                  </div>
                  {renderStatusTag(b.status)}
                </div>
              );
            })}
          </div>
        ),
      },
      {
        title: "Container Total",
        dataIndex: "total_container_qty",
        key: "total_container_qty",
        width: 140,
        align: "right",
        render: (qty) => (
          <span className="font-mono font-bold text-slate-800">
            {qty.toLocaleString()} {productRecord.unit}
          </span>
        ),
      },
    ];

    return (
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
            <GoldOutlined /> Container & Multi-Batch Composition Breakdown
          </span>
          <span className="text-xs text-slate-400">
            Containers Assigned: <strong>{productRecord.containers.length}</strong>
          </span>
        </div>
        <Table
          columns={containerColumns}
          dataSource={productRecord.containers}
          rowKey="id"
          pagination={false}
          size="small"
          bordered
        />
      </div>
    );
  };

  // Main Product Parent Columns
  const mainTableColumns = [
    {
      title: "Product Details",
      key: "product",
      width: 260,
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800">{record.product_name}</span>
          <span className="font-mono text-xs text-slate-400">
            Code: {record.product_code}
          </span>
        </div>
      ),
    },
    {
      title: "Batches Present",
      key: "batches",
      width: 180,
      render: (_, record) => (
        <div className="flex flex-wrap gap-1">
          {record.batches_summary.map((batch) => (
            <Tag key={batch} color={getBatchTagColor(batch)} icon={<BarcodeOutlined />} className="font-mono text-xs">
              {batch}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Allocated Containers",
      key: "containers_count",
      width: 150,
      align: "center",
      render: (_, record) => (
        <Badge
          count={`${record.containers.length} Containers`}
          style={{ backgroundColor: "#0284c7" }}
        />
      ),
    },
    {
      title: "Aggregated Stock",
      key: "total_qty",
      width: 160,
      align: "right",
      sorter: (a, b) => a.total_qty - b.total_qty,
      render: (_, record) => {
        const isLow = record.total_qty <= 10;
        return (
          <div className="text-right">
            <span className={`font-mono text-base font-bold ${isLow ? "text-rose-600" : "text-slate-800"}`}>
              {record.total_qty.toLocaleString()}
            </span>{" "}
            <span className="text-xs text-slate-500">{record.unit}</span>
            {isLow && (
              <div>
                <Badge status="error" text="Low Stock" className="text-xs" />
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Status",
      key: "statuses",
      width: 140,
      align: "center",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          {record.statuses.map((st) => (
            <React.Fragment key={st}>{renderStatusTag(st)}</React.Fragment>
          ))}
        </Space>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Tooltip title="View Detailed Breakdown">
          <Button
            type="text"
            icon={<EyeOutlined className="text-blue-600" />}
            onClick={() => handleOpenDrawer(record)}
            size="small"
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4 bg-slate-50 min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AppstoreOutlined className="text-blue-600" /> Inventory & Multi-Batch Balance
          </h1>
          <p className="text-xs text-slate-500">
            Real-time multi-batch balance across containers, racks, and lots.
          </p>
        </div>
        <Button
          type="default"
          icon={<ReloadOutlined />}
          onClick={fetchInventory}
          loading={loading}
          className="self-start md:self-auto"
        >
          Refresh Data
        </Button>
      </div>

      {/* METRIC CARDS */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small" className="border-slate-200 shadow-xs">
            <Statistic
              title={<span className="text-xs text-slate-500">Total Products in View</span>}
              value={filteredProducts.length}
              prefix={<AppstoreOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" className="border-slate-200 shadow-xs">
            <Statistic
              title={<span className="text-xs text-slate-500">Aggregated Stock Quantity</span>}
              value={totalStockQty}
              precision={0}
              valueStyle={{ color: "#0f172a" }}
              prefix={<InboxOutlined className="text-emerald-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" className="border-slate-200 shadow-xs">
            <Statistic
              title={<span className="text-xs text-slate-500">Est. Stock Valuation</span>}
              value={totalValuation}
              precision={2}
              prefix="₹"
              valueStyle={{ color: "#2563eb" }}
            />
          </Card>
        </Col>
      </Row>

      {/* SEARCH AND FILTERS */}
      <Card size="small" className="border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search by Product Name, Code, Batch ID (B1, B2), or Container (C001-C005)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            className="flex-1 w-full"
          />

          <Space className="w-full md:w-auto flex-wrap">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 160 }}
              prefix={<FilterOutlined className="text-slate-400" />}
              options={[
                { label: "All Statuses", value: "ALL" },
                { label: "Available", value: "AVAILABLE" },
                { label: "Quarantine", value: "QUARANTINE" },
                { label: "Reserved", value: "RESERVED" },
                { label: "Damaged", value: "DAMAGED" },
              ]}
            />

            <Select
              value={selectedLocation}
              onChange={setSelectedLocation}
              style={{ width: 170 }}
              placeholder="Filter Location"
              options={[
                { label: "All Locations", value: "ALL" },
                ...locationsList.map((loc) => ({ label: loc, value: loc })),
              ]}
            />
          </Space>
        </div>
      </Card>

      {/* MAIN DATA TABLE WITH NESTED EXPANDABLE CONTAINERS */}
      <Card size="small" className="border-slate-200 shadow-xs">
        <Spin spinning={loading}>
          <Table
            dataSource={filteredProducts}
            columns={mainTableColumns}
            rowKey="key"
            expandable={{
              expandedRowRender: renderContainerExpandedRow,
              defaultExpandedRowKeys: ["PROD-A001"],
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "25", "50"],
              showTotal: (total) => `Total ${total} products`,
            }}
            size="small"
            bordered
            scroll={{ x: 900 }}
          />
        </Spin>
      </Card>

      {/* DETAILED INSPECTION DRAWER */}
      <Drawer
        title="Product Inventory Details"
        placement="right"
        width={440}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedProductRecord && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-2">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Product Name</span>
                <p className="font-bold text-slate-800 text-base m-0">
                  {selectedProductRecord.product_name}
                </p>
                <p className="font-mono text-xs text-slate-500 m-0">
                  {selectedProductRecord.product_code}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Stock</span>
                  <p className="font-mono text-lg font-bold text-emerald-600 m-0">
                    {selectedProductRecord.total_qty}{" "}
                    <span className="text-xs text-slate-500">
                      {selectedProductRecord.unit}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Valuation</span>
                  <p className="font-mono text-lg font-bold text-blue-600 m-0">
                    ₹{selectedProductRecord.total_valuation.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase m-0">Containers Breakdown</h4>
              <div className="space-y-2">
                {selectedProductRecord.containers.map((c) => (
                  <div key={c.id} className="p-2 border rounded-md bg-white text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <Tag color="cyan" icon={<InboxOutlined />} className="font-mono font-bold">
                        {c.barcode}
                      </Tag>
                      <span className="font-mono font-bold text-slate-700">
                        {c.total_container_qty} {selectedProductRecord.unit}
                      </span>
                    </div>
                    <div className="text-slate-500 flex justify-between">
                      <span>Location:</span>
                      <span className="font-mono font-semibold">{c.location}</span>
                    </div>
                    <div className="pt-1 border-t space-y-1">
                      {c.batches.map((b, idx) => (
                        <div key={idx} className="flex justify-between font-mono text-[11px]">
                          <span>Batch {b.batch_id}:</span>
                          <span>{b.qty} Pcs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}