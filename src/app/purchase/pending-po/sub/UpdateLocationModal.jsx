"use client";

import React, { useState } from "react";
import { MapPin, CheckCircle2, X, Send, Calendar, Building2, PackageCheck } from "lucide-react";
import { supabase } from "../../../lib/supabase"; // Adjust import path

export default function UpdateLocationModal({
  isOpen,
  onClose,
  po,
  onSuccess,
}) {
  const [eventDate, setEventDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [currentLocation, setCurrentLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  // Replaced boolean with a status selector: "in_transit" | "in_transit" | "at_destination"
  const [shipmentStatus, setShipmentStatus] = useState("in_transit");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventDate || !currentLocation.trim()) return;

    try {
      setSaving(true);

      // 1. Fetch shipment ID AND existing transporter_id / transporter name
      const { data: shipment, error: fetchError } = await supabase
        .schema("purchase")
        .from("shipments")
        .select("id, transporter_id, transporter")
        .eq("po_id", po.id)
        .eq("lr_number", po.lr)
        .maybeSingle();

      if (fetchError) {
        console.error("ERROR fetching shipment:", fetchError.message);
        alert("Failed to find corresponding shipment.");
        return;
      }

      if (!shipment) {
        console.log("No shipment found");
        alert("Shipment record not found for this PO and LR.");
        return;
      }

      // 2. Resolve transporter_id
      let resolvedTransporterId =
        shipment.transporter_id || po.transporter_id || null;

      const transporterName = (
        shipment.transporter ||
        po.transporter ||
        ""
      ).trim();

      if (
        !resolvedTransporterId &&
        transporterName &&
        transporterName !== "N/A"
      ) {
        const { data: tData } = await supabase
          .from("transporters")
          .select("id")
          .ilike("transporter_name", transporterName)
          .maybeSingle();

        if (tData?.id) {
          resolvedTransporterId = tData.id;
        }
      }

      // Determine final status based on selected milestone
      const status = shipmentStatus; // "in_transit", "in_transit", or "at_destination"

      // 3. Prepare payload for tracking events
      const payload = {
        shipment_id: shipment.id,
        transporter_id: resolvedTransporterId,
        event_time: new Date(eventDate).toISOString(),
        status: status,
        location: currentLocation.trim(),
        remarks: remarks.trim() || null,
      };

      // 4. Insert into purchase.shipment_tracking_events
      const { error: insertError } = await supabase
        .schema("purchase")
        .from("shipment_tracking_events")
        .insert([payload])
        .select()
        .single();

      if (insertError) {
        console.error("ERROR saving tracking event:", insertError.message);
        alert("Failed to save tracking event.");
        return;
      }

      // 5. Backfill shipments table if transporter_id was empty
      if (resolvedTransporterId && !shipment.transporter_id) {
        await supabase
          .schema("purchase")
          .from("shipments")
          .update({ transporter_id: resolvedTransporterId })
          .eq("id", shipment.id);
      }

      // 6. Update master tables if final destination (Warehouse Received) is reached
      if (status === "at_destination") {
        const now = new Date().toISOString();

        // 6A. Update shipment status
        const { error: shipmentUpdateError } = await supabase
          .schema("purchase")
          .from("shipments")
          .update({
            shipment_status: "at_destination",
            delivered_date: eventDate,
            updated_at: now,
          })
          .eq("id", shipment.id);

        if (shipmentUpdateError) throw shipmentUpdateError;

        // 6B. Update purchase order status
        const { error: poUpdateError } = await supabase
          .schema("purchase")
          .from("purchase_orders")
          .update({
            status: "at_destination",
            updated_at: now,
          })
          .eq("id", po.id);

        if (poUpdateError) throw poUpdateError;
      } else if (status === "in_transit") {
        // Optional: Update shipment_status to indicate it's at the city hub
        await supabase
          .schema("purchase")
          .from("shipments")
          .update({ shipment_status: "in_transit", updated_at: new Date().toISOString() })
          .eq("id", shipment.id);
      }

      // Reset form & notify parent with updated data
      setCurrentLocation("");
      setRemarks("");
      setShipmentStatus("in_transit");
      setEventDate(new Date().toISOString().split("T")[0]);

      if (onSuccess) {
        onSuccess({
          status: status,
          location: currentLocation.trim(),
          remarks: remarks.trim() || null,
          transporter_id: resolvedTransporterId,
          event_time: payload.event_time,
        });
      }

      onClose();
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Update Location:{" "}
              <span className="text-indigo-600">{po.po_number}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Update Date Field */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 mb-1">
              <Calendar size={13} className="text-slate-500" /> Date of Update / Event *
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current City / Hub Location *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Calicut Courier Hub, Vengeri, etc."
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Shipment Milestone Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Shipment Stage / Milestone *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setShipmentStatus("in_transit")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  shipmentStatus === "in_transit"
                    ? "border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold shadow-xs"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium"
                }`}
              >
                <MapPin size={16} className="mb-1 text-indigo-600" />
                <span className="text-[11px]">In Transit</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShipmentStatus("in_transit");
                  if (!currentLocation) setCurrentLocation("Calicut Hub");
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  shipmentStatus === "in_transit"
                    ? "border-amber-600 bg-amber-50/60 text-amber-900 font-bold shadow-xs"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium"
                }`}
              >
                <Building2 size={16} className="mb-1 text-amber-600" />
                <span className="text-[11px]">At City Hub</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShipmentStatus("at_destination");
                  if (!currentLocation) setCurrentLocation("Calicut Warehouse");
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  shipmentStatus === "at_destination"
                    ? "border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold shadow-xs"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium"
                }`}
              >
                <PackageCheck size={16} className="mb-1 text-emerald-600" />
                <span className="text-[11px]">At Warehouse</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 italic">
              {shipmentStatus === "in_transit" && "Shipment is still moving between transit stops."}
              {shipmentStatus === "in_transit" && "Shipment has arrived at the local courier station/hub in Calicut."}
              {shipmentStatus === "at_destination" && "Shipment has physically arrived and been unloaded at your warehouse."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks / Delay Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Waiting for clearance / pickup scheduled tomorrow..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              <Send size={13} />
              {saving ? "Saving..." : "Save & Next"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}