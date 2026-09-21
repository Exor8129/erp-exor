"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Modal,
  Select,
  Input,
  InputNumber,
  message,
} from "antd";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Package,
  Search,
  RotateCw,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  X,
  Home,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const { TextArea } = Input;

const STATUS_CONFIG = {
  open: {
    label: "Open Action",
    badge: "bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/10",
    dot: "bg-rose-500",
  },
  investigating: {
    label: "Investigating",
    badge: "bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/10",
    dot: "bg-amber-500 animate-pulse",
  },
  awaiting_supplier: {
    label: "Vendor Hold",
    badge: "bg-orange-50 text-orange-700 border-orange-200/80 ring-orange-500/10",
    dot: "bg-orange-500",
  },
  partially_resolved: {
    label: "In Progress",
    badge: "bg-sky-50 text-sky-700 border-sky-200/80 ring-sky-500/10",
    dot: "bg-sky-500",
  },
  resolved: {
    label: "Resolved",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/10",
    dot: "bg-emerald-500",
  },
  closed: {
    label: "Closed",
    badge: "bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/10",
    dot: "bg-slate-400",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-purple-50 text-purple-700 border-purple-200/80 ring-purple-500/10",
    dot: "bg-purple-500",
  },
};

const SEVERITY_CONFIG = {
  LOW: "text-slate-600 bg-slate-100 border-slate-200",
  NORMAL: "text-indigo-700 bg-indigo-50 border-indigo-200",
  HIGH: "text-amber-700 bg-amber-50 border-amber-200",
  CRITICAL: "text-rose-700 bg-rose-50 border-rose-200 font-bold",
};

const RESOLUTION_TYPES = [
  { value: "DEBIT_NOTE", label: "Raise Debit Note" },
  { value: "RTV", label: "Return to Vendor (RTV)" },
  { value: "SUPPLIER_REPLACEMENT", label: "Supplier Replacement" },
  { value: "CONCESSION_ACCEPTANCE", label: "Accept on Concession" },
  { value: "INVOICE_CORRECTION", label: "Invoice / Document Correction" },
  { value: "REJECTED_CLAIM", label: "Reject Claim" },
];

