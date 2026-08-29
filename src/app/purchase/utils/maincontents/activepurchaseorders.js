"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { Eye, Pencil, Printer, Trash2, Search, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { message } from "antd";
import { useRouter } from "next/navigation";
import LogisticsModal from "./subcontents/LogisticsModal";
import ViewPurchaseOrderModal from "./subcontents/ViewPurchaseOrderModal";
import { Input } from "@/components/ui/input";

const TableRow = ({
  id,
  poId,
  vendor,
  date,
  status,
  logistics,
  onView,
  onEdit,
  onDelete,
  onPrint,
  onLogistics,
  onCreateCPO,
}) => (
  <tr className="hover:bg-slate-50 transition-colors group">
    <td className="px-4 py-4 font-bold text-slate-700">{id}</td>
    <td className="px-4 py-4 text-slate-600">{vendor}</td>
    <td className="px-4 py-4 text-slate-400 text-xs">{date}</td>

    <td className="px-4 py-4">
      <span
        className={`px-2 py-1 rounded text-[10px] font-bold text-white uppercase ${
          status === "approved"
            ? "bg-green-500"
            : status === "submitted"
              ? "bg-blue-500"
              : status === "draft"
                ? "bg-yellow-500"
                : "bg-red-500"
        }`}
      >
        {status}
      </span>
    </td>
    <td className="px-4 py-4">
      <button
        onClick={onLogistics}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition"
      >
        🚚{" "}
        {logistics?.shipmentCount > 0
          ? `${logistics.shipmentCount} Shipment${
              logistics.shipmentCount > 1 ? "s" : ""
            }`
          : "Add Shipment"}
      </button>
    </td>

    <td className="px-4 py-4">
      <div className="flex items-center gap-3">
        <button
          title="Create Corrected Purchase Order"
          style={{ color: "gray" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "purple";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "gray";
          }}
          onClick={onCreateCPO}
        >
          <div className="w-9 h-4 border border-current rounded-full flex items-center justify-center text-[8px] font-bold">
            G R N
          </div>
        </button>
        {/* VIEW */}
        <button
          onClick={onView}
          className="text-slate-500 hover:text-blue-600 transition"
          title="View"
        >
          <Eye size={16} />
        </button>

        {/* PRINT */}
        <button
          onClick={onPrint}
          className="text-slate-500 hover:text-yellow-600 transition"
          title="Print"
        >
          <Printer size={16} />
        </button>

        {/* EDIT */}
        <button
          onClick={onEdit}
          className="text-slate-500 hover:text-green-600 transition"
          title="Edit"
        >
          <Pencil size={16} />
        </button>

        {/* DELETE */}
        <button
          onClick={onDelete}
          className="text-slate-500 hover:text-red-600 transition"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </td>
  </tr>
);

