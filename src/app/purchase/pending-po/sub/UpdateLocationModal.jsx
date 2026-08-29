'use client';

import React, { useState } from 'react';
import { MapPin, CheckCircle2, X, Send } from 'lucide-react';
import { supabase } from '../../../lib/supabase'; // Adjust import path

export default function UpdateLocationModal({ isOpen, onClose, po, onSuccess }) {
  const [currentLocation, setCurrentLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [reachedCalicut, setReachedCalicut] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const newStatus = reachedCalicut ? 'at_destination' : 'in_transit';

      // 1. Update purchase_orders master state
      const { error: poError } = await supabase
        .schema('purchase')
        .from('purchase_orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', po.id);

      if (poError) throw poError;

      // 2. Insert audit trail entry
      const { error: historyError } = await supabase
        .schema('purchase')
        .from('po_status_history')
        .insert([
          {
            po_id: po.id,
            status: newStatus,
            lr_number: po.lr,
            remarks: reachedCalicut
              ? `ARRIVED AT DESTINATION (Calicut). Location: ${currentLocation || 'Calicut'}. Notes: ${remarks}`
              : `Current Location: ${currentLocation}. Notes: ${remarks}`,
          },
        ]);

      if (historyError) throw historyError;

      // Reset local fields
      setCurrentLocation('');
      setRemarks('');
      setReachedCalicut(false);
      onSuccess();
    } catch (err) {
      console.error('Error logging location:', err);
      alert('Failed to save update');
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
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
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