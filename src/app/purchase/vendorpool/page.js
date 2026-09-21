"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Tag,
  Input,
  Select,
  Progress,
  Badge,
  Tooltip,
  Modal,
  message,
} from "antd";
import {
  Building2,
  ShoppingCart,
  Search,
  RotateCw,
  ArrowLeft,
  Package,
  Layers,
  FileCheck2,
  Boxes,
  Plus,
  Trash2,
} from "lucide-react";

// Mock staging data: In production, fetch this from your `purchase.requisitions` / staging table
const INITIAL_STAGING_ITEMS = [
  {
    id: "pool_item_1",
    vendor_id: "1",
    vendor_name: "Apex Healthcare Supplies",
    vendor_code: "VND-001",
    payment_terms: "Net 30",
    min_order_value: 50000,
    product_id: "prod_101",
    product_name: "Disposable Surgical Gloves (L)",
    sku: "MED-GLV-001",
    unit: "Boxes",
    required_qty: 150,
    estimated_rate: 180,
    stock_on_hand: 20,
    source_type: "LOW_STOCK_TRIGGER",
    required_date: "2026-09-18",
  },
  {
    id: "pool_item_2",
    vendor_id: "1",
    vendor_name: "Apex Healthcare Supplies",
    vendor_code: "VND-001",
    payment_terms: "Net 30",
    min_order_value: 50000,
    product_id: "prod_102",
    product_name: "Sterile Gauze Swabs 10x10cm",
    sku: "MED-GAU-004",
    unit: "Packs",
    required_qty: 200,
    estimated_rate: 65,
    stock_on_hand: 12,
    source_type: "MANUAL_REQUISITION",
    required_date: "2026-09-20",
  },
  {
    id: "pool_item_3",
    vendor_id: "2",
    vendor_name: "Biocare Diagnostics Ltd",
    vendor_code: "VND-002",
    payment_terms: "Advance",
    min_order_value: 25000,
    product_id: "prod_201",
    product_name: "Rapid Antigen Test Cassette",
    sku: "LAB-RAT-002",
    unit: "Kits",
    required_qty: 80,
    estimated_rate: 320,
    stock_on_hand: 5,
    source_type: "BACK_ORDER",
    required_date: "2026-09-15",
  },
  {
    id: "pool_item_4",
    vendor_id: "3",
    vendor_name: "Surgitech Instruments",
    vendor_code: "VND-003",
    payment_terms: "Net 45",
    min_order_value: 100000,
    product_id: "prod_301",
    product_name: "Curved Mayo Scissors 6.75in",
    sku: "SRG-MYO-012",
    unit: "Nos",
    required_qty: 15,
    estimated_rate: 1250,
    stock_on_hand: 2,
    source_type: "LOW_STOCK_TRIGGER",
    required_date: "2026-09-25",
  },
];

const SOURCE_TAGS = {
  LOW_STOCK_TRIGGER: { label: "Low Stock Alert", color: "red" },
  MANUAL_REQUISITION: { label: "Manual Indent", color: "blue" },
  BACK_ORDER: { label: "Patient Back-Order", color: "orange" },
};