export default function PurchaseOrdersTable() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [loadingPO, setLoadingPO] = useState(false);
  const [logisticsModalOpen, setLogisticsModalOpen] = useState(false);
  const [selectedLogisticsPO, setSelectedLogisticsPO] = useState(null);
  const [shipmentDrawerOpen, setShipmentDrawerOpen] = useState(false);
  const [transporters, setTransporters] = useState([]);
  const [shipments, setShipments] = useState([]);

  const router = useRouter();

  useEffect(() => {
    fetchTransporters();
    fetchPurchaseOrders();
  }, []);

  const fetchTransporters = async () => {
    try {
      const { data, error } = await supabase
        .from("transporters")
        .select("id, transporter_name")
        .eq("active", true)
        .order("transporter_name");

      if (error) throw error;
      setTransporters(data || []);
    } catch (err) {
      console.error("Transporter fetch error:", err);
    }
  };

  const [shipmentForm, setShipmentForm] = useState({
    transporter_id: null,
    lr_number: "",
    dispatch_date: null,
    expected_delivery_date: null,
    freight_amount: 0,
    shipment_status: "Pending Dispatch",
    no_of_boxes: 0,
    weight_kg: 0,
    remarks: "",
  });

  const fetchShipments = async (poId) => {
    try {
      const { data, error } = await supabase
        .schema("purchase")
        .from("shipments")
        .select("*")
        .eq("po_id", poId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setShipments(data || []);
    } catch (err) {
      console.error("Shipment Fetch Error:", err);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);

      const { data: poData, error: poError } = await supabase
        .schema("purchase")
        .from("purchase_orders")
        .select(
          `
          id,
          po_number,
          status,
          grand_total,
          total_qty,
          notes,
          created_at,
          supplier_id,
          shipping_address_id,
          qty_only_mode
        `,
        )
        .order("created_at", { ascending: false });

      if (poError) throw poError;

      const supplierIds = [
        ...new Set((poData || []).map((po) => po.supplier_id).filter(Boolean)),
      ];

      let vendorMap = {};
      if (supplierIds.length > 0) {
        const { data: vendorData, error: vendorError } = await supabase
          .from("vendors")
          .select("id, vendor_name")
          .in("id", supplierIds);

        if (vendorError) {
          console.error("Vendor fetch error:", vendorError);
        } else {
          vendorMap = (vendorData || []).reduce((acc, vendor) => {
            acc[vendor.id] = vendor.vendor_name;
            return acc;
          }, {});
        }
      }

      const poIds = (poData || []).map((po) => po.id);
      let shipmentCountsMap = {};

      if (poIds.length > 0) {
        const { data: shipmentData, error: shipmentError } = await supabase
          .schema("purchase")
          .from("shipments")
          .select("po_id");

        if (!shipmentError && shipmentData) {
          shipmentData.forEach((item) => {
            shipmentCountsMap[item.po_id] =
              (shipmentCountsMap[item.po_id] || 0) + 1;
          });
        }
      }

      const merged = (poData || []).map((po) => ({
        ...po,
        vendor_name: vendorMap[po.supplier_id] || "-",
        shipment_count: shipmentCountsMap[po.id] || 0,
      }));

      setPurchaseOrders(merged);
    } catch (err) {
      console.error("PO fetch error:", err);
      message.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  // Status counts calculation
  const tabCounts = useMemo(() => {
    return {
      all: purchaseOrders.length,
      waiting_lr: purchaseOrders.filter(
        (po) => po.status?.toLowerCase() === "waiting_lr",
      ).length,
      in_transit: purchaseOrders.filter(
        (po) => po.status?.toLowerCase() === "in_transit",
      ).length,
      at_destination: purchaseOrders.filter(
        (po) => po.status?.toLowerCase() === "at_destination",
      ).length,
      grn_created: purchaseOrders.filter(
        (po) => po.status?.toLowerCase() === "grn_created",
      ).length,
      inbound: purchaseOrders.filter(
        (po) => po.status?.toLowerCase() === "inbound",
      ).length,
      draft: purchaseOrders.filter((po) => po.status?.toLowerCase() === "draft")
        .length,
      completed: purchaseOrders.filter(
        (po) => po.status?.toLowerCase() === "completed",
      ).length,
    };
  }, [purchaseOrders]);

  // Combined Search and Tab Filtering
  const filteredPurchaseOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return purchaseOrders.filter((po) => {
      // Tab Filter
      const matchesTab =
        activeTab === "all" ||
        po.status?.toLowerCase() === activeTab.toLowerCase();

      // Search Filter
      const poNum = po.po_number?.toString().toLowerCase() || "";
      const vendorName = po.vendor_name?.toString().toLowerCase() || "";
      const matchesSearch =
        !query || poNum.includes(query) || vendorName.includes(query);

      return matchesTab && matchesSearch;
    });
  }, [purchaseOrders, searchTerm, activeTab]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this Purchase Order?");

    if (!confirmed) return;

    const { error } = await supabase
      .schema("purchase")
      .from("purchase_orders")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("FULL ERROR:", error);
      alert(error?.message || "Delete failed");
      return;
    }

    setPurchaseOrders((prev) => prev.filter((po) => po.id !== id));
  };

  const formatItem = (item) => {
    const qty = Number(item.qty || 0);
    const factor = Number(item.conversion_factor ?? item.conversionFactor ?? 1);
    const purchaseUnit = item.purchase_unit || item.purchaseUnit || "";
    const unit = item.unit || "";
    const convertedQty = qty * factor;

    return {
      ...item,
      baseQty: qty,
      conversionFactor: factor,
      convertedQty,
      purchaseUnit,
      unit,
      hasConversion: factor > 1,
    };
  };

  const handlePrint = async (poId) => {
    try {
      const { data: po, error: poError } = await supabase
        .schema("purchase")
        .from("purchase_orders")
        .select("*")
        .eq("id", poId)
        .single();

      if (poError) throw poError;

      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", po.supplier_id)
        .single();

      if (vendorError) throw vendorError;

      let shippingAddress = null;
      if (po.shipping_address_id) {
        const { data: addrData, error: addrError } = await supabase
          .from("company_addresses")
          .select("*")
          .eq("id", po.shipping_address_id)
          .single();

        if (addrError) throw addrError;
        shippingAddress = addrData;
      }

      const { data: rawItems, error: itemsError } = await supabase
        .schema("purchase")
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", poId)
        .order("created_at");

      if (itemsError) throw itemsError;

      const productIds = Array.from(
        new Set((rawItems || []).map((i) => i.product_id).filter(Boolean)),
      );

      let itemMasterMap = {};
      if (productIds.length > 0) {
        const { data: masterData, error: masterError } = await supabase
          .from("item_master")
          .select("id, uom")
          .in("id", productIds);

        if (masterError) throw masterError;

        (masterData || []).forEach((row) => {
          itemMasterMap[row.id] = row.uom;
        });
      }

      const integratedItems = (rawItems || []).map((item) => ({
        ...item,
        item_master: item.product_id
          ? { uom: itemMasterMap[item.product_id] || "" }
          : null,
      }));

      const formattedItems = integratedItems.map(formatItem);

      const subtotal = formattedItems.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );
      const totalTax = formattedItems.reduce(
        (sum, item) =>
          sum + (Number(item.amount || 0) * Number(item.tax || 0)) / 100,
        0,
      );
      const grandTotal = subtotal + totalTax;

      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Exor Medical Systems", 14, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Purchase Department", 14, 24);
      doc.text("Kerala, India", 14, 29);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("PURCHASE ORDER", pageWidth - 14, 18, { align: "right" });

      doc.setFontSize(11);
      doc.text(`PO No : ${po.po_number}`, pageWidth - 14, 26, {
        align: "right",
      });

      const body = [];

      body.push([
        {
          content: "BILL TO\n\nExor Medical Systems\nKerala, India",
          colSpan: po.qty_only_mode === true ? 2 : 3,
          styles: { minCellHeight: 30, valign: "top", fontStyle: "bold" },
        },
        {
          content:
            "VENDOR\n\n" +
            `${vendor.vendor_name || ""}\n` +
            `${vendor.address || ""}\n` +
            `${vendor.mobile_number || ""}`,
          colSpan: po.qty_only_mode === true ? 2 : 4,
          styles: { minCellHeight: 30, valign: "top" },
        },
      ]);

      body.push([
        {
          content:
            "SHIP TO\n\n" +
            `${shippingAddress?.company_name || ""}\n` +
            `${shippingAddress?.address_line1 || ""}\n` +
            `${shippingAddress?.address_line2 || ""}\n` +
            `${shippingAddress?.city || ""}, ${shippingAddress?.state || ""}\n` +
            `${shippingAddress?.pincode || ""}`,
          colSpan: po.qty_only_mode === true ? 2 : 3,
          styles: { minCellHeight: 35, valign: "top" },
        },
        {
          content:
            "PO DETAILS\n\n" +
            `PO No : ${po.po_number}\n` +
            `Date : ${new Date(po.created_at).toLocaleDateString("en-IN")}\n` +
            `Status : ${po.status}\n` +
            `Total Qty : ${Number(po.total_qty || 0).toFixed(2)}`,
          colSpan: po.qty_only_mode === true ? 2 : 4,
          styles: { minCellHeight: 35, valign: "top" },
        },
      ]);

      if (po.qty_only_mode === true) {
        body.push(["Code", "Item", "Pur Unit", "Qty", "Conversion Mapping"]);
      } else {
        body.push([
          "Code",
          "Item",
          "Pur Unit",
          "Qty",
          "Rate",
          "Tax %",
          "Amount / Conversion",
        ]);
      }

      const productRowOffset = body.length;
      const activeLabels = [];

      formattedItems.forEach((item) => {
        const conversionString = item.hasConversion
          ? `${Number(item.baseQty).toFixed(2)} ${item.purchaseUnit} = ${Number(item.convertedQty).toFixed(2)} ${item.unit}`
          : `1 ${item.unit} = 1 ${item.unit}`;

        const cf = Number(item.conversion_factor || 1);
        const qty = Number(item.qty || 1);
        const uomText = item.item_master?.uom || "UOM";

        let dynamicLabelText = "";
        let namePlaceholder = item.product_name || "";

        if (cf > 1) {
          const totalConvertedBase = (qty * cf).toFixed(2);
          dynamicLabelText = `${qty} ${item.unit || "Unit"} = ${totalConvertedBase} ${uomText}`;
          namePlaceholder += "\n ";
        }

        activeLabels.push(dynamicLabelText);

        if (po.qty_only_mode === true) {
          body.push([
            item.product_code || "",
            namePlaceholder,
            item.purchaseUnit || item.unit || "",
            Number(item.qty || 0).toFixed(2),
            conversionString,
          ]);
        } else {
          const amountDisplay = item.hasConversion
            ? `${Number(item.amount || 0).toFixed(2)}\n(${conversionString})`
            : Number(item.amount || 0).toFixed(2);

          body.push([
            item.product_code || "",
            namePlaceholder,
            item.purchaseUnit || item.unit || "",
            Number(item.qty || 0).toFixed(2),
            Number(item.rate || 0).toFixed(2),
            Number(item.tax || 0).toFixed(2),
            amountDisplay,
          ]);
        }
      });

      if (po.qty_only_mode !== true) {
        body.push(
          [
            { content: `NOTES\n\n${po.notes || "-"}`, colSpan: 5, rowSpan: 3 },
            "Subtotal",
            subtotal.toFixed(2),
          ],
          ["Tax", totalTax.toFixed(2)],
          ["Grand Total", grandTotal.toFixed(2)],
        );
      }

      body.push([
        {
          content: "\n\nPrepared By",
          colSpan: po.qty_only_mode === true ? 2 : 5,
          styles: { minCellHeight: 25, valign: "bottom" },
        },
        {
          content: "\n\n____________________\nAuthorized Signature",
          colSpan: po.qty_only_mode === true ? 2 : 2,
          styles: { halign: "center", valign: "bottom", minCellHeight: 25 },
        },
      ]);

      autoTable(doc, {
        startY: 40,
        theme: "grid",
        body,
        styles: { fontSize: 9, cellPadding: 3 },
        didDrawCell: (data) => {
          if (
            data.row.index >= productRowOffset &&
            data.row.index < productRowOffset + formattedItems.length &&
            data.column.index === 1
          ) {
            const itemRelativeIndex = data.row.index - productRowOffset;
            const targetString = activeLabels[itemRelativeIndex];

            if (targetString) {
              doc.saveGraphicsState();
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(115, 103, 240);

              const indentX = data.cell.x + 4;
              const textY = data.cell.y + data.cell.height - 4;

              doc.text(targetString, indentX, textY);
              doc.restoreGraphicsState();
            }
          }
        },
      });

      doc.setFontSize(8);
      doc.text(
        "Generated from Purchase Management System",
        pageWidth / 2,
        290,
        { align: "center" },
      );

      doc.save(`${po.po_number}-${vendor.vendor_name || "Vendor"}.pdf`);
    } catch (error) {
      alert("Failed to generate Purchase Order PDF.");
    }
  };

  const handleView = async (poId) => {
    try {
      setLoadingPO(true);

      const { data: po, error: poError } = await supabase
        .schema("purchase")
        .from("purchase_orders")
        .select("*")
        .eq("id", poId)
        .single();

      if (poError) throw poError;

      const { data: vendor } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", po.supplier_id)
        .single();

      let shippingAddress = null;
      if (po.shipping_address_id) {
        const { data } = await supabase
          .from("company_addresses")
          .select("*")
          .eq("id", po.shipping_address_id)
          .single();

        shippingAddress = data;
      }

      const { data: rawItems } = await supabase
        .schema("purchase")
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", poId)
        .order("created_at");

      const productIds = Array.from(
        new Set((rawItems || []).map((i) => i.product_id).filter(Boolean)),
      );

      let itemMasterMap = {};
      if (productIds.length > 0) {
        const { data: masterData } = await supabase
          .from("item_master")
          .select("id, uom")
          .in("id", productIds);

        (masterData || []).forEach((row) => {
          itemMasterMap[row.id] = row.uom;
        });
      }

      const integratedItems = (rawItems || []).map((item) => ({
        ...item,
        item_master: item.product_id
          ? { uom: itemMasterMap[item.product_id] || "" }
          : null,
      }));

      const formattedItems = integratedItems.map(formatItem);

      setSelectedPO({
        po,
        vendor,
        shippingAddress,
        items: formattedItems,
      });

      setViewModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Failed to load Purchase Order");
    } finally {
      setLoadingPO(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-500">
        Loading purchase orders...
      </div>
    );
  }

  const openLogisticsModal = async (po) => {
    setSelectedLogisticsPO(po);
    await fetchShipments(po.id);
    setLogisticsModalOpen(true);
  };

  const handleTrackShipment = async (shipment) => {
    try {
      if (shipment.lr_number) {
        await navigator.clipboard.writeText(shipment.lr_number);
        message.success("LR number copied to clipboard");
      }
      window.open(shipment.tracking_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      window.open(shipment.tracking_url, "_blank", "noopener,noreferrer");
    }
  };

  const saveShipment = async () => {
    try {
      if (!selectedLogisticsPO?.id) {
        alert("Please select a Purchase Order");
        return;
      }

      if (!shipmentForm.transporter_id) {
        alert("Please select transporter");
        return;
      }

      const { data: transporter, error: transporterError } = await supabase
        .from("transporters")
        .select("*")
        .eq("id", shipmentForm.transporter_id)
        .single();

      if (transporterError) throw transporterError;

      const trackingUrl = transporter?.tracking_base_url ?? null;

      const { error } = await supabase
        .schema("purchase")
        .from("shipments")
        .insert({
          po_id: selectedLogisticsPO.id,
          transporter_id: transporter.id,
          transporter: transporter.transporter_name,
          lr_number: shipmentForm.lr_number || null,
          shipment_status: shipmentForm.shipment_status || "Pending Dispatch",
          dispatch_date: shipmentForm.dispatch_date || null,
          expected_delivery_date: shipmentForm.expected_delivery_date || null,
          no_of_boxes: Number(shipmentForm.no_of_boxes || 0),
          weight_kg: Number(shipmentForm.weight_kg || 0),
          tracking_url: trackingUrl,
          remarks: shipmentForm.remarks?.trim() || null,
        });

      if (error) throw error;

      setShipmentForm({
        transporter_id: null,
        lr_number: "",
        dispatch_date: null,
        expected_delivery_date: null,
        shipment_status: "Pending Dispatch",
        no_of_boxes: 0,
        weight_kg: 0,
        remarks: "",
      });

      alert("Shipment added successfully");
      await fetchShipments(selectedLogisticsPO.id);
      await fetchPurchaseOrders();
      setShipmentDrawerOpen(false);
    } catch (err) {
      console.log("SAVE SHIPMENT ERROR:", err);
      alert(err?.message || "Failed to save shipment");
    }
  };

  const tabs = [
    { key: "all", label: "All POs", count: tabCounts.all },
    { key: "waiting_lr", label: "Waiting LR", count: tabCounts.waiting_lr },
    { key: "in_transit", label: "In Transit", count: tabCounts.in_transit },
    {
      key: "at_destination",
      label: "At Destination",
      count: tabCounts.at_destination,
    },
    { key: "grn_created", label: "Grn Created", count: tabCounts.grn_created },
    { key: "inbound", label: "Inbound", count: tabCounts.inbound },
    { key: "draft", label: "Draft", count: tabCounts.draft },
    { key: "completed", label: "Completed", count: tabCounts.completed },
  ];

  return (
    <div>
  <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
    <section className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden w-full">
      {/* Card Header: Title & Search Bar */}
      <div className="p-4 border-b border-slate-100 shrink-0 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title */}
        <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider shrink-0">
          Purchase Orders
        </h2>

        {/* Search Bar - Full Width on Mobile, Fixed/Auto Width on Larger Screens */}
        <div className="relative flex items-center w-full sm:w-72">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search PO # or Vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs bg-white border-slate-300 rounded-md focus-visible:ring-1 focus-visible:ring-sky-500 w-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Row - Full Width Below Header */}
      <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1.5 w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200/80 font-semibold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.key
                    ? "bg-slate-100 text-slate-700 font-bold"
                    : "bg-slate-200/60 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Table Container */}
      <div
        style={{ height: "380px", overflowY: "auto", display: "block" }}
        className="w-full custom-scrollbar"
      >
        <table className="w-full text-left text-sm border-collapse table-auto">
          {/* Table Header */}
          <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
            <tr>
              <th className="px-4 py-3 bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                PO #
              </th>
              <th className="px-4 py-3 bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                Vendor
              </th>
              <th className="px-4 py-3 bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                Date
              </th>
              <th className="px-4 py-3 bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                Status
              </th>
              <th className="px-4 py-3 bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                Logistics
              </th>
              <th className="px-6 py-3 bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                Action
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredPurchaseOrders.length > 0 ? (
              filteredPurchaseOrders.map((po) => (
                <TableRow
                  key={po.id}
                  id={po.po_number}
                  poId={po.id}
                  vendor={po.vendor_name}
                  date={new Date(po.created_at).toLocaleDateString("en-IN")}
                  status={po.status}
                  logistics={{
                    shipmentCount: po.shipment_count || 0,
                  }}
                  onView={() => handleView(po.id)}
                  onPrint={() => handlePrint(po.id)}
                  onEdit={() => router.push(`/purchase/editpo/${po.id}`)}
                  onDelete={() => handleDelete(po.id)}
                  onLogistics={() => openLogisticsModal(po)}
                  onCreateCPO={() => router.push(`/purchase/grn/${po.id}`)}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-8 text-slate-500 text-xs"
                >
                  {searchTerm
                    ? `No results found for "${searchTerm}" under ${activeTab.toUpperCase()} filter`
                    : `No purchase orders found in status "${activeTab}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  </div>

  {/* View Modal */}
  <ViewPurchaseOrderModal
    viewModalOpen={viewModalOpen}
    setViewModalOpen={setViewModalOpen}
    loadingPO={loadingPO}
    selectedPO={selectedPO}
  />

  {/* Logistics Modal */}
  <LogisticsModal
    logisticsModalOpen={logisticsModalOpen}
    setLogisticsModalOpen={setLogisticsModalOpen}
    selectedLogisticsPO={selectedLogisticsPO}
    shipments={shipments}
    setShipmentDrawerOpen={setShipmentDrawerOpen}
    handleTrackShipment={handleTrackShipment}
    shipmentDrawerOpen={shipmentDrawerOpen}
    shipmentForm={shipmentForm}
    setShipmentForm={setShipmentForm}
    transporters={transporters}
    saveShipment={saveShipment}
  />
</div>
  );
}
