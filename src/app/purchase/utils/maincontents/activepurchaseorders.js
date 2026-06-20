"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Eye, Pencil, Printer, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { message } from "antd";
import { useRouter } from "next/navigation";
import LogisticsModal from "./subcontents/LogisticsModal";
import ViewPurchaseOrderModal from "./subcontents/ViewPurchaseOrderModal";

const TableRow = ({
  id,
  vendor,
  date,
  amount,
  status,
  logistics,
  onView,
  onEdit,
  onDelete,
  onPrint,
  onLogistics,
}) => (
  <tr className="hover:bg-slate-50 transition-colors group">
    <td className="px-4 py-4 font-bold text-slate-700">{id}</td>
    <td className="px-4 py-4 text-slate-600">{vendor}</td>
    <td className="px-4 py-4 text-slate-400 text-xs">{date}</td>

    <td className="px-4 py-4 font-medium text-slate-700">{amount}</td>

    <td className="px-4 py-4">
      <span
        className={`px-2 py-1 rounded text-[10px] font-bold text-white ${
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
        className="
      inline-flex
      items-center
      gap-2
      px-3
      py-1.5
      rounded-full
      bg-sky-50
      text-sky-700
      text-xs
      font-semibold
      hover:bg-sky-100
      transition
    "
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
  }, []);

  const fetchTransporters = async () => {
    const { data } = await supabase
      .from("transporters")
      .select("id, transporter_name")
      .eq("active", true)
      .order("transporter_name");

    setTransporters(data || []);
  };
  const [shipmentForm, setShipmentForm] = useState({
    transporter_id: null,
    lr_number: "",
    dispatch_date: null,
    expected_delivery_date: null,
    freight_amount: 0,
    shipment_status: "Pending Dispatch",
    remarks: "",
  });
  useEffect(() => {
    fetchPurchaseOrders();
    fetchTransporters();
  }, []);

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
        created_at,
        supplier_id,
        shipping_address_id,
        qty_only_mode
      `,
      )
      .order("created_at", { ascending: false });

    if (poError) {
      console.error("PO fetch error:", poError);
      setLoading(false);
      return;
    }

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

    const merged = (poData || []).map((po) => ({
      ...po,
      vendor_name: vendorMap[po.supplier_id] || "-",
    }));

    setPurchaseOrders(merged);
    setLoading(false);
  };

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
      console.log("MESSAGE:", error?.message);
      console.log("DETAILS:", error?.details);
      console.log("HINT:", error?.hint);
      console.log("CODE:", error?.code);

      alert(error?.message || "Delete failed");
      return;
    }

    setPurchaseOrders((prev) => prev.filter((po) => po.id !== id));
  };

  const handlePrint = async (poId) => {
    try {
      // =====================================================
      // FETCH PO
      // =====================================================
      const { data: po, error: poError } = await supabase
        .schema("purchase")
        .from("purchase_orders")
        .select("*")
        .eq("id", poId)
        .single();

      if (poError) throw poError;

      // =====================================================
      // FETCH VENDOR
      // =====================================================
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", po.supplier_id)
        .single();

      if (vendorError) throw vendorError;

      // =====================================================
      // FETCH SHIPPING ADDRESS
      // =====================================================
      let shippingAddress = null;

      if (po.shipping_address_id) {
        const { data } = await supabase
          .from("company_addresses")
          .select("*")
          .eq("id", po.shipping_address_id)
          .single();

        shippingAddress = data;
      }

      // =====================================================
      // FETCH ITEMS
      // =====================================================
      const { data: items, error: itemsError } = await supabase
        .schema("purchase")
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", poId)
        .order("created_at");

      if (itemsError) throw itemsError;

      const isQtyOnly = po.qty_only_mode === true;

      // =====================================================
      // CALCULATIONS
      // =====================================================
      const subtotal = items.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );

      const totalTax = items.reduce(
        (sum, item) =>
          sum + (Number(item.amount || 0) * Number(item.tax || 0)) / 100,
        0,
      );

      const grandTotal = subtotal + totalTax;

      // =====================================================
      // PDF
      // =====================================================
      const doc = new jsPDF("p", "mm", "a4");

      const pageWidth = doc.internal.pageSize.getWidth();

      // =====================================================
      // HEADER
      // =====================================================
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

      // =====================================================
      // BODY
      // =====================================================
      const body = [];

      // =====================================================
      // BILL TO / VENDOR
      // =====================================================
      body.push([
        {
          content: "BILL TO\n\n" + "Exor Medical Systems\n" + "Kerala, India",

          colSpan: isQtyOnly ? 2 : 3,

          styles: {
            minCellHeight: 30,
            valign: "top",
            fontStyle: "bold",
          },
        },

        {
          content:
            "VENDOR\n\n" +
            `${vendor.vendor_name || ""}\n` +
            `${vendor.address || ""}\n` +
            `${vendor.mobile_number || ""}`,

          colSpan: isQtyOnly ? 2 : 4,

          styles: {
            minCellHeight: 30,
            valign: "top",
          },
        },
      ]);

      // =====================================================
      // SHIP TO
      // =====================================================
      body.push([
        {
          content:
            "SHIP TO\n\n" +
            `${shippingAddress?.company_name || ""}\n` +
            `${shippingAddress?.address_line1 || ""}\n` +
            `${shippingAddress?.address_line2 || ""}\n` +
            `${shippingAddress?.city || ""}, ${shippingAddress?.state || ""}\n` +
            `${shippingAddress?.pincode || ""}`,

          colSpan: isQtyOnly ? 2 : 3,

          styles: {
            minCellHeight: 35,
            valign: "top",
          },
        },

        {
          content:
            "PO DETAILS\n\n" +
            `PO No : ${po.po_number}\n` +
            `Date : ${new Date(po.created_at).toLocaleDateString("en-IN")}\n` +
            `Status : ${po.status}\n` +
            `Total Qty : ${Number(po.total_qty || 0).toFixed(2)}`,

          colSpan: isQtyOnly ? 2 : 4,

          styles: {
            minCellHeight: 35,
            valign: "top",
          },
        },
      ]);

      // =====================================================
      // ITEM HEADER
      // =====================================================
      if (isQtyOnly) {
        body.push(["Code", "Item", "Unit", "Qty"]);
      } else {
        body.push(["Code", "Item", "Unit", "Qty", "Rate", "Tax %", "Amount"]);
      }

      // =====================================================
      // ITEMS
      // =====================================================
      items.forEach((item) => {
        if (isQtyOnly) {
          body.push([
            item.product_code || "",
            item.product_name || "",
            item.unit || "",
            Number(item.qty || 0).toFixed(2),
          ]);
        } else {
          body.push([
            item.product_code || "",
            item.product_name || "",
            item.unit || "",
            Number(item.qty || 0).toFixed(2),
            Number(item.rate || 0).toFixed(2),
            Number(item.tax || 0).toFixed(2),
            Number(item.amount || 0).toFixed(2),
          ]);
        }
      });

      // =====================================================
      // TOTALS
      // =====================================================
      if (!isQtyOnly) {
        body.push(
          [
            {
              content: `NOTES\n\n${po.notes || "-"}`,
              colSpan: 5,
              rowSpan: 3,
            },
            "Subtotal",
            subtotal.toFixed(2),
          ],
          ["Tax", totalTax.toFixed(2)],
          ["Grand Total", grandTotal.toFixed(2)],
        );
      }

      // =====================================================
      // SIGNATURE
      // =====================================================
      body.push([
        {
          content: "\n\nPrepared By",
          colSpan: isQtyOnly ? 2 : 5,
          styles: {
            minCellHeight: 25,
            valign: "bottom",
          },
        },
        {
          content: "\n\n____________________\nAuthorized Signature",
          colSpan: isQtyOnly ? 2 : 2,
          styles: {
            halign: "center",
            valign: "bottom",
            minCellHeight: 25,
          },
        },
      ]);

      // =====================================================
      // TABLE
      // =====================================================
      autoTable(doc, {
        startY: 40,
        theme: "grid",
        body,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
      });

      // =====================================================
      // FOOTER
      // =====================================================
      doc.setFontSize(8);

      doc.text(
        "Generated from Purchase Management System",
        pageWidth / 2,
        290,
        {
          align: "center",
        },
      );

      // =====================================================
      // FILE NAME
      // =====================================================
      const supplierName = (vendor.vendor_name || "Vendor")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      doc.save(`${po.po_number}-${supplierName}.pdf`);
    } catch (error) {
      console.error("Purchase Order PDF Error:", error);

      alert("Failed to generate Purchase Order PDF");
    }
  };

  const handleView = async (poId) => {
    try {
      setLoadingPO(true);

      // ==========================
      // PO
      // ==========================
      const { data: po, error: poError } = await supabase
        .schema("purchase")
        .from("purchase_orders")
        .select("*")
        .eq("id", poId)
        .single();

      if (poError) throw poError;

      // ==========================
      // Vendor
      // ==========================
      const { data: vendor } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", po.supplier_id)
        .single();

      // ==========================
      // Shipping Address
      // ==========================
      let shippingAddress = null;

      if (po.shipping_address_id) {
        const { data } = await supabase
          .from("company_addresses")
          .select("*")
          .eq("id", po.shipping_address_id)
          .single();

        shippingAddress = data;
      }

      // ==========================
      // Items
      // ==========================
      const { data: items } = await supabase
        .schema("purchase")
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", poId)
        .order("created_at");

      setSelectedPO({
        po,
        vendor,
        shippingAddress,
        items: items || [],
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
      // =========================
      // VALIDATION
      // =========================

      if (!selectedLogisticsPO?.id) {
        alert("Please select a Purchase Order");
        return;
      }

      if (!shipmentForm.transporter_id) {
        alert("Please select transporter");
        return;
      }

      // =========================
      // GET TRANSPORTER
      // =========================

      const { data: transporter, error: transporterError } = await supabase
        .from("transporters")
        .select("*")
        .eq("id", shipmentForm.transporter_id)
        .single();

      if (transporterError) throw transporterError;

      // =========================
      // BUILD TRACKING URL
      // =========================

    const trackingUrl = transporter?.tracking_base_url ?? null;
      // =========================
      // SAVE SHIPMENT
      // =========================

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

      // =========================
      // RESET FORM
      // =========================

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
      setShipmentDrawerOpen(false);

      // optional
      // fetchShipments(selectedLogisticsPO.id);
    } catch (err) {
      console.log("FULL ERROR:", err);
      console.log("MESSAGE:", err?.message);
      console.log("DETAILS:", err?.details);
      console.log("HINT:", err?.hint);
      console.log("CODE:", err?.code);

      alert(err?.message || "Failed to save shipment");
    }
  };
  return (
    <div>
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50">
          <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
            Active Purchase Orders
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">PO #</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 ">Logistics</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.length > 0 ? (
                purchaseOrders.map((po) => (
                  <TableRow
                    key={po.id}
                    id={po.po_number}
                    vendor={po.vendor_name}
                    date={new Date(po.created_at).toLocaleDateString("en-IN")}
                    amount={
                      po.qty_only_mode ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-600 font-medium">
                          Qty Only
                        </span>
                      ) : (
                        `₹${Number(po.grand_total || 0).toLocaleString("en-IN")}`
                      )
                    }
                    status={po.status}
                    logistics={{
                      shipmentCount: 0,
                    }}
                    onView={() => handleView(po.id)}
                    onPrint={() => handlePrint(po.id)}
                    onEdit={() => router.push(`/purchase/editpo/${po.id}`)}
                    onDelete={() => handleDelete(po.id)}
                    onLogistics={() => openLogisticsModal(po)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No purchase orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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
