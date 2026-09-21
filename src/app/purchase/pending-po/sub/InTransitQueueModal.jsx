'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  MapPin,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  X,
  Check,
  AlertCircle,
  Package,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { Button, Select } from 'antd';
import { Helix } from 'ldrs/react';
import 'ldrs/react/Helix.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../../lib/supabase';
import UpdateLocationModal from './UpdateLocationModal';
import dayjs from 'dayjs';

const getLocalStartOfTodayISO = () => {
  return dayjs().startOf('day').toISOString();
};

const getLocalEndOfTodayISO = () => {
  return dayjs().endOf('day').toISOString();
};

const normalizeStatus = (status) => {
  if (!status) return '';
  return String(status).trim().toLowerCase().replace(/\s+/g, '_');
};

const isAtDestination = (status) => {
  return normalizeStatus(status) === 'at_destination';
};

const isInTransit = (status) => {
  return normalizeStatus(status) === 'in_transit';
};

export default function InTransitQueueModal({
  isOpen,
  onClose,
  onWorkflowComplete,
}) {
  const [inTransitShipments, setInTransitShipments] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

const fetchInTransitShipments = async () => {
    try {
      setLoading(true);

      // 1. Fetch shipments
      const { data: shipments, error: shipmentError } = await supabase
        .schema('purchase')
        .from('shipments')
        .select(
          `
          id,
          po_id,
          transporter,
          lr_number,
          shipment_status,
          dispatch_date,
          no_of_boxes,
          tracking_url,
          transporter_id,
          purchase_orders (
            id,
            po_number,
            status,
            supplier_id
          )
        `
        )
        .ilike('shipment_status', 'In Transit')
        .neq('lr_number', '999000999')
        .not('lr_number', 'is', null)
        .order('created_at', { ascending: true });

      if (shipmentError) throw shipmentError;

      if (!shipments || shipments.length === 0) {
        setInTransitShipments([]);
        return;
      }

      // 2. Fetch Vendors AND Transporters in parallel to resolve missing IDs
      const supplierIds = Array.from(
        new Set(
          shipments
            .map((s) => s.purchase_orders?.supplier_id)
            .filter(Boolean)
        )
      );

      const [vendorRes, transporterRes] = await Promise.all([
        supplierIds.length > 0
          ? supabase.from('vendors').select('id, vendor_name').in('id', supplierIds)
          : Promise.resolve({ data: [] }),
        supabase.from('transporters').select('id, transporter_name'),
      ]);

      const vendorMap = (vendorRes.data || []).reduce((acc, v) => {
        acc[v.id] = v.vendor_name;
        return acc;
      }, {});

      // Build a lookup map by lowercased/trimmed transporter name
      const transporterNameMap = (transporterRes.data || []).reduce((acc, t) => {
        if (t.transporter_name) {
          acc[t.transporter_name.trim().toLowerCase()] = t.id;
        }
        return acc;
      }, {});

      // 3. Fetch latest tracking events
      const shipmentIds = shipments.map((s) => s.id);
      let updatedShipmentIdsSet = new Set();
      let latestEventMap = {};

      if (shipmentIds.length > 0) {
        const startOfTodayIso = getLocalStartOfTodayISO();
        const endOfTodayIso = getLocalEndOfTodayISO();

        const { data: events, error: eventError } = await supabase
          .schema('purchase')
          .from('shipment_tracking_events')
          .select('shipment_id, status, location, remarks, event_time, transporter_id')
          .in('shipment_id', shipmentIds)
          .order('event_time', { ascending: false });

        if (eventError) throw eventError;

        (events || []).forEach((e) => {
          if (!latestEventMap[e.shipment_id]) {
            latestEventMap[e.shipment_id] = e;
          }
          if (
            e.event_time &&
            new Date(e.event_time) >= new Date(startOfTodayIso) &&
            new Date(e.event_time) <= new Date(endOfTodayIso)
          ) {
            updatedShipmentIdsSet.add(e.shipment_id);
          }
        });
      }

      // 4. Map shipment items with resolved transporter_id
      const formatted = shipments.map((s) => {
        const parentPO = s.purchase_orders || {};
        const latestEvent = latestEventMap[s.id] || null;

        const cleanTransporterName = s.transporter?.trim().toLowerCase();
        // Priority: 1. DB shipment column -> 2. Name lookup -> 3. Last event -> 4. null
        const resolvedTransporterId =
          s.transporter_id ||
          (cleanTransporterName ? transporterNameMap[cleanTransporterName] : null) ||
          latestEvent?.transporter_id ||
          null;

        return {
          id: parentPO.id || s.po_id,
          shipment_id: s.id,
          po_number: parentPO.po_number || 'N/A',
          status: s.shipment_status || parentPO.status || 'In Transit',
          supplier_id: parentPO.supplier_id,
          vendor_name: vendorMap[parentPO.supplier_id] || 'N/A',
          lr: s.lr_number?.trim() || 'No LR',
          transporter: s.transporter?.trim() || 'N/A',
          no_of_boxes: Number(s.no_of_boxes) || 0,
          tracking_url: s.tracking_url || null,
          transporter_id: resolvedTransporterId,
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

  const progressStats = useMemo(() => {
    const total = inTransitShipments.length;
    if (total === 0) return { updatedCount: 0, pendingCount: 0, percentage: 0 };
    const updatedCount = inTransitShipments.filter((p) => p.updatedToday).length;
    const pendingCount = total - updatedCount;
    const percentage = Math.round((updatedCount / total) * 100);
    return { updatedCount, pendingCount, percentage };
  }, [inTransitShipments]);

  const searchOptions = useMemo(() => {
    return inTransitShipments.map((item, idx) => ({
      value: idx,
      label: `#${idx + 1} | ${item.po_number} — ${item.vendor_name} (LR: ${item.lr})`,
      searchText: `${item.po_number} ${item.lr} ${item.vendor_name} ${item.transporter}`.toLowerCase(),
      raw: item,
    }));
  }, [inTransitShipments]);

  if (!isOpen) return null;

  const currentShipment = inTransitShipments[currentIndex];
  const pendingShipments = inTransitShipments.filter((p) => !p.updatedToday);
  const isAllUpdatedToday =
    inTransitShipments.length > 0 && pendingShipments.length === 0;

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

  const handleJumpToIndex = (idx) => {
    if (loading || activeAction) return;
    setIsCompleted(false);
    setCurrentIndex(idx);
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

    setInTransitShipments((prev) =>
      prev.map((item, idx) =>
        idx === currentIndex
          ? {
              ...item,
              updatedToday: true,
              transporter_id: updatedData?.transporter_id || item.transporter_id,
              todayStatus: updatedData?.status || item.todayStatus,
              todayLocation: updatedData?.location || item.todayLocation,
              todayRemarks: updatedData?.remarks || item.todayRemarks,
              todayEventTime:
                updatedData?.event_time || new Date().toISOString(),
            }
          : item
      )
    );

    if (currentIndex >= inTransitShipments.length - 1) {
      setIsCompleted(true);
      if (onWorkflowComplete) onWorkflowComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const fetchTodayTrackingEventsFromDB = async () => {
    const todayStart = dayjs().startOf('day').toISOString();
    const todayEnd = dayjs().endOf('day').toISOString();

    const { data: events, error } = await supabase
      .schema('purchase')
      .from('shipment_tracking_events')
      .select(`
        id,
        shipment_id,
        transporter_id,
        status,
        location,
        remarks,
        event_time,
        shipments (
          id,
          po_id,
          lr_number,
          no_of_boxes,
          transporter,
          purchase_orders (
            id,
            po_number,
            supplier_id
          )
        )
      `)
      .gte('event_time', todayStart)
      .lte('event_time', todayEnd)
      .order('event_time', { ascending: false });

    if (error) {
      console.error('Error fetching today tracking events:', error);
      throw error;
    }

    if (!events || events.length === 0) return [];

    const validEvents = events.filter((e) => {
      const s = normalizeStatus(e.status);
      return s === 'in_transit' || s === 'at_destination';
    });

    const latestEventByShipment = new Map();
    validEvents.forEach((ev) => {
      if (!latestEventByShipment.has(ev.shipment_id)) {
        latestEventByShipment.set(ev.shipment_id, ev);
      }
    });

    const uniqueEvents = Array.from(latestEventByShipment.values());

    const supplierIds = Array.from(
      new Set(
        uniqueEvents
          .map((e) => e.shipments?.purchase_orders?.supplier_id)
          .filter(Boolean)
      )
    );

    let vendorMap = {};
    if (supplierIds.length > 0) {
      const { data: vendors, error: vendorError } = await supabase
        .schema('public')
        .from('vendors')
        .select('id, vendor_name')
        .in('id', supplierIds);

      if (!vendorError && vendors) {
        vendorMap = Object.fromEntries(
          vendors.map((v) => [v.id, v.vendor_name])
        );
      }
    }

    return uniqueEvents.map((ev) => {
      const shipment = ev.shipments || {};
      const po = shipment.purchase_orders || {};
      return {
        eventId: ev.id,
        shipmentId: ev.shipment_id,
        transporterId: ev.transporter_id,
        status: ev.status,
        normalizedStatus: normalizeStatus(ev.status),
        location: ev.location || '-',
        remarks: ev.remarks || '-',
        eventTime: ev.event_time,
        poNumber: po.po_number || '-',
        supplierId: po.supplier_id,
        vendorName: vendorMap[po.supplier_id] || '-',
        lrNumber: shipment.lr_number || '-',
        boxes: Number(shipment.no_of_boxes || 0),
        transporter: shipment.transporter || 'Unassigned / Direct',
      };
    });
  };

  const handlePrintSummary = async () => {
    try {
      setGeneratingPdf(true);

      const todayEvents = await fetchTodayTrackingEventsFromDB();

      if (todayEvents.length === 0) {
        alert(
          'No records found in shipment_tracking_events for today with status "In Transit" or "at_destination".'
        );
        return;
      }

      const receivingToday = todayEvents.filter((e) =>
        isAtDestination(e.normalizedStatus)
      );
      const inTransitToday = todayEvents.filter((e) =>
        isInTransit(e.normalizedStatus)
      );

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const todayFormatted = dayjs().format('DD/MM/YYYY');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(30, 41, 59);
      doc.text('Daily In-Transit LR Tracking Summary', 14, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(90);
      doc.text(
        `Generated Date: ${todayFormatted} | Total Events Logged Today: ${todayEvents.length}`,
        14,
        22
      );

      let currentStartY = 29;

      const totalReceivingBoxes = receivingToday.reduce(
        (sum, item) => sum + Number(item.boxes || 0),
        0
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(16, 107, 72);
      doc.text(
        `Details of boxes receiving today (${totalReceivingBoxes} Boxes across ${receivingToday.length} LRs)`,
        14,
        currentStartY
      );

      const receivingHeaders = [
        [
          'Supplier / Party',
          'PO Number',
          'LR / Bilty No.',
          'Boxes',
          'Transporter',
          'Location',
          'Remarks',
        ],
      ];

      const receivingRows =
        receivingToday.length > 0
          ? receivingToday.map((p) => [
              p.vendorName,
              p.poNumber,
              p.lrNumber,
              p.boxes,
              p.transporter,
              p.location === '-' ? 'At Destination' : p.location,
              p.remarks,
            ])
          : [
              [
                '-',
                '-',
                '-',
                0,
                '-',
                'No shipments at destination logged today',
                '-',
              ],
            ];

      autoTable(doc, {
        startY: currentStartY + 4,
        head: receivingHeaders,
        body: receivingRows,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          overflow: 'linebreak',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [16, 149, 99],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
        },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 22, fontStyle: 'bold' },
          2: { cellWidth: 26, fontStyle: 'bold' },
          3: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 24 },
          5: { cellWidth: 28 },
          6: { cellWidth: 'auto' },
        },
        didDrawPage: (data) => {
          currentStartY = data.cursor.y + 10;
        },
      });

      currentStartY = doc.lastAutoTable.finalY + 12;

      const groupedByTransporter = inTransitToday.reduce((acc, item) => {
        const key = item.transporter || 'Unassigned / Direct';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      if (Object.keys(groupedByTransporter).length === 0) {
        if (currentStartY > 260) {
          doc.addPage();
          currentStartY = 20;
        }
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text('No "In Transit" events logged today.', 14, currentStartY);
      } else {
        Object.entries(groupedByTransporter).forEach(
          ([transporterName, items]) => {
            const totalBoxes = items.reduce(
              (sum, item) => sum + Number(item.boxes || 0),
              0
            );

            if (currentStartY > 250) {
              doc.addPage();
              currentStartY = 20;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.text(`Transporter: ${transporterName}`, 14, currentStartY);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(90);
            doc.text(
              `${items.length} ${items.length === 1 ? 'LR' : 'LRs'} | ${totalBoxes} Boxes`,
              14,
              currentStartY + 5
            );

            const tableHeaders = [
              [
                'Supplier / Party',
                'PO Number',
                'LR / Bilty No.',
                'Boxes',
                'Status Today',
                'Location Today',
                'Remarks Today',
              ],
            ];

            const tableRows = items.map((p) => [
              p.vendorName,
              p.poNumber,
              p.lrNumber,
              p.boxes,
              p.status || 'In Transit',
              p.location,
              p.remarks,
            ]);

            autoTable(doc, {
              startY: currentStartY + 9,
              head: tableHeaders,
              body: tableRows,
              theme: 'grid',
              styles: {
                fontSize: 7.5,
                cellPadding: 2,
                overflow: 'linebreak',
                valign: 'middle',
              },
              headStyles: {
                fillColor: [67, 56, 202],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7.5,
              },
              columnStyles: {
                0: { cellWidth: 32 },
                1: { cellWidth: 22, fontStyle: 'bold' },
                2: { cellWidth: 26 },
                3: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
                4: { cellWidth: 24 },
                5: { cellWidth: 28 },
                6: { cellWidth: 'auto' },
              },
              didDrawPage: (data) => {
                currentStartY = data.cursor.y + 10;
              },
            });

            currentStartY = doc.lastAutoTable.finalY + 10;
          }
        );
      }

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(140);
        doc.text(
          `Page ${i} of ${pageCount} • Daily Logistics LR Report`,
          pageWidth / 2,
          pageHeight - 7,
          { align: 'center' }
        );
      }

      doc.save(`Transporter_LR_Summary_${dayjs().format('YYYY-MM-DD')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate tracking summary PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const totalBoxesAtDestination = inTransitShipments
    .filter((p) => p.updatedToday && isAtDestination(p.todayStatus))
    .reduce((sum, p) => sum + Number(p.no_of_boxes || 0), 0);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Truck size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Daily LR Location Check
                </h2>
                <p className="text-xs text-slate-500">
                  Reviewing shipments currently in-transit
                </p>
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

          {/* Graphical Progress Bar */}
          {!loading && inTransitShipments.length > 0 && (
            <div className="bg-slate-100/70 border-b border-slate-100 px-6 py-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Daily Progress: {progressStats.updatedCount} of {inTransitShipments.length} Completed
                </span>
                <span className="font-mono font-bold text-indigo-600">
                  {progressStats.percentage}%
                </span>
              </div>

              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressStats.percentage}%` }}
                />
              </div>

              {/* Graphical Dot Navigation */}
              <div className="flex items-center gap-1 mt-2.5 overflow-x-auto py-1 custom-scrollbar">
                {inTransitShipments.map((shipment, idx) => {
                  const isCurrent = idx === currentIndex && !isCompleted;
                  const isUpdated = shipment.updatedToday;

                  let dotColor = 'bg-amber-300 hover:bg-amber-400 text-amber-800';
                  if (isUpdated) {
                    dotColor = 'bg-emerald-500 hover:bg-emerald-600 text-white';
                  }
                  if (isCurrent) {
                    dotColor =
                      'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-600 text-white font-bold scale-110';
                  }

                  return (
                    <button
                      key={shipment.shipment_id || idx}
                      type="button"
                      onClick={() => handleJumpToIndex(idx)}
                      title={`#${idx + 1}: ${shipment.po_number} (${shipment.lr}) - ${
                        isUpdated ? 'Logged Today' : 'Pending'
                      }`}
                      className={`h-5 min-w-[20px] px-1 rounded-md text-[9px] font-mono flex items-center justify-center transition-all cursor-pointer ${dotColor}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="p-6">
            {loading ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-2.5">
                <Helix size="36" speed="2.5" color="#4f46e5" />
                <span className="text-xs font-semibold text-slate-400">
                  Loading LR shipment queue...
                </span>
              </div>
            ) : inTransitShipments.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2
                  size={40}
                  className="mx-auto mb-3 text-emerald-500"
                />
                <h3 className="text-sm font-bold text-slate-800">All caught up!</h3>
                <p className="mt-1 text-xs text-slate-500">
                  No active in-transit shipments require checking right now.
                </p>
              </div>
            ) : isCompleted ? (
              /* Completion Confirmation Screen */
              <div className="py-6 text-center space-y-4">
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border ${
                    isAllUpdatedToday
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}
                >
                  {isAllUpdatedToday ? (
                    <CheckCircle2 size={32} />
                  ) : (
                    <AlertCircle size={32} />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {isAllUpdatedToday
                      ? 'Daily Check Completed!'
                      : 'Queue Review Incomplete'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                    {isAllUpdatedToday
                      ? `All ${inTransitShipments.length} LR tracking records are updated for today.`
                      : `${pendingShipments.length} out of ${inTransitShipments.length} shipments still need today's tracking status before PDF can be printed.`}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left text-xs text-slate-600 space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span>Total LRs in Queue:</span>
                    <span className="font-bold text-slate-800">
                      {inTransitShipments.length}
                    </span>
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
                      <span className="font-bold text-amber-600">
                        {pendingShipments.length}
                      </span>
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
                    disabled={generatingPdf}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <Printer size={15} />
                    {generatingPdf
                      ? 'Generating PDF...'
                      : "Print Today's Summary"}
                  </button>

                  <button
                    onClick={() => {
                      setIsCompleted(false);
                      const firstPendingIdx = inTransitShipments.findIndex(
                        (s) => !s.updatedToday
                      );
                      setCurrentIndex(
                        firstPendingIdx !== -1 ? firstPendingIdx : 0
                      );
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
              <div className="space-y-4">
                {/* Searchable Jump Picker */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>Jump to specific PO or LR:</span>
                  </div>
                  <Select
                    showSearch
                    size="middle"
                    className="w-full"
                    placeholder="Type PO #, Vendor, or LR to jump..."
                    value={searchQuery ? undefined : currentIndex}
                    searchValue={searchQuery}
                    onSearch={(text) => setSearchQuery(text)}
                    onSelect={(val) => {
                      handleJumpToIndex(val);
                      setSearchQuery('');
                    }}
                    onBlur={() => setSearchQuery('')}
                    filterOption={(input, option) =>
                      option?.searchText?.includes(input.toLowerCase().trim()) ?? false
                    }
                    options={searchOptions}
                    optionRender={(option) => {
                      const item = option.data.raw;
                      return (
                        <div className="flex items-center justify-between text-xs py-0.5">
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="font-mono font-bold text-indigo-600">
                              #{option.data.value + 1} {item.po_number}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              LR: {item.lr}
                            </span>
                            <span className="text-slate-600 truncate">
                              ({item.vendor_name})
                            </span>
                          </div>
                          <span
                            className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              item.updatedToday
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {item.updatedToday ? '✓ Logged' : '• Pending'}
                          </span>
                        </div>
                      );
                    }}
                  />
                </div>

                {/* Queue Position and Badges */}
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-1">
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
                  className={`rounded-xl border p-4 space-y-3 transition-colors ${
                    currentShipment.updatedToday
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

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-2.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Vendor
                      </span>
                      <p
                        className="text-xs font-semibold text-slate-800 truncate"
                        title={currentShipment.vendor_name}
                      >
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
                        {currentShipment.no_of_boxes || 0}{' '}
                        {currentShipment.no_of_boxes === 1 ? 'Box' : 'Boxes'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation & Action Controls */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handlePrev}
                    disabled={
                      currentIndex === 0 ||
                      loading ||
                      Boolean(activeAction)
                    }
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  <button
                    onClick={handleOpenUpdate}
                    disabled={loading || Boolean(activeAction)}
                    className={`flex min-w-[170px] flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition-all disabled:opacity-70 disabled:pointer-events-none cursor-pointer ${
                      currentShipment.updatedToday
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
                    {currentIndex === inTransitShipments.length - 1
                      ? 'Finish'
                      : 'Next'}{' '}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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