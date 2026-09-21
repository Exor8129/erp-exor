"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  X,
  Clock,
  MapPin,
  Building2,
  User,
  RefreshCw,
  Truck,
  Package,
  CheckCircle2,
} from "lucide-react";
import { Helix } from "ldrs/react";
import "ldrs/react/Helix.css";

const isAtDestination = (status) => {
  if (!status) return false;
  const s = String(status).trim().toLowerCase().replace(/[\s-]+/g, "_");
  return s === "at_destination" || s === "destination_reached" || s === "delivered";
};

export default function StatusDrawer({ open, onClose, po }) {
  const [events, setEvents] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && po?.id) {
      setSelectedShipmentId(null);
      fetchTrackingEvents(po.id);
    } else {
      setEvents([]);
      setShipments([]);
      setSelectedShipmentId(null);
    }
  }, [open, po?.id]);

  const fetchTrackingEvents = async (poId) => {
    try {
      setLoading(true);

      // 1. Get all shipments tied to this purchase order
      const { data: shipmentData, error: shipmentError } = await supabase
        .schema("purchase")
        .from("shipments")
        .select("id, lr_number, transporter, no_of_boxes, shipment_status")
        .eq("po_id", poId)
        .order("created_at", { ascending: true });

      if (shipmentError) throw shipmentError;

      const loadedShipments = shipmentData || [];
      setShipments(loadedShipments);

      // Default directly to the first LR
      if (loadedShipments.length > 0) {
        setSelectedShipmentId(loadedShipments[0].id);
      } else {
        setSelectedShipmentId(null);
        setEvents([]);
        return;
      }

      const shipmentIds = loadedShipments.map((s) => s.id);

      const shipmentMap = loadedShipments.reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {});

      // 2. Fetch tracking events for these shipments
      const { data: eventData, error: eventError } = await supabase
        .schema("purchase")
        .from("shipment_tracking_events")
        .select(`
          id,
          shipment_id,
          event_time,
          status,
          location,
          remarks,
          updated_by,
          transporter_id
        `)
        .in("shipment_id", shipmentIds)
        .order("event_time", { ascending: false });

      if (eventError) throw eventError;

      // 3. Resolve transporter names if transporter_id exists
      const transporterIds = [
        ...new Set(
          (eventData || []).map((e) => e.transporter_id).filter(Boolean)
        ),
      ];

      let transporterMap = {};
      if (transporterIds.length > 0) {
        const { data: transData } = await supabase
          .from("transporters")
          .select("id, transporter_name")
          .in("id", transporterIds);

        transporterMap = (transData || []).reduce((acc, t) => {
          acc[t.id] = t.transporter_name;
          return acc;
        }, {});
      }

      const enrichedEvents = (eventData || []).map((ev) => ({
        ...ev,
        shipment: shipmentMap[ev.shipment_id],
        transporter_name:
          transporterMap[ev.transporter_id] || ev.shipment?.transporter || null,
      }));

      setEvents(enrichedEvents);
    } catch (err) {
      console.error("Error fetching shipment events:", err);
    } finally {
      setLoading(false);
    }
  };

  // Map to check if a specific shipment has reached destination
  const shipmentDestinationMap = useMemo(() => {
    const map = {};
    shipments.forEach((s) => {
      // Check shipment level status
      if (isAtDestination(s.shipment_status)) {
        map[s.id] = true;
        return;
      }
      // Check most recent tracking event for this shipment
      const latestEvent = events.find((e) => e.shipment_id === s.id);
      if (latestEvent && isAtDestination(latestEvent.status)) {
        map[s.id] = true;
      } else {
        map[s.id] = false;
      }
    });
    return map;
  }, [shipments, events]);

  // Filter events strictly for the selected LR
  const filteredEvents = useMemo(() => {
    if (!selectedShipmentId) return [];
    return events.filter((e) => e.shipment_id === selectedShipmentId);
  }, [events, selectedShipmentId]);

  const activeShipmentInfo = useMemo(() => {
    return shipments.find((s) => s.id === selectedShipmentId) || null;
  }, [shipments, selectedShipmentId]);

  const isCurrentAtDestination = Boolean(
    selectedShipmentId && shipmentDestinationMap[selectedShipmentId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50/50">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tracking Timeline
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                  {po?.po_number}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-800 mt-0.5 truncate max-w-[280px]">
                {po?.vendor_name || "Purchase Order"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* LR Tabs with Destination Awareness */}
          {shipments.length > 1 && (
            <div className="px-5 pb-2.5 pt-1.5 overflow-x-auto custom-scrollbar flex items-center gap-2 border-t border-slate-100/80 bg-white">
              {shipments.map((s, index) => {
                const isSelected = selectedShipmentId === s.id;
                const lrEventsCount = events.filter((e) => e.shipment_id === s.id).length;
                const reachedDestination = Boolean(shipmentDestinationMap[s.id]);

                // Dynamic colors for tabs depending on status and selection
                let tabClasses = "";
                if (isSelected) {
                  tabClasses = reachedDestination
                    ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600"
                    : "bg-sky-600 text-white shadow-sm ring-1 ring-sky-600";
                } else {
                  tabClasses = reachedDestination
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300/80 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200";
                }

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedShipmentId(s.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${tabClasses}`}
                  >
                    {reachedDestination ? (
                      <CheckCircle2 size={13} className={isSelected ? "text-white" : "text-emerald-600"} />
                    ) : (
                      <Truck size={13} />
                    )}

                    <span>{s.lr_number ? `LR: ${s.lr_number}` : `Shipment #${index + 1}`}</span>

                    {/* Status Badge */}
                    {reachedDestination ? (
                      <span
                        className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-emerald-200 text-emerald-900"
                        }`}
                      >
                        Destination
                      </span>
                    ) : (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {lrEventsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Selected LR Banner */}
          {activeShipmentInfo && (
            <div
              className={`px-5 py-2.5 border-t text-[11px] flex items-center justify-between transition-colors ${
                isCurrentAtDestination
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                  : "bg-sky-50/60 border-sky-100 text-sky-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {isCurrentAtDestination ? (
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span className="font-bold text-emerald-800 uppercase tracking-wide text-[10px] bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      Arrived at Destination
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Truck size={13} className="text-sky-600" />
                    <span className="font-semibold">
                      {activeShipmentInfo.transporter || "Transporter N/A"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isCurrentAtDestination && (
                  <span className="text-[11px] text-slate-600 truncate max-w-[130px]">
                    {activeShipmentInfo.transporter}
                  </span>
                )}
                <div className="flex items-center gap-1 text-slate-600 font-medium">
                  <Package size={13} className="text-slate-400" />
                  <span>{activeShipmentInfo.no_of_boxes || 0} Boxes</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Helix size="32" speed="2.5" color="#0284c7" />
              <span className="text-xs text-slate-400 font-medium">
                Loading timeline events...
              </span>
            </div>
          ) : shipments.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center px-4">
              <Clock className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-700">No shipments found</p>
              <p className="text-xs text-slate-400 mt-1">
                There are no shipment records created for this purchase order yet.
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center px-4">
              <Clock className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-700">No events logged</p>
              <p className="text-xs text-slate-400 mt-1">
                No tracking updates recorded for this LR yet.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-100 ml-3.5 space-y-8">
              {filteredEvents.map((event, index) => {
                const isLatest = index === 0;
                const eventAtDestination = isAtDestination(event.status);

                return (
                  <div key={event.id} className="relative pl-6 group">
                    {/* Status node dot */}
                    <span
                      className={`absolute -left-[9px] top-0.5 h-4 w-4 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
                        eventAtDestination
                          ? "border-emerald-500 ring-4 ring-emerald-50"
                          : isLatest
                          ? "border-sky-500 ring-4 ring-sky-50"
                          : "border-slate-300 group-hover:border-slate-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          eventAtDestination
                            ? "bg-emerald-500"
                            : isLatest
                            ? "bg-sky-500"
                            : "bg-slate-300"
                        }`}
                      />
                    </span>

                    {/* Timeline Item Content */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-bold text-xs uppercase tracking-wide px-2 py-0.5 rounded-md ${
                            eventAtDestination
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "text-slate-800"
                          }`}
                        >
                          {event.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium font-mono">
                          {new Date(event.event_time).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span>{event.location}</span>
                        </div>
                      )}

                      {event.transporter_name && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Building2 size={12} className="text-slate-400 shrink-0" />
                          <span>{event.transporter_name}</span>
                        </div>
                      )}

                      {event.remarks && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100 mt-1">
                          {event.remarks}
                        </p>
                      )}

                      {event.updated_by && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-0.5">
                          <User size={10} />
                          <span>Updated by {event.updated_by}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => fetchTrackingEvents(po?.id)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-100 transition shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}