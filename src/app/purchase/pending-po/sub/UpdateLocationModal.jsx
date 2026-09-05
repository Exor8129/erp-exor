'use client';

import React, { useState } from 'react';
import { MapPin, CheckCircle2, X, Send, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase'; // Adjust import path

export default function UpdateLocationModal({ isOpen, onClose, po, onSuccess }) {
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentLocation, setCurrentLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [reachedCalicut, setReachedCalicut] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventDate || !currentLocation) return;

    try {
      setSaving(true);

      // 1. Fetch shipment ID
      const { data: shipment, error: fetchError } = await supabase
        .schema("purchase")
        .from("shipments")
        .select("id")
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

      const status = reachedCalicut ? 'at_destination' : (po.status || 'in_transit');

      // 2. Prepare payload with user-selected event date
      const payload = {
        shipment_id: shipment.id,
        event_time: new Date(eventDate).toISOString(),
        status: status,
        location: currentLocation,
        remarks: remarks || null,
      };

      // 3. Insert into purchase.shipment_tracking_events
      const { error: insertError } = await supabase
        .schema("purchase")
        .from("shipment_tracking_events")
        .insert([payload]);

      if (insertError) {
        console.error("ERROR saving tracking event:", insertError.message);
        alert("Failed to save tracking event.");
        return;
      }

      // 4. Update PO master status if reached destination
      if (reachedCalicut) {
        await supabase
          .schema('purchase')
          .from('purchase_orders')
          .update({
            status: 'at_destination',
            updated_at: new Date().toISOString(),
          })
          .eq('id', po.id);
      }

      // Reset form & notify parent
      setCurrentLocation('');
      setRemarks('');
      setReachedCalicut(false);
      setEventDate(new Date().toISOString().split('T')[0]);
      if (onSuccess) onSuccess();
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
              Update Location: <span className="text-indigo-600">{po.po_number}</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Update Date Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
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
              placeholder="e.g. Salem, Bangalore, Coimbatore"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks / Delay Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Expected arrival tomorrow morning..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Calicut Destination Checkbox */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={reachedCalicut}
                onChange={(e) => {
                  setReachedCalicut(e.target.checked);
                  if (e.target.checked) setCurrentLocation('Calicut');
                }}
                className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Reached Calicut
                </span>
                <p className="text-[10px] text-emerald-700">
                  Marks status as <strong className="uppercase">at_destination</strong> and removes it from in-transit checks.
                </p>
              </div>
            </label>
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
              {saving ? 'Saving...' : 'Save & Next'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}