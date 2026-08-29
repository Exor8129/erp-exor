'use client';

import React, { useState, useEffect } from 'react';
import { Truck, MapPin, ChevronRight, ChevronLeft, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase'; // Adjust import path
import UpdateLocationModal from './UpdateLocationModal';

export default function InTransitQueueModal({ isOpen, onClose, onWorkflowComplete }) {
  const [inTransitPOs, setInTransitPOs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);

  // Fetch all in-transit POs with vendor names
  const fetchInTransitPOs = async () => {
    try {
      setLoading(true);
      const { data: pos, error: poError } = await supabase
        .schema('purchase')
        .from('purchase_orders')
        .select('id, po_number, status, lr, updated_at, supplier_id')
        .eq('status', 'in_transit')
        .order('updated_at', { ascending: true });

      if (poError) throw poError;

      const supplierIds = Array.from(
        new Set((pos || []).map((po) => po.supplier_id).filter(Boolean))
      );

      let vendorMap = {};
      if (supplierIds.length > 0) {
        const { data: vendors } = await supabase
          .from('vendors')
          .select('id, vendor_name')
          .in('id', supplierIds);

        (vendors || []).forEach((v) => {
          vendorMap[v.id] = v.vendor_name;
        });
      }

      const formatted = (pos || []).map((po) => ({
        ...po,
        vendor_name: vendorMap[po.supplier_id] || 'N/A',
      }));

      setInTransitPOs(formatted);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Error loading in-transit queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchInTransitPOs();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPO = inTransitPOs[currentIndex];

  const handleNext = () => {
    if (currentIndex < inTransitPOs.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleUpdateSuccess = () => {
    setIsUpdateOpen(false);
    fetchInTransitPOs();
    if (onWorkflowComplete) onWorkflowComplete();
  };

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
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading queue...</div>
            ) : inTransitPOs.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-800">All caught up!</h3>
                <p className="mt-1 text-xs text-slate-500">
                  No active in-transit purchase orders require checking right now.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Progress bar */}
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Shipment {currentIndex + 1} of {inTransitPOs.length}</span>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] uppercase font-bold text-cyan-700 border border-cyan-200">
                    IN TRANSIT
                  </span>
                </div>

                {/* Main PO Info Card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PO Number</span>
                      <p className="text-base font-extrabold text-indigo-600">{currentPO.po_number}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">LR Number</span>
                      <p className="text-xs font-mono font-bold text-slate-700">{currentPO.lr || 'Not Provided'}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/60 pt-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vendor</span>
                    <p className="text-xs font-semibold text-slate-800">{currentPO.vendor_name}</p>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  <button
                    onClick={() => setIsUpdateOpen(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-98 transition-all"
                  >
                    <MapPin size={15} /> Check / Log Location
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={currentIndex === inTransitPOs.length - 1}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nested Location Form Modal */}
      {currentPO && (
        <UpdateLocationModal
          isOpen={isUpdateOpen}
          onClose={() => setIsUpdateOpen(false)}
          po={currentPO}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </>
  );
}