'use client';

import React, { useState, useEffect } from 'react';
import { Truck, MapPin, ChevronRight, ChevronLeft, CheckCircle2, X, Check, AlertCircle, Package, Printer, RotateCcw } from 'lucide-react';
import { Helix } from 'ldrs/react';
import 'ldrs/react/Helix.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../../lib/supabase';
import UpdateLocationModal from './UpdateLocationModal';
import dayjs from "dayjs";

const getLocalStartOfTodayISO = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return startOfDay.toISOString();
};

// Safe helper: trims, lowercases, and checks for 'at_destination'
const isAtDestination = (status) => {
  if (!status) return false;
  const clean = String(status).trim().toLowerCase();
  return clean === 'at_destination';
};

export default function InTransitQueueModal({ isOpen, onClose, onWorkflowComplete }) {
  const [inTransitShipments, setInTransitShipments] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [todayReceivingData, setTodayReceivingData] = useState([]);

  const fetchInTransitShipments = async () => {
    try {
      setLoading(true);

      // 1. Fetch in-transit purchase orders
      const { data: pos, error: poError } = await supabase
        .schema('purchase')
        .from('purchase_orders')
        .select('id, po_number, status, updated_at, supplier_id')
        .eq('status', 'in_transit')
        .order('updated_at', { ascending: true });

      if (poError) throw poError;

      if (!pos || pos.length === 0) {
        setInTransitShipments([]);
        return;
      }

      const poIds = pos.map((p) => p.id);
      const supplierIds = Array.from(new Set(pos.map((p) => p.supplier_id).filter(Boolean)));

      // 2. Fetch Vendors and Shipments in parallel
      const [vendorRes, shipmentRes] = await Promise.all([
        supplierIds.length > 0
          ? supabase.from('vendors').select('id, vendor_name').in('id', supplierIds)
          : Promise.resolve({ data: [] }),
        supabase
          .schema('purchase')
          .from('shipments')
          .select('id, po_id, transporter, lr_number, tracking_url, no_of_boxes')
          .in('po_id', poIds)
          .not('lr_number', 'is', null)
          .order('created_at', { ascending: true }),
      ]);

      if (vendorRes.error) throw vendorRes.error;
      if (shipmentRes.error) throw shipmentRes.error;

      const vendorMap = (vendorRes.data || []).reduce((acc, v) => {
        acc[v.id] = v.vendor_name;
        return acc;
      }, {});

      const poMap = pos.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});

      const shipments = shipmentRes.data || [];
      const shipmentIds = shipments.map((s) => s.id);

      // 3. Fetch tracking events (get the latest event overall per shipment)
      let updatedShipmentIdsSet = new Set();
      let latestEventMap = {};

      if (shipmentIds.length > 0) {
        const { data: events, error: eventError } = await supabase
          .schema('purchase')
          .from('shipment_tracking_events')
          .select('shipment_id, status, location, remarks, event_time')
          .in('shipment_id', shipmentIds)
          .order('event_time', { ascending: false });

        if (eventError) throw eventError;

        const startOfTodayIso = getLocalStartOfTodayISO();

        (events || []).forEach((e) => {
          // Keep the newest event for current status/location details
          if (!latestEventMap[e.shipment_id]) {
            latestEventMap[e.shipment_id] = e;
          }

          // Check if an event was created today
          if (e.event_time && new Date(e.event_time) >= new Date(startOfTodayIso)) {
            updatedShipmentIdsSet.add(e.shipment_id);
          }
        });
      }

      // 4. Flatten the queue per shipment/LR (1 row per LR)
      const formatted = shipments.map((s) => {
        const parentPO = poMap[s.po_id] || {};
        const latestEvent = latestEventMap[s.id] || null;

        return {
          id: parentPO.id,
          shipment_id: s.id,
          po_number: parentPO.po_number || 'N/A',
          status: parentPO.status || 'in_transit',
          supplier_id: parentPO.supplier_id,
          vendor_name: vendorMap[parentPO.supplier_id] || 'N/A',
          lr: s.lr_number?.trim() || 'No LR',
          transporter: s.transporter?.trim() || 'N/A',
          no_of_boxes: Number(s.no_of_boxes) || 0,
          tracking_url: s.tracking_url || null,
          updatedToday: updatedShipmentIdsSet.has(s.id),
          todayStatus: latestEvent?.status || null,
          todayLocation: latestEvent?.location || '-',
          todayRemarks: latestEvent?.remarks || '-',
          todayEventTime: latestEvent?.event_time || null,
        };
      });

      setInTransitShipments(formatted);
      setCurrentIndex(0);
      setIsCompleted(false);
    } catch (err) {
      console.error('Error loading in-transit queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInTransitShipments();
      setIsCompleted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentShipment = inTransitShipments[currentIndex];
  const pendingShipments = inTransitShipments.filter((p) => !p.updatedToday);
  const isAllUpdatedToday = inTransitShipments.length > 0 && pendingShipments.length === 0;

  const handleNext = () => {
    if (loading || activeAction) return;
    if (currentIndex < inTransitShipments.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    if (loading || activeAction) return;
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleOpenUpdate = async () => {
    if (loading || activeAction || !currentShipment?.id) return;

    if (currentShipment.updatedToday) {
      const confirmRedo = window.confirm(
        `LR (${currentShipment.lr}) was already updated today.\n\nDo you want to add another tracking entry or overwrite location notes?`
      );
      if (!confirmRedo) return;
    }

    try {
      setActiveAction('open-update');

      if (currentShipment.lr && currentShipment.lr !== 'No LR') {
        await navigator.clipboard.writeText(currentShipment.lr);
      }

      if (currentShipment.tracking_url) {
        const formattedUrl =
          currentShipment.tracking_url.startsWith('http://') ||
            currentShipment.tracking_url.startsWith('https://')
            ? currentShipment.tracking_url
            : `https://${currentShipment.tracking_url}`;

        window.open(formattedUrl, '_blank', 'noopener,noreferrer');
      }

      setIsUpdateOpen(true);
    } catch (err) {
      console.error('Error opening tracking modal:', err);
    } finally {
      setActiveAction(null);
    }
  };

  const handleUpdateSuccess = (updatedData) => {
    setIsUpdateOpen(false);

    // 1. Mark current shipment updated locally with new values
    setInTransitShipments((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex
          ? {
            ...item,
            updatedToday: true,
            todayStatus: updatedData?.status || item.todayStatus,
            todayLocation: updatedData?.location || item.todayLocation,
            todayRemarks: updatedData?.remarks || item.todayRemarks,
            todayEventTime: updatedData?.event_time || new Date().toISOString(),
          }
          : item
      )
    );

    // 2. Advance automatically to the next item
    if (currentIndex >= inTransitShipments.length - 1) {
      setIsCompleted(true);
      if (onWorkflowComplete) onWorkflowComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Generate & Print Daily LR Tracking PDF Report
const handlePrintSummary = async () => {
  const pending = inTransitShipments.filter((p) => !p.updatedToday);

  if (pending.length > 0) {
    alert(
      `Cannot print summary report yet!\n\nThere are still ${pending.length} LR(s) pending updates today.\nPlease review and update all shipments first.`
    );
    return;
  }

  try {
    setGeneratingPdf(true);

    // --------------------------------------------------
    // FETCH FRESH RECEIVING DATA
    // --------------------------------------------------
    const receivingTodayShipments = await fetchTodayReceiving();

    console.log("Receiving Today:", receivingTodayShipments);

    // --------------------------------------------------
    // CREATE PDF
    // --------------------------------------------------
    const doc = new jsPDF("p", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const todayFormatted = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // ==================================================
    // 1. MAIN HEADER
    // ==================================================

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59);

    doc.text(
      "Daily In-Transit LR Tracking Summary",
      14,
      16
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90);

    doc.text(
      `Generated Date: ${todayFormatted} | Total LRs Checked: ${inTransitShipments.length}`,
      14,
      22
    );

    let currentStartY = 29;

    // ==================================================
    // 2. DETAILS OF BOXES RECEIVING TODAY
    // ==================================================

    const totalReceivingBoxes = receivingTodayShipments.reduce(
      (sum, shipment) => sum + Number(shipment.boxes || 0),
      0
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(16, 107, 72);

    doc.text(
      `Details of boxes receiving today (${totalReceivingBoxes} Boxes across ${receivingTodayShipments.length} LRs)`,
      14,
      currentStartY
    );

    const receivingHeaders = [
      [
        "Supplier / Party",
        "PO Number",
        "LR / Bilty No.",
        "Boxes",
        "Transporter",
        "Location",
        "Remarks",
      ],
    ];

    const receivingRows =
      receivingTodayShipments.length > 0
        ? receivingTodayShipments.map((p) => [
            p.vendor_name || "-",
            p.po_number || "-",
            p.lr_number || "-",
            Number(p.boxes || 0),
            p.transporter || "-",
            "At Destination",
            p.remarks || "-",
          ])
        : [
            [
              "-",
              "-",
              "-",
              0,
              "-",
              "No shipments at destination today",
              "-",
            ],
          ];

    autoTable(doc, {
      startY: currentStartY + 4,

      head: receivingHeaders,
      body: receivingRows,

      theme: "grid",

      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "middle",
      },

      headStyles: {
        fillColor: [16, 149, 99],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },

      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 22, fontStyle: "bold" },
        2: { cellWidth: 26, fontStyle: "bold" },
        3: {
          cellWidth: 14,
          halign: "center",
          fontStyle: "bold",
        },
        4: { cellWidth: 24 },
        5: { cellWidth: 28 },
        6: { cellWidth: "auto" },
      },

      didDrawPage: (data) => {
        currentStartY = data.cursor.y + 10;
      },
    });

    currentStartY = doc.lastAutoTable.finalY + 12;

    // ==================================================
    // 3. TRANSPORTER-WISE TRACKING BREAKDOWN
    // ==================================================

    // Group shipments by transporter
    const groupedByTransporter = inTransitShipments.reduce(
      (acc, shipment) => {
        const transporterKey =
          shipment.transporter &&
          shipment.transporter !== "N/A"
            ? shipment.transporter
            : "Unassigned / Direct";

        if (!acc[transporterKey]) {
          acc[transporterKey] = [];
        }

        acc[transporterKey].push(shipment);

        return acc;
      },
      {}
    );

    // --------------------------------------------------
    // TRANSPORTER SECTIONS
    // --------------------------------------------------

    Object.entries(groupedByTransporter).forEach(
      ([transporterName, items]) => {
        const totalBoxes = items.reduce(
          (sum, item) =>
            sum + Number(item.no_of_boxes || 0),
          0
        );

        // ----------------------------------------------
        // PAGE BREAK CHECK
        // ----------------------------------------------

        if (currentStartY > 250) {
          doc.addPage();
          currentStartY = 20;
        }

        // ----------------------------------------------
        // TRANSPORTER HEADING
        // ----------------------------------------------

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);

        doc.text(
          `Transporter: ${transporterName}`,
          14,
          currentStartY
        );

        // ----------------------------------------------
        // TRANSPORTER SUMMARY
        // ----------------------------------------------

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(90);

        doc.text(
          `${items.length} ${
            items.length === 1 ? "LR" : "LRs"
          } | ${totalBoxes} Boxes`,
          14,
          currentStartY + 5
        );

        // ----------------------------------------------
        // TABLE HEADERS
        // ----------------------------------------------

        const tableHeaders = [
          [
            "Supplier / Party",
            "PO Number",
            "LR / Bilty No.",
            "Boxes",
            "Status",
            "Location",
            "Remarks",
          ],
        ];

        // ----------------------------------------------
        // TABLE DATA
        // ----------------------------------------------

        const tableRows = items.map((p) => [
          p.vendor_name || "-",
          p.po_number || "-",
          p.lr || "-",
          Number(p.no_of_boxes || 0),
          p.todayStatus || "in_transit",
          p.todayLocation || "-",
          p.todayRemarks || "-",
        ]);

        // ----------------------------------------------
        // TRANSPORTER TABLE
        // ----------------------------------------------

        autoTable(doc, {
          startY: currentStartY + 9,

          head: tableHeaders,
          body: tableRows,

          theme: "grid",

          styles: {
            fontSize: 7.5,
            cellPadding: 2,
            overflow: "linebreak",
            valign: "middle",
          },

          headStyles: {
            fillColor: [67, 56, 202],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7.5,
          },

          columnStyles: {
            0: { cellWidth: 32 },
            1: {
              cellWidth: 22,
              fontStyle: "bold",
            },
            2: {
              cellWidth: 26,
            },
            3: {
              cellWidth: 14,
              halign: "center",
              fontStyle: "bold",
            },
            4: {
              cellWidth: 24,
            },
            5: {
              cellWidth: 28,
            },
            6: {
              cellWidth: "auto",
            },
          },

          didDrawPage: (data) => {
            currentStartY = data.cursor.y + 10;
          },
        });

        // ----------------------------------------------
        // SPACE AFTER TRANSPORTER TABLE
        // ----------------------------------------------

        currentStartY =
          doc.lastAutoTable.finalY + 10;
      }
    );

    // ==================================================
    // 4. FOOTER / PAGE NUMBERS
    // ==================================================

    const pageCount = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(140);

      doc.text(
        `Page ${i} of ${pageCount} • Daily Logistics LR Report`,
        pageWidth / 2,
        pageHeight - 7,
        {
          align: "center",
        }
      );
    }

    // ==================================================
    // 5. SAVE PDF
    // ==================================================

    doc.save(
      `Transporter_LR_Summary_${
        new Date().toISOString().split("T")[0]
      }.pdf`
    );
  } catch (err) {
    console.error(
      "Error generating transporter-wise summary PDF:",
      err
    );

    alert(
      "Failed to generate tracking summary PDF."
    );
  } finally {
    setGeneratingPdf(false);
  }
};

  const fetchTodayReceiving = async () => {
    const todayStart = dayjs().startOf("day").toISOString();
    const tomorrowStart = dayjs().add(1, "day").startOf("day").toISOString();

    try {
      const { data, error } = await supabase
        .schema("purchase")
        .from("shipment_tracking_events")
        .select(`
        id,
        shipment_id,
        remarks,
        shipments (
          po_id,
          lr_number,
          no_of_boxes,
          transporter,
          purchase_orders (
            po_number,
            supplier_id
          )
        )
      `)
        .gte("event_time", todayStart)
        .lt("event_time", tomorrowStart)
        .eq("status", "at_destination");

      if (error) {
        console.error("Error fetching events:", error);
        return;
      }

      // console.log("Events:", data);

      // Get unique supplier IDs
      const supplierIds = [
        ...new Set(
          data
            .map(
              event => event.shipments?.purchase_orders?.supplier_id
            )
            .filter(Boolean)
        )
      ];

      // console.log("Supplier IDs:", supplierIds);

      // Get vendors from PUBLIC schema
      const { data: vendors, error: vendorError } = await supabase
        .schema("public")
        .from("vendors")
        .select(`
        id,
        vendor_name
      `)
        .in("id", supplierIds);

      if (vendorError) {
        console.error("Error fetching vendors:", vendorError);
        return;
      }
      // console.log("Vendors:", vendors);

      // Create vendor lookup
      const vendorMap = Object.fromEntries(
        vendors.map(vendor => [
          vendor.id,
          vendor.vendor_name
        ])
      );

      // Create final summary
      const summaryData = data.map(event => {
        const shipment = event.shipments;
        const po = shipment?.purchase_orders;

        return {
          shipment_id: event.shipment_id,
          po_id: shipment?.po_id,
          po_number: po?.po_number,
          supplier_id: po?.supplier_id,
          vendor_name: vendorMap[po?.supplier_id] || "",
          lr_number: shipment?.lr_number,
          boxes: shipment?.no_of_boxes,
          transporter: shipment?.transporter,
          remarks: event.remarks
        };
      });
      return summaryData;


      // console.log("Final Summary:", summaryData);

    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  const totalBoxesAtDestination = inTransitShipments
    .filter((p) => isAtDestination(p.todayStatus))
    .reduce((sum, p) => sum + Number(p.no_of_boxes || 0), 0);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Truck size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Daily LR Location Check</h2>
                <p className="text-xs text-slate-500">Reviewing shipments currently in-transit</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading || Boolean(activeAction)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {loading ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-2.5">
                <Helix size="36" speed="2.5" color="#4f46e5" />
                <span className="text-xs font-semibold text-slate-400">Loading LR shipment queue...</span>
              </div>
            ) : inTransitShipments.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-800">All caught up!</h3>
                <p className="mt-1 text-xs text-slate-500">
                  No active in-transit shipments require checking right now.
                </p>
              </div>
            ) : isCompleted ? (
              /* Completion Confirmation Screen */
              <div className="py-6 text-center space-y-4">
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border ${isAllUpdatedToday
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}
                >
                  {isAllUpdatedToday ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {isAllUpdatedToday ? 'Daily Check Completed!' : 'Queue Review Incomplete'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                    {isAllUpdatedToday
                      ? `All ${inTransitShipments.length} LR tracking records are updated for today.`
                      : `${pendingShipments.length} out of ${inTransitShipments.length} shipments still need today's tracking status before PDF can be printed.`}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left text-xs text-slate-600 space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span>Total LRs:</span>
                    <span className="font-bold text-slate-800">{inTransitShipments.length}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Updated Today:</span>
                    <span className="font-bold text-emerald-600">
                      {inTransitShipments.filter((p) => p.updatedToday).length}
                    </span>
                  </div>
                  {pendingShipments.length > 0 && (
                    <div className="flex justify-between font-medium">
                      <span>Pending:</span>
                      <span className="font-bold text-amber-600">{pendingShipments.length}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium border-t border-slate-200/60 pt-1.5 text-emerald-700">
                    <span>Receiving Today (At Destination):</span>
                    <span className="font-bold">
                      {totalBoxesAtDestination} Boxes
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <button
                    onClick={handlePrintSummary}
                    disabled={generatingPdf || !isAllUpdatedToday}
                    title={
                      !isAllUpdatedToday
                        ? 'All LRs must be updated today before you can generate the summary'
                        : undefined
                    }
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer size={15} />
                    {generatingPdf ? 'Generating PDF...' : 'Print Today’s Summary'}
                  </button>

                  <button
                    onClick={() => {
                      setIsCompleted(false);
                      const firstPendingIdx = inTransitShipments.findIndex((s) => !s.updatedToday);
                      setCurrentIndex(firstPendingIdx !== -1 ? firstPendingIdx : 0);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <RotateCcw size={14} /> Review Queue
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-transparent px-3.5 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              /* Regular Queue Navigation */
              <div className="space-y-5">
                {/* Progress bar and badges */}
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>
                    LR {currentIndex + 1} of {inTransitShipments.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {currentShipment.updatedToday ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-300">
                        <Check size={12} className="stroke-[3]" /> LOGGED TODAY
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-300">
                        <AlertCircle size={12} /> PENDING TODAY
                      </span>
                    )}
                    <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] uppercase font-bold text-cyan-700 border border-cyan-200">
                      IN TRANSIT
                    </span>
                  </div>
                </div>

                {/* Main LR Info Card */}
                <div
                  className={`rounded-xl border p-4 space-y-3 transition-colors ${currentShipment.updatedToday
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 bg-slate-50/50'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        LR / Bilty Number
                      </span>
                      <p className="text-base font-mono font-extrabold text-indigo-600">
                        {currentShipment.lr}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        PO Number
                      </span>
                      <p className="text-xs font-semibold text-slate-700">
                        {currentShipment.po_number}
                      </p>
                    </div>
                  </div>

                  {/* Vendor, Transporter & Total Box Count Grid */}
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-2.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Vendor
                      </span>
                      <p className="text-xs font-semibold text-slate-800 truncate" title={currentShipment.vendor_name}>
                        {currentShipment.vendor_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Transporter
                      </span>
                      <p
                        className="text-xs font-semibold text-slate-800 flex items-center gap-1 truncate"
                        title={currentShipment.transporter}
                      >
                        🚚 {currentShipment.transporter}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Boxes
                      </span>
                      <p className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1">
                        <Package size={13} className="text-indigo-500" />
                        {currentShipment.no_of_boxes || 0} {currentShipment.no_of_boxes === 1 ? 'Box' : 'Boxes'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0 || loading || Boolean(activeAction)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  <button
                    onClick={handleOpenUpdate}
                    disabled={loading || Boolean(activeAction)}
                    className={`flex min-w-[170px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition-all disabled:opacity-70 disabled:pointer-events-none cursor-pointer ${currentShipment.updatedToday
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                  >
                    {activeAction === 'open-update' ? (
                      <Helix size="16" speed="2.5" color="white" />
                    ) : currentShipment.updatedToday ? (
                      <>
                        <Check size={15} /> Re-check / Edit Today
                      </>
                    ) : (
                      <>
                        <MapPin size={15} /> Check / Log Location
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={loading || Boolean(activeAction)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
                  >
                    {currentIndex === inTransitShipments.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested Location Form Modal */}
      {currentShipment && (
        <UpdateLocationModal
          isOpen={isUpdateOpen}
          onClose={() => setIsUpdateOpen(false)}
          po={currentShipment}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </>
  );
}