export default function VendorPoolPage() {
  const router = useRouter();
  const [items, setItems] = useState(INITIAL_STAGING_ITEMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("all");
  const [selectedRowKeys, setSelectedRowKeys] = useState({});

  // Group items by Vendor
  const groupedVendors = useMemo(() => {
    const map = {};

    items.forEach((item) => {
      const matchesSearch =
        !searchQuery ||
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesVendor =
        selectedVendorFilter === "all" || item.vendor_id === selectedVendorFilter;

      if (!matchesSearch || !matchesVendor) return;

      if (!map[item.vendor_id]) {
        map[item.vendor_id] = {
          vendor_id: item.vendor_id,
          vendor_name: item.vendor_name,
          vendor_code: item.vendor_code,
          payment_terms: item.payment_terms,
          min_order_value: item.min_order_value,
          line_items: [],
        };
      }

      map[item.vendor_id].line_items.push(item);
    });

    return Object.values(map);
  }, [items, searchQuery, selectedVendorFilter]);

  // Overall Metrics
  const poolStats = useMemo(() => {
    const totalVendors = groupedVendors.length;
    let totalItems = 0;
    let estimatedTotalValue = 0;

    groupedVendors.forEach((v) => {
      v.line_items.forEach((it) => {
        totalItems += 1;
        estimatedTotalValue += it.required_qty * it.estimated_rate;
      });
    });

    return { totalVendors, totalItems, estimatedTotalValue };
  }, [groupedVendors]);

  // Create PO from Vendor Group
  const handleGeneratePO = (vendor) => {
    const selectedForThisVendor = (selectedRowKeys[vendor.vendor_id] || []).length
      ? vendor.line_items.filter((it) =>
          selectedRowKeys[vendor.vendor_id].includes(it.id)
        )
      : vendor.line_items;

    if (selectedForThisVendor.length === 0) {
      return message.warning("Please select at least one item to convert to PO.");
    }

    Modal.confirm({
      title: `Create Purchase Order for ${vendor.vendor_name}?`,
      content: `This will group ${selectedForThisVendor.length} line item(s) worth approx. ₹${selectedForThisVendor
        .reduce((sum, i) => sum + i.required_qty * i.estimated_rate, 0)
        .toLocaleString("en-IN")} into a new draft PO.`,
      okText: "Generate Draft PO",
      okButtonProps: { className: "bg-blue-600 font-medium" },
      onOk: () => {
        // Pass payload or route to PO creation form with items pre-filled
        message.success(`Draft PO generated for ${vendor.vendor_name}!`);
        // Remove transferred items from the pool
        const remaining = items.filter(
          (it) => !selectedForThisVendor.some((sel) => sel.id === it.id)
        );
        setItems(remaining);
      },
    });
  };

  const handleRemoveItem = (itemId) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    message.info("Item removed from pool");
  };

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between bg-white px-5 py-3.5 border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => router.push("/purchase")}
              className="flex items-center text-xs font-medium text-slate-600 hover:text-slate-900 border-slate-200"
            >
              Back
            </Button>
            <div className="h-4 w-px bg-slate-200" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 leading-none">
                  Vendor Staging Pool
                </span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                  CONSOLIDATION QUEUE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                Group pending purchase requisitions and low-stock demands by vendor before PO creation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-500">Total Est. Pool Value:</span>
            <span className="font-bold text-slate-900 text-sm">
              ₹{poolStats.estimatedTotalValue.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU, product or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-64 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <Select
              className="w-52"
              placeholder="Filter by Vendor"
              value={selectedVendorFilter}
              onChange={(val) => setSelectedVendorFilter(val)}
              options={[
                { value: "all", label: "All Active Vendors" },
                ...INITIAL_STAGING_ITEMS.reduce((acc, it) => {
                  if (!acc.some((x) => x.value === it.vendor_id)) {
                    acc.push({ value: it.vendor_id, label: it.vendor_name });
                  }
                  return acc;
                }, []),
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={<RotateCw className="w-3 h-3" />}
              onClick={() => setItems(INITIAL_STAGING_ITEMS)}
              className="text-xs text-slate-600 border-slate-200"
            >
              Reset Demo Data
            </Button>
          </div>
        </div>

        {/* Vendor Groups List */}
        {groupedVendors.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Boxes className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-800">
              No Pending Demand in Pool
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All line items have been converted to Purchase Orders, or no items match your current search filters.
            </p>
          </div>
        ) : (
          groupedVendors.map((vendor) => {
            const vendorTotal = vendor.line_items.reduce(
              (sum, it) => sum + it.required_qty * it.estimated_rate,
              0
            );
            const movProgress = Math.min(
              100,
              Math.round((vendorTotal / (vendor.min_order_value || 1)) * 100)
            );

            const columns = [
              {
                title: "Product / Item Scope",
                key: "product",
                render: (_, record) => (
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-slate-100 text-slate-600 rounded mt-0.5">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-slate-900 block leading-tight">
                        {record.product_name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        SKU: {record.sku}
                      </span>
                    </div>
                  </div>
                ),
              },
              {
                title: "Demand Origin",
                dataIndex: "source_type",
                key: "source_type",
                width: 170,
                render: (type) => {
                  const tagInfo = SOURCE_TAGS[type] || {
                    label: type,
                    color: "default",
                  };
                  return (
                    <Tag color={tagInfo.color} className="text-[10px] font-medium border-0 m-0">
                      {tagInfo.label}
                    </Tag>
                  );
                },
              },
              {
                title: "Stock / Needed",
                key: "stock_needed",
                width: 140,
                render: (_, record) => (
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-slate-900 font-mono">
                      {record.required_qty} {record.unit}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      In Hand: <span className="font-mono text-slate-600">{record.stock_on_hand}</span>
                    </div>
                  </div>
                ),
              },
              {
                title: "Est. Rate",
                dataIndex: "estimated_rate",
                key: "estimated_rate",
                width: 110,
                render: (rate) => (
                  <span className="font-mono text-xs text-slate-700 font-medium">
                    ₹{rate}
                  </span>
                ),
              },
              {
                title: "Est. Total",
                key: "line_total",
                width: 130,
                render: (_, record) => (
                  <span className="font-mono font-bold text-xs text-slate-900">
                    ₹{(record.required_qty * record.estimated_rate).toLocaleString("en-IN")}
                  </span>
                ),
              },
              {
                title: "Needed By",
                dataIndex: "required_date",
                key: "required_date",
                width: 110,
                render: (date) => (
                  <span className="text-[11px] text-slate-500 font-mono">
                    {date}
                  </span>
                ),
              },
              {
                title: "",
                key: "action",
                width: 60,
                align: "center",
                render: (_, record) => (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => handleRemoveItem(record.id)}
                    title="Remove from pool"
                  />
                ),
              },
            ];

            return (
              <div
                key={vendor.vendor_id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3"
              >
                {/* Vendor Summary Header */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-700 shadow-2xs font-bold text-xs uppercase">
                      {vendor.vendor_code.slice(-3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {vendor.vendor_name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ({vendor.vendor_code})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Terms: <strong className="text-slate-700">{vendor.payment_terms}</strong></span>
                        <span>•</span>
                        <span>
                          MOV Target:{" "}
                          <strong className="text-slate-700">
                            ₹{vendor.min_order_value.toLocaleString("en-IN")}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MOV Progress & Generate Action */}
                  <div className="flex items-center gap-6">
                    <div className="w-36 text-right">
                      <div className="text-[11px] font-semibold text-slate-500 mb-1">
                        MOV Progress ({movProgress}%)
                      </div>
                      <Progress
                        percent={movProgress}
                        showInfo={false}
                        size="small"
                        strokeColor={movProgress >= 100 ? "#10b981" : "#3b82f6"}
                      />
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Vendor Total
                      </span>
                      <span className="text-base font-bold text-slate-900">
                        ₹{vendorTotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <Button
                      type="primary"
                      icon={<FileCheck2 className="w-3.5 h-3.5" />}
                      onClick={() => handleGeneratePO(vendor)}
                      className="bg-blue-600 hover:bg-blue-500 text-xs font-semibold flex items-center h-8"
                    >
                      Generate PO ({vendor.line_items.length})
                    </Button>
                  </div>
                </div>

                {/* Vendor Items Table */}
                <div className="px-3 pb-3">
                  <Table
                    rowSelection={{
                      selectedRowKeys: selectedRowKeys[vendor.vendor_id] || [],
                      onChange: (keys) => {
                        setSelectedRowKeys((prev) => ({
                          ...prev,
                          [vendor.vendor_id]: keys,
                        }));
                      },
                    }}
                    dataSource={vendor.line_items}
                    columns={columns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    className="border border-slate-100 rounded-lg overflow-hidden"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}