export default function DiscrepancyResolutionManager({ poId, grnId }) {
  const router = useRouter();

  const [discrepancies, setDiscrepancies] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [submittingResolution, setSubmittingResolution] = useState(false);
  const [resolutionForm, setResolutionForm] = useState({
    status: "resolved",
    resolution_type: "DEBIT_NOTE",
    resolution_ref: "",
    resolution_qty: null,
    resolution_notes: "",
  });

  useEffect(() => {
    fetchDiscrepancies();
  }, [poId, grnId]);

  const fetchDiscrepancies = async () => {
    try {
      setLoading(true);
      let query = supabase
        .schema("purchase")
        .from("discrepancies")
        .select(`
          id,
          discrepancy_no,
          po_id,
          grn_id,
          supplier_id,
          category,
          reason,
          expected_qty,
          actual_qty,
          discrepancy_qty,
          discrepancy_data,
          status,
          resolution_type,
          resolution_ref,
          resolution_qty,
          resolution_notes,
          created_at,
          resolved_at
        `)
        .order("created_at", { ascending: false });

      if (poId) query = query.eq("po_id", poId);
      if (grnId) query = query.eq("grn_id", grnId);

      const { data: rawData, error: discError } = await query;
      if (discError) throw discError;

      const supplierIds = [...new Set((rawData || []).map((d) => d.supplier_id).filter(Boolean))];
      let vendorMap = {};
      let vendorList = [];

      if (supplierIds.length > 0) {
        const { data: vendorData, error: vError } = await supabase
          .from("vendors")
          .select("id, vendor_name")
          .in("id", supplierIds);

        if (!vError && vendorData) {
          vendorList = vendorData;
          vendorMap = vendorData.reduce((acc, v) => {
            acc[v.id] = v.vendor_name;
            return acc;
          }, {});
        }
      }

      setVendors(vendorList);
      const enriched = (rawData || []).map((d) => ({
        ...d,
        vendor_name: vendorMap[d.supplier_id] || "Vendor #" + d.supplier_id,
      }));

      setDiscrepancies(enriched);
    } catch (err) {
      console.error(err);
      message.error("Failed to load discrepancies.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResolve = (record) => {
    setActiveRecord(record);
    setResolutionForm({
      status: record.status === "open" ? "resolved" : record.status,
      resolution_type: record.resolution_type || "DEBIT_NOTE",
      resolution_ref: record.resolution_ref || "",
      resolution_qty: record.resolution_qty ?? record.discrepancy_qty ?? null,
      resolution_notes: record.resolution_notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveResolution = async () => {
    if (!activeRecord) return;
    try {
      setSubmittingResolution(true);
      const updatePayload = {
        status: resolutionForm.status,
        resolution_type: resolutionForm.resolution_type,
        resolution_ref: resolutionForm.resolution_ref || null,
        resolution_qty: resolutionForm.resolution_qty,
        resolution_notes: resolutionForm.resolution_notes || null,
        resolved_at: ["resolved", "closed"].includes(resolutionForm.status)
          ? new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .schema("purchase")
        .from("discrepancies")
        .update(updatePayload)
        .eq("id", activeRecord.id);

      if (error) throw error;

      message.success(`Ticket ${activeRecord.discrepancy_no} updated.`);
      setIsModalOpen(false);
      fetchDiscrepancies();
    } catch (err) {
      console.error(err);
      message.error("Failed to save resolution.");
    } finally {
      setSubmittingResolution(false);
    }
  };

  const metrics = useMemo(() => {
    const total = discrepancies.length;
    const openCount = discrepancies.filter((d) => d.status === "open").length;
    const investigating = discrepancies.filter((d) =>
      ["investigating", "awaiting_supplier"].includes(d.status)
    ).length;
    const resolved = discrepancies.filter((d) =>
      ["resolved", "closed"].includes(d.status)
    ).length;
    return { total, openCount, investigating, resolved };
  }, [discrepancies]);

  const filteredData = useMemo(() => {
    return discrepancies.filter((item) => {
      const matchStatus = statusFilter === "all" ? true : item.status === statusFilter;
      const matchCategory = categoryFilter === "all" ? true : item.category === categoryFilter;
      const matchSupplier =
        supplierFilter === "all" ? true : String(item.supplier_id) === String(supplierFilter);

      const productName = item.discrepancy_data?.product_name || "";
      const search = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        item.discrepancy_no?.toLowerCase().includes(search) ||
        item.reason?.toLowerCase().includes(search) ||
        item.vendor_name?.toLowerCase().includes(search) ||
        productName.toLowerCase().includes(search);

      return matchStatus && matchCategory && matchSupplier && matchSearch;
    });
  }, [discrepancies, statusFilter, categoryFilter, supplierFilter, searchQuery]);

  const columns = [
    {
      title: "Discrepancy Ref",
      dataIndex: "discrepancy_no",
      key: "discrepancy_no",
      width: 170,
      render: (text, record) => {
        const severity = record.discrepancy_data?.severity || "NORMAL";
        return (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {text}
            </span>
            <span
              className={`w-fit text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.NORMAL
              }`}
            >
              {severity}
            </span>
          </div>
        );
      },
    },
    {
      title: "Supplier",
      dataIndex: "vendor_name",
      key: "vendor_name",
      width: 190,
      render: (text) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0 uppercase">
            {text.slice(0, 2)}
          </div>
          <span className="text-xs font-semibold text-slate-800 truncate" title={text}>
            {text}
          </span>
        </div>
      ),
    },
    {
      title: "Item / Scope",
      key: "item",
      render: (_, record) => {
        const isDoc = record.category === "DOCUMENTATION";
        if (isDoc) {
          return (
            <div className="flex items-start gap-2 text-xs">
              <div className="p-1.5 bg-slate-100 rounded text-slate-600 mt-0.5">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-slate-900 block leading-tight">
                  Document Variance
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Ref: {record.discrepancy_data?.doc_ref_no || "No doc ref"}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded mt-0.5">
              <Package className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900 block leading-tight">
                {record.discrepancy_data?.product_name || "Custom Non-PO SKU"}
              </span>
              {record.discrepancy_data?.is_custom_item ? (
                <span className="inline-block text-[10px] text-amber-700 font-bold uppercase mt-0.5">
                  Unordered Line Item
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 block font-mono">
                  ID: {record.item_id?.slice(0, 8) || "PO Item"}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Category & Reason",
      key: "category",
      width: 180,
      render: (_, record) => (
        <div>
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
            {record.category}
          </span>
          <span className="text-xs font-semibold text-slate-800 leading-snug">
            {record.reason?.replace(/_/g, " ")}
          </span>
        </div>
      ),
    },
    {
      title: "Variance",
      key: "variance",
      width: 140,
      render: (_, record) => {
        if (record.category === "DOCUMENTATION") {
          return <span className="text-slate-400 text-xs">-</span>;
        }
        const unit = record.discrepancy_data?.unit || "Nos";
        return (
          <div>
            <span className="font-mono font-bold text-xs text-rose-600 block">
              {record.discrepancy_qty ?? "-"} {unit}
            </span>
            {record.expected_qty !== null && (
              <span className="text-[11px] text-slate-400 block font-mono">
                Exp: {record.expected_qty}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (status) => {
        const conf = STATUS_CONFIG[status] || STATUS_CONFIG.open;
        return (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ring-1 ring-inset ${conf.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
            {conf.label}
          </div>
        );
      },
    },
    {
  title: "Action",
  key: "action",
  width: 130,
  fixed: "right",
  align: "center",
  render: (_, record) => {
    const isClosed = record.status === "closed";
    const isResolved = record.status === "resolved";

    return (
      <Button
        size="small"
        onClick={() => handleOpenResolve(record)}
        disabled={isClosed}
        className={`
          !h-7
          !px-3
          !rounded-md
          !border
          !font-medium
          !text-xs
          transition-all
          duration-150
          ${
            isClosed
              ? "!border-slate-200 !bg-slate-50 !text-slate-400 !cursor-not-allowed"
              : isResolved
              ? "!border-emerald-200 !bg-emerald-50 !text-emerald-700 hover:!bg-emerald-100 hover:!border-emerald-300"
              : "!border-blue-200 !bg-blue-50 !text-blue-700 hover:!bg-blue-100 hover:!border-blue-300 shadow-2xs"
          }
        `}
      >
        <span className="flex items-center justify-center gap-1.5 whitespace-nowrap leading-none">
          {isClosed ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Closed</span>
            </>
          ) : isResolved ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>Review</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span>Resolve</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
            </>
          )}
        </span>
      </Button>
    );
  },
},
  ];

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Top Navigation & Breadcrumb Header */}
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
                  Discrepancy Resolution Center
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                  AUDIT & CLAIMS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                Track, investigate, and settle supplier variances and delivery notes
              </p>
            </div>
          </div>

          <Button
            type="primary"
            icon={<Home className="w-3.5 h-3.5" />}
            onClick={() => router.push("/purchase")}
            className="flex items-center bg-slate-900 hover:bg-slate-800 text-xs font-semibold border-none shadow-xs"
          >
            Purchase Home
          </Button>
        </div>

        {/* Visual Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total */}
          <div
            onClick={() => setStatusFilter("all")}
            className={`cursor-pointer p-4 bg-white rounded-xl border transition-all ${
              statusFilter === "all"
                ? "border-indigo-400 shadow-md ring-2 ring-indigo-500/10"
                : "border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Logged
              </span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{metrics.total}</span>
              <span className="text-[11px] text-slate-400">All variances</span>
            </div>
          </div>

          {/* Open */}
          <div
            onClick={() => setStatusFilter("open")}
            className={`cursor-pointer p-4 bg-white rounded-xl border transition-all ${
              statusFilter === "open"
                ? "border-rose-400 shadow-md ring-2 ring-rose-500/10"
                : "border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Action Required
              </span>
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                <Clock3 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-600">{metrics.openCount}</span>
              <span className="text-[11px] text-rose-400">Pending tickets</span>
            </div>
          </div>

          {/* Investigating */}
          <div
            onClick={() => setStatusFilter("investigating")}
            className={`cursor-pointer p-4 bg-white rounded-xl border transition-all ${
              statusFilter === "investigating"
                ? "border-amber-400 shadow-md ring-2 ring-amber-500/10"
                : "border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                In Review
              </span>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <RotateCw className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-600">
                {metrics.investigating}
              </span>
              <span className="text-[11px] text-amber-400">With vendor/QA</span>
            </div>
          </div>

          {/* Resolved */}
          <div
            onClick={() => setStatusFilter("resolved")}
            className={`cursor-pointer p-4 bg-white rounded-xl border transition-all ${
              statusFilter === "resolved"
                ? "border-emerald-400 shadow-md ring-2 ring-emerald-500/10"
                : "border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Resolved
              </span>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-600">
                {metrics.resolved}
              </span>
              <span className="text-[11px] text-emerald-400">Claims settled</span>
            </div>
          </div>
        </div>

        {/* Modern Filter Ribbon */}
        <div className="bg-white px-4 py-3 border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference, SKU, or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg w-64 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Supplier Select */}
            <Select
              size="small"
              className="w-48"
              placeholder="Select Supplier"
              value={supplierFilter}
              onChange={(val) => setSupplierFilter(val)}
              options={[
                { value: "all", label: "All Suppliers" },
                ...vendors.map((v) => ({
                  value: String(v.id),
                  label: v.vendor_name,
                })),
              ]}
            />

            {/* Status Select */}
            <Select
              size="small"
              className="w-36"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "open", label: "Open" },
                { value: "investigating", label: "Investigating" },
                { value: "awaiting_supplier", label: "Awaiting Supplier" },
                { value: "partially_resolved", label: "Partially Resolved" },
                { value: "resolved", label: "Resolved" },
                { value: "closed", label: "Closed" },
              ]}
            />

            {/* Category Select */}
            <Select
              size="small"
              className="w-40"
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              options={[
                { value: "all", label: "All Categories" },
                { value: "QUANTITY", label: "Quantity" },
                { value: "PRODUCT", label: "Product Mismatch" },
                { value: "CONDITION", label: "Condition / Damage" },
                { value: "QUALITY", label: "Quality" },
                { value: "DOCUMENTATION", label: "Documentation" },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            {(statusFilter !== "all" ||
              categoryFilter !== "all" ||
              supplierFilter !== "all" ||
              searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setSupplierFilter("all");
                  setSearchQuery("");
                }}
                className="text-[11px] font-medium text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}

            <Button
              size="small"
              icon={<RotateCw className="w-3 h-3" />}
              onClick={fetchDiscrepancies}
              loading={loading}
              className="text-xs border-slate-200 hover:border-slate-300 shadow-xs"
            >
              Sync
            </Button>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <Table
            dataSource={filteredData}
            columns={columns}
            rowKey="id"
            size="middle"
            loading={loading}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              className: "pr-4 py-2 text-xs",
            }}
            expandable={{
              expandedRowRender: (record) => (
                <div className="p-4 bg-slate-50/70 border-y border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-1.5">
                    <span className="font-bold text-slate-700 tracking-wider uppercase text-[10px] block">
                      Discrepancy Notes
                    </span>
                    <p className="text-slate-600 m-0">
                      <span className="text-slate-400">User Remarks:</span>{" "}
                      {record.discrepancy_data?.remarks || "None reported"}
                    </p>
                    {record.discrepancy_data?.general_remarks && (
                      <p className="text-slate-500 m-0 italic bg-slate-50 p-1.5 rounded">
                        "{record.discrepancy_data.general_remarks}"
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-1.5">
                    <span className="font-bold text-slate-700 tracking-wider uppercase text-[10px] block">
                      Resolution Snapshot
                    </span>
                    <p className="text-slate-600 m-0">
                      <span className="text-slate-400">Action:</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {record.resolution_type || "No Action Taken"}
                      </span>
                    </p>
                    <p className="text-slate-600 m-0">
                      <span className="text-slate-400">Document / Ref:</span>{" "}
                      <span className="font-mono font-medium">{record.resolution_ref || "-"}</span>
                    </p>
                    {record.resolution_notes && (
                      <p className="text-slate-500 m-0 truncate">Note: {record.resolution_notes}</p>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-1.5">
                    <span className="font-bold text-slate-700 tracking-wider uppercase text-[10px] block">
                      Audit Log
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" /> Booked:{" "}
                      {new Date(record.created_at).toLocaleString()}
                    </div>
                    {record.resolved_at && (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolved:{" "}
                        {new Date(record.resolved_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ),
            }}
          />
        </div>
      </div>

      {/* Resolution Management Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 block leading-tight">
                Discrepancy Resolution
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Ticket: {activeRecord?.discrepancy_no}
              </span>
            </div>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSaveResolution}
        confirmLoading={submittingResolution}
        okText="Update & Close Ticket"
        okButtonProps={{ className: "bg-blue-600 font-medium" }}
        width={560}
      >
        {activeRecord && (
          <div className="space-y-4 pt-3 text-xs">
            {/* Context Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Vendor:</span>
                <span className="font-semibold text-slate-800">{activeRecord.vendor_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Target Line:</span>
                <span className="font-medium text-slate-800">
                  {activeRecord.discrepancy_data?.product_name || "Document Issue"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                <span className="text-slate-400">Variance Type:</span>
                <span className="font-bold text-rose-600">
                  {activeRecord.category} ({activeRecord.reason}) • Qty:{" "}
                  {activeRecord.discrepancy_qty ?? "-"}
                </span>
              </div>
            </div>

            {/* Resolution Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Ticket Status <span className="text-red-500">*</span>
                </label>
                <Select
                  className="w-full"
                  value={resolutionForm.status}
                  onChange={(val) => setResolutionForm((prev) => ({ ...prev, status: val }))}
                  options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                  }))}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Resolution Method
                </label>
                <Select
                  className="w-full"
                  value={resolutionForm.resolution_type}
                  onChange={(val) =>
                    setResolutionForm((prev) => ({ ...prev, resolution_type: val }))
                  }
                  options={RESOLUTION_TYPES}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Document / Debit Note Ref
                </label>
                <Input
                  placeholder="e.g. DN-2026-089"
                  value={resolutionForm.resolution_ref}
                  onChange={(e) =>
                    setResolutionForm((prev) => ({ ...prev, resolution_ref: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Settled Quantity
                </label>
                <InputNumber
                  className="w-full"
                  min={0}
                  placeholder="0"
                  value={resolutionForm.resolution_qty}
                  onChange={(val) =>
                    setResolutionForm((prev) => ({ ...prev, resolution_qty: val }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Resolution Summary & Vendor Settlement Notes
              </label>
              <TextArea
                rows={3}
                placeholder="Details of agreement with supplier, credit note confirmations, or concessions approved..."
                value={resolutionForm.resolution_notes}
                onChange={(e) =>
                  setResolutionForm((prev) => ({ ...prev, resolution_notes: e.target.value }))
                }
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}