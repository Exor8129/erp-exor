"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Table,
  Button,
  message,
  Segmented,
  Tooltip,
  Modal,
} from "antd";
import {
  Search,
  ArrowRight,
  Printer,
  Package,
  Truck,
  Building2,
  FileText,
  RotateCw,
  X,
  Copy,
  Check,
  Clock,
  Loader2,
  PackageSearch,
  Eye,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import InboundProcessModal from "../components/grn/InboundProcessModal";
import jsPDF from "jspdf";
import bwipjs from "bwip-js";
import { updateGrnTableStatus } from "../../../lib/services/grnTableStatusUpdate";
import { updatePoTableStatus } from "@/app/lib/services/updatePoTableStatus";

// Custom Centered Loader Wrapper Component
const CardioLoader = () => {
  useEffect(() => {
    async function registerLoader() {
      const { cardio } = await import("ldrs");
      cardio.register();
    }
    registerLoader();
  }, []);

  return (
    <div className="flex flex-col justify-center items-center py-20 w-full">
      <l-cardio size="42" stroke="3.5" speed="1.8" color="#3b82f6" />
      <span className="text-[11px] font-mono text-slate-400 mt-2.5 tracking-wider">
        FETCHING INBOUND SHIPMENTS...
      </span>
    </div>
  );
};

const STATUS_MAP = {
  pending: {
    label: "Pending",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    Icon: Clock,
  },
  "inbound processing": {
    label: "Inbound",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    Icon: Loader2,
  },
  inbound: {
    label: "Inbound",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    Icon: Loader2,
  },
  processing: {
    label: "Processing",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    Icon: Loader2,
  },
  received: {
    label: "Received",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    Icon: Check,
  },
  completed: {
    label: "Completed",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    Icon: Check,
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    Icon: X,
  },
};

const daysSince = (dateStr) => {
  if (!dateStr) return null;
  const diffMs = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function InboundManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const [grnList, setGrnList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);

  const [processingRowId, setProcessingRowId] = useState(null);
  const [printingRowId, setPrintingRowId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [poid, setPOid] = useState(null);

  const searchInputRef = useRef(null);

  const fetchGrns = useCallback(async () => {
    setLoading(true);
    try {
      const { data: grns, error: grnError } = await supabase
        .schema("purchase")
        .from("grn")
        .select(`
          id,
          grn_no,
          supplier_id,
          po_id,
          invoice_no,
          boxes_received,
          received_date,
          transporter_name,
          vehicle_number,
          status,
          notes,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (grnError) throw grnError;

      if (!grns || grns.length === 0) {
        setGrnList([]);
        return;
      }

      const supplierIds = [...new Set(grns.map((g) => g.supplier_id).filter(Boolean))];
      const poIds = [...new Set(grns.map((g) => g.po_id).filter(Boolean))];

      const [vendorsRes, posRes] = await Promise.all([
        supplierIds.length > 0
          ? supabase.from("vendors").select("id, vendor_name").in("id", supplierIds)
          : { data: [] },
        poIds.length > 0
          ? supabase.schema("purchase").from("purchase_orders").select("id, po_number").in("id", poIds)
          : { data: [] },
      ]);

      if (vendorsRes.error) throw vendorsRes.error;
      if (posRes.error) throw posRes.error;

      const vendorMap = {};
      (vendorsRes.data || []).forEach((v) => {
        vendorMap[v.id] = v.vendor_name;
      });

      const poMap = {};
      (posRes.data || []).forEach((p) => {
        poMap[p.id] = p.po_number;
      });

      const finalData = grns.map((grn) => ({
        ...grn,
        vendor_name: vendorMap[grn.supplier_id] || "-",
        po_number: poMap[grn.po_id] || "-",
      }));

      setGrnList(finalData);
    } catch (err) {
      console.error("Fetch GRN Error:", err);
      message.error(err.message || "Failed to fetch GRNs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrns();
  }, [fetchGrns]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredData = useMemo(() => {
    return grnList.filter((item) => {
      const s = (item.status || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "pending") matchesStatus = s === "pending";
      else if (statusFilter === "inbound") matchesStatus = s.includes("inbound") || s.includes("process");
      else if (statusFilter === "completed") matchesStatus = s.includes("received") || s.includes("complete");

      const q = debouncedSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (item.grn_no && item.grn_no.toLowerCase().includes(q)) ||
        (item.invoice_no && item.invoice_no.toLowerCase().includes(q)) ||
        (item.po_number && item.po_number.toLowerCase().includes(q)) ||
        (item.vendor_name && item.vendor_name.toLowerCase().includes(q)) ||
        (item.transporter_name && item.transporter_name.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [grnList, statusFilter, debouncedSearch]);

  const metrics = useMemo(() => {
    const total = grnList.length;
    const pending = grnList.filter((g) => (g.status || "").toLowerCase() === "pending").length;
    const processing = grnList.filter((g) => {
      const s = (g.status || "").toLowerCase();
      return s.includes("process") || s.includes("inbound");
    }).length;
    const completed = grnList.filter((g) => {
      const s = (g.status || "").toLowerCase();
      return s.includes("received") || s.includes("complete");
    }).length;
    return { total, pending, processing, completed };
  }, [grnList]);

  // Open modal in View mode for completed records, or Process mode for active records
  const handleOpenInboundModal = async (record, isReadOnly = false) => {
    setProcessingRowId(record.id);
    try {
      if (isReadOnly) {
        setSelectedGRN(record);
        setPOid(record.po_id);
        setModalOpen(true);
        return;
      }

      await fetchGrns();

      setSelectedGRN({
        ...record,
      });

      if (record.po_id) {
        await updatePoTableStatus(record.po_id, "IB-Label");
      }
      setPOid(record.po_id);
      setModalOpen(true);
    } finally {
      setProcessingRowId(null);
    }
  };

  const generateBarcode = async (barcodeText) => {
    const canvas = document.createElement("canvas");
    bwipjs.toCanvas(canvas, {
      bcid: "code128",
      text: barcodeText,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: "center",
    });
    return canvas.toDataURL("image/png");
  };

  const runPrintLabels = async (grn) => {
    setPrintingRowId(grn.id);
    try {
      const { data: containers, error } = await supabase
        .schema("purchase")
        .from("containers")
        .select(`id, container_code, barcode, container_type`)
        .eq("grn_id", grn.id)
        .order("container_code");

      if (error) throw error;

      if (!containers?.length) {
        message.warning("No containers found for this GRN.");
        return;
      }

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [50, 100],
      });

      for (let i = 0; i < containers.length; i++) {
        const container = containers[i];
        if (i > 0) pdf.addPage([50, 100], "landscape");

        const barcodeImage = await generateBarcode(container.barcode);
        pdf.rect(2, 2, 96, 46);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(grn.grn_no, 5, 8);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.text(`Container : ${container.container_code}`, 5, 15);
        pdf.text(`Type : ${container.container_type}`, 5, 21);

        pdf.addImage(barcodeImage, "PNG", 5, 24, 90, 16);
        pdf.setFontSize(10);
        pdf.text(container.barcode, 25, 45);
      }

      await supabase
        .schema("purchase")
        .from("containers")
        .update({
          printed: true,
          printed_at: new Date().toISOString(),
        })
        .eq("grn_id", grn.id);

      pdf.autoPrint();
      window.open(pdf.output("bloburl"));
      message.success(`${containers.length} label${containers.length > 1 ? "s" : ""} generated.`);
    } catch (err) {
      console.error(err);
      message.error(err.message || "Failed to generate labels");
    } finally {
      setPrintingRowId(null);
    }
  };

  const handlePrintLabels = (grn) => {
    Modal.confirm({
      title: `Print container labels for ${grn.grn_no}?`,
      content: "This marks all containers for this GRN as printed and opens a PDF ready to print.",
      okText: "Print",
      cancelText: "Cancel",
      onOk: () => runPrintLabels(grn),
    });
  };

  const handleCopyGrn = async (grnNo) => {
    try {
      await navigator.clipboard.writeText(grnNo);
      setCopiedId(grnNo);
      message.success("GRN number copied");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      message.error("Couldn't copy — try selecting the text manually");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const columns = [
    {
      title: "GRN & Purchase Order",
      key: "grn_po",
      width: 230,
      sorter: (a, b) => (a.grn_no || "").localeCompare(b.grn_no || ""),
      render: (_, record) => (
        <div className="space-y-0.5 whitespace-nowrap">
          <div className="font-mono font-bold text-xs text-blue-600 flex items-center gap-1.5 group">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            {record.grn_no}
            <Tooltip title={copiedId === record.grn_no ? "Copied!" : "Copy GRN number"}>
              <button
                type="button"
                aria-label="Copy GRN number"
                onClick={() => handleCopyGrn(record.grn_no)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-blue-500"
              >
                {copiedId === record.grn_no ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </Tooltip>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            PO: <span className="text-slate-700 font-semibold">{record.po_number}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Supplier & Invoice",
      key: "supplier",
      width: 320,
      render: (_, record) => (
        <div className="whitespace-nowrap">
          <Tooltip title={record.vendor_name}>
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 truncate max-w-[290px]">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{record.vendor_name}</span>
            </div>
          </Tooltip>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
            <FileText className="w-3 h-3 text-slate-300" />
            Inv: <span className="text-slate-600">{record.invoice_no || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Package Logistics",
      key: "logistics",
      width: 240,
      sorter: (a, b) => (a.boxes_received ?? 0) - (b.boxes_received ?? 0),
      render: (_, record) => (
        <div className="text-xs space-y-0.5 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-mono font-semibold text-[11px] border border-blue-100">
              {record.boxes_received ?? 0} Boxes
            </span>
          </div>
          <Tooltip title={record.transporter_name || "Self Delivery"}>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[210px]">
              <Truck className="w-3 h-3 text-slate-300 shrink-0" />
              <span className="truncate">{record.transporter_name || "Self Delivery"}</span>
            </div>
          </Tooltip>
        </div>
      ),
    },
    {
      title: "Date Inward",
      dataIndex: "received_date",
      key: "received_date",
      width: 180,
      sorter: (a, b) => new Date(a.received_date || 0) - new Date(b.received_date || 0),
      defaultSortOrder: null,
      render: (date, record) => {
        const isPendingStatus = (record.status || "").toLowerCase() === "pending";
        const age = daysSince(date);
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs font-mono text-slate-600">
              {date ? new Date(date).toLocaleDateString() : "—"}
            </span>
            {isPendingStatus && age !== null && (
              <Tooltip title={`Pending for ${age} day${age === 1 ? "" : "s"}`}>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    age > 2
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-slate-50 text-slate-500 border border-slate-200"
                  }`}
                >
                  {age}d
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "Inspection Status",
      dataIndex: "status",
      key: "status",
      width: 180,
      filters: Object.keys(STATUS_MAP).map((k) => ({ text: STATUS_MAP[k].label, value: k })),
      onFilter: (value, record) => (record.status || "").toLowerCase() === value,
      render: (status) => {
        const key = (status || "").toLowerCase();
        const conf = STATUS_MAP[key] || {
          label: status || "Unknown",
          badge: "bg-slate-100 text-slate-600 border-slate-200",
          Icon: null,
        };
        const StatusIcon = conf.Icon;

        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${conf.badge}`}>
            {StatusIcon && <StatusIcon className="w-3 h-3" />}
            {conf.label}
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "action",
      width: 160,
      fixed: "right",
      align: "center",
      render: (_, record) => {
        const st = (record.status || "").toLowerCase();
        const isCompleted = st.includes("received") || st.includes("complete");

        return (
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            {isCompleted ? (
              <Tooltip title="View received GRN details (Read Only)">
                <Button
                  size="small"
                  icon={<Eye className="w-3.5 h-3.5" />}
                  loading={processingRowId === record.id}
                  disabled={printingRowId === record.id}
                  onClick={() => handleOpenInboundModal(record, true)}
                  className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 flex items-center h-7 px-2.5 font-medium"
                >
                  View
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Start gate inspection">
                <Button
                  type="primary"
                  size="small"
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  loading={processingRowId === record.id}
                  disabled={printingRowId === record.id}
                  onClick={() => handleOpenInboundModal(record, false)}
                  className="text-xs bg-blue-600 hover:bg-blue-500 flex items-center h-7 px-2.5 font-medium"
                >
                  Inbound
                </Button>
              </Tooltip>
            )}

            <Tooltip title="Print container barcodes">
              <Button
                size="small"
                icon={<Printer className="w-3.5 h-3.5 text-slate-600" />}
                loading={printingRowId === record.id}
                disabled={processingRowId === record.id}
                onClick={() => handlePrintLabels(record)}
                className="h-7 w-7 p-0 flex items-center justify-center border-slate-200 hover:border-slate-300"
              />
            </Tooltip>
          </div>
        );
      },
    },
  ];

  return (
    <div className="h-screen max-h-screen bg-slate-50/60 p-3 sm:p-4 flex flex-col space-y-2.5 overflow-hidden">
      {/* Global CSS to guarantee horizontal & vertical scrollbars render with full contrast */}
      <style jsx global>{`
        .ant-table-body,
        .ant-table-content {
          overflow-x: auto !important;
          scrollbar-gutter: stable !important;
        }
        .ant-table-body::-webkit-scrollbar,
        .ant-table-content::-webkit-scrollbar {
          height: 9px !important;
          width: 7px !important;
          display: block !important;
        }
        .ant-table-body::-webkit-scrollbar-track,
        .ant-table-content::-webkit-scrollbar-track {
          background: #f1f5f9 !important;
        }
        .ant-table-body::-webkit-scrollbar-thumb,
        .ant-table-content::-webkit-scrollbar-thumb {
          background-color: #94a3b8 !important;
          border-radius: 4px !important;
        }
        .ant-table-body::-webkit-scrollbar-thumb:hover,
        .ant-table-content::-webkit-scrollbar-thumb:hover {
          background-color: #64748b !important;
        }
      `}</style>

      {/* Compact Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              Inbound Receiving & Inspection
            </h1>
            <p className="text-[11px] text-slate-400 m-0">
              Gate check, container barcodes, and verification
            </p>
          </div>
        </div>

        {/* Compact Counters in Single Row */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg text-slate-600 text-[11px]">
            Total: <strong className="text-slate-800">{metrics.total}</strong>
          </span>
          <span className="bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg text-amber-700 text-[11px]">
            Pending: <strong>{metrics.pending}</strong>
          </span>
          <span className="bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-lg text-blue-700 text-[11px]">
            Inbound: <strong>{metrics.processing}</strong>
          </span>
          <span className="bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg text-emerald-700 text-[11px]">
            Done: <strong>{metrics.completed}</strong>
          </span>
        </div>
      </div>

      {/* Directory Table Surface */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
        {/* Table Control Bar */}
        <div className="px-3.5 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            size="small"
            className="bg-slate-100 p-0.5 text-xs font-medium"
            options={[
              { label: `All (${metrics.total})`, value: "all" },
              { label: `Pending (${metrics.pending})`, value: "pending" },
              { label: `Inbound (${metrics.processing})`, value: "inbound" },
              { label: `Completed (${metrics.completed})`, value: "completed" },
            ]}
          />

          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search GRN, PO, vendor, inv...  (/)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-lg py-1 pl-8 pr-7 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <Tooltip title="Refresh list">
              <Button
                size="small"
                icon={<RotateCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />}
                onClick={fetchGrns}
                disabled={loading}
                className="border-slate-200 text-slate-600 text-xs flex items-center rounded-lg h-7"
              >
                Sync
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Scrollable Table Area: Sticky Scrollbar enabled */}
        <div className="w-full flex-1 min-h-0 flex flex-col p-2 overflow-hidden">
          {loading ? (
            <CardioLoader />
          ) : (
            <Table
              dataSource={filteredData}
              columns={columns}
              rowKey="id"
              size="small"
              sticky={{ offsetScroll: 0 }}
              scroll={{ x: 1310, y: 270 }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                pageSizeOptions: ["10", "15", "25", "50"],
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} GRNs`,
                className: "px-2 py-1.5 text-xs m-0 shrink-0",
              }}
              locale={{
                emptyText: (
                  <div className="py-14 flex flex-col items-center gap-2">
                    <PackageSearch className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500 m-0">
                      {grnList.length === 0
                        ? "No inbound shipments yet"
                        : "No GRNs match your filters"}
                    </p>
                    {(searchTerm || statusFilter !== "all") && grnList.length > 0 && (
                      <Button size="small" onClick={clearFilters} className="text-xs mt-1">
                        Clear search & filters
                      </Button>
                    )}
                  </div>
                ),
              }}
              className="flex-1 flex flex-col justify-between [&_.ant-table-container]:rounded-lg"
            />
          )}
        </div>
      </div>

      {/* Expanded Inbound Modal */}
      <InboundProcessModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedGRN(null);
        }}
        grn={selectedGRN}
        onPrintLabels={handlePrintLabels}
        poid={poid}
        readOnly={(selectedGRN?.status || "").toLowerCase().includes("received") || (selectedGRN?.status || "").toLowerCase().includes("complete")}
      />
    </div>
  );
}