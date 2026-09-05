'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Truck,
  FileText,
  Building2,
  Calendar,
  Package,
  Save,
  AlertCircle,
  CheckCircle2,
  Plus,
  Phone,
  User,
  Globe,
  Mail,
  Edit2,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Bouncy } from 'ldrs/react';
import 'ldrs/react/Bouncy.css';
import { supabase } from '../../../lib/supabase';

export default function AttachLrDrawer({ isOpen, onClose, selectedPO, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState(null); // Tracks item-specific action
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Transporter state
  const [transporters, setTransporters] = useState([]);
  const [loadingTransporters, setLoadingTransporters] = useState(false);
  const [isAddTransporterOpen, setIsAddTransporterOpen] = useState(false);

  // Quick Add Transporter Modal Form State
  const [newTransporterName, setNewTransporterName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTrackingBaseUrl, setNewTrackingBaseUrl] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form State
  const [editingShipmentId, setEditingShipmentId] = useState(null);
  const [lrNumber, setLrNumber] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [packageCount, setPackageCount] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingDate, setBookingDate] = useState('');

  // Existing Shipments attached to this PO
  const [existingShipments, setExistingShipments] = useState([]);

  // Fetch Transporters list from public.transporters
  const fetchTransporters = async () => {
    try {
      setLoadingTransporters(true);
      const { data, error } = await supabase
        .from('transporters')
        .select('id, transporter_name, phone, contact_person, tracking_base_url')
        .eq('active', true)
        .order('transporter_name', { ascending: true });

      if (error) throw error;
      setTransporters(data || []);
    } catch (err) {
      console.error('Error fetching transporters:', err);
    } finally {
      setLoadingTransporters(false);
    }
  };

  // Fetch all shipments attached to this PO
  const fetchExistingShipments = async (poId) => {
    if (!poId) return;
    try {
      const { data, error } = await supabase
        .schema('purchase')
        .from('shipments')
        .select('*')
        .eq('po_id', poId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingShipments(data || []);
    } catch (err) {
      console.error('Error fetching existing shipments:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTransporters();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingShipmentId(null);
    setLrNumber('');
    setTransporterName('');
    setPackageCount('');
    setExpectedDate('');
    setNotes('');
    setBookingDate('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Sync state when drawer opens with a PO
  useEffect(() => {
    if (selectedPO) {
      fetchExistingShipments(selectedPO.id);
      resetForm();
    } else {
      setExistingShipments([]);
    }
  }, [selectedPO]);

  // Sync purchase_orders table with remaining/updated LRs
  const syncPurchaseOrder = async (poId) => {
    const now = new Date().toISOString();
    const { data: allShipments, error: fetchError } = await supabase
      .schema('purchase')
      .from('shipments')
      .select('lr_number')
      .eq('po_id', poId);

    if (fetchError) throw fetchError;

    const remainingLrs = Array.from(
      new Set((allShipments || []).map((s) => s.lr_number).filter(Boolean))
    ).join(', ');

    const { error: poError } = await supabase
      .schema('purchase')
      .from('purchase_orders')
      .update({
        lr: remainingLrs || null,
        status: remainingLrs ? 'in_transit' : 'waiting_lr',
        updated_at: now,
      })
      .eq('id', poId);

    if (poError) throw poError;
  };

  // Populate form for editing an existing shipment
  const handleEdit = (shipment) => {
    if (loading || actionInProgressId) return;

    setEditingShipmentId(shipment.id);
    setLrNumber(shipment.lr_number || '');
    setTransporterName(shipment.transporter || '');
    setPackageCount(
      shipment.no_of_boxes ? String(shipment.no_of_boxes) : ''
    );

    setBookingDate(
      shipment.booking_date
        ? new Date(shipment.booking_date).toISOString().split('T')[0]
        : ''
    );

    setExpectedDate(
      shipment.expected_delivery_date
        ? new Date(shipment.expected_delivery_date).toISOString().split('T')[0]
        : ''
    );

    setNotes(shipment.remarks || '');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Delete a shipment
  const handleDelete = async (shipmentId) => {
    if (loading || actionInProgressId) return; // Prevent concurrent requests
    if (!window.confirm('Are you sure you want to delete this LR record?')) return;

    try {
      setActionInProgressId(shipmentId);
      setErrorMsg(null);

      const { error } = await supabase
        .schema('purchase')
        .from('shipments')
        .delete()
        .eq('id', shipmentId);

      if (error) throw error;

      await syncPurchaseOrder(selectedPO.id);
      await fetchExistingShipments(selectedPO.id);

      if (editingShipmentId === shipmentId) {
        resetForm();
      }

      setSuccessMsg('LR record deleted successfully!');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error deleting LR record:', err);
      setErrorMsg(err.message || 'Failed to delete LR record.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Create new Transporter in DB
  const handleCreateTransporter = async (e) => {
    e.preventDefault();
    if (modalLoading) return;

    if (
      !newTransporterName.trim() ||
      !newContactPerson.trim() ||
      !newPhone.trim() ||
      !newEmail.trim() ||
      !newTrackingBaseUrl.trim()
    ) {
      setModalError('All transporter fields are required.');
      return;
    }

    try {
      setModalLoading(true);
      setModalError(null);

      const payload = {
        transporter_name: newTransporterName.trim(),
        contact_person: newContactPerson.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        tracking_base_url: newTrackingBaseUrl.trim(),
        active: true,
      };

      const { data, error } = await supabase
        .from('transporters')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setTransporters((prev) =>
        [...prev, data].sort((a, b) => a.transporter_name.localeCompare(b.transporter_name))
      );
      setTransporterName(data.transporter_name);

      setNewTransporterName('');
      setNewContactPerson('');
      setNewPhone('');
      setNewEmail('');
      setNewTrackingBaseUrl('');
      setIsAddTransporterOpen(false);
    } catch (err) {
      console.error('Error creating transporter:', err);
      setModalError(err.message || 'Failed to create transporter.');
    } finally {
      setModalLoading(false);
    }
  };

  // Save or Update LR record
  const handleSave = async (e) => {
    e.preventDefault();
    if (loading || actionInProgressId) return; // Prevent double trigger

    if (!lrNumber.trim()) {
      setErrorMsg('LR / Bilty Number is required.');
      return;
    }
    if (!transporterName.trim()) {
      setErrorMsg('Please select a transporter.');
      return;
    }
    if (!packageCount || parseInt(packageCount, 10) <= 0) {
      setErrorMsg('Please enter a valid parcel / box count.');
      return;
    }
    if (!expectedDate) {
      setErrorMsg('Expected delivery date is required.');
      return;
    }
    if (!bookingDate) {
      setErrorMsg('Booking date is required.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const now = new Date().toISOString();
      const cleanLr = lrNumber.trim();
      const cleanTransporter = transporterName.trim();

      // 1. Fetch transporter tracking URL (or transporter ID) from transporters table
      let trackingUrl = null;
      let transporterId = null;

      const { data: transporterData } = await supabase
        .from('transporters')
        .select('id, tracking_base_url, transporter_name')
        .ilike('transporter_name', cleanTransporter)
        .maybeSingle();

      if (transporterData) {
        transporterId = transporterData.id;
        trackingUrl = transporterData.tracking_base_url || null;
      }

      // 2. Build shipment payload with tracking_url
      const shipmentPayload = {
        po_id: selectedPO.id,
        transporter_id: transporterId,
        transporter: cleanTransporter,
        lr_number: cleanLr,
        booking_date: bookingDate,
        tracking_url: trackingUrl,
        no_of_boxes: parseInt(packageCount, 10),
        expected_delivery_date: expectedDate,
        remarks: notes.trim() || null,
        shipment_status: 'In Transit',
        updated_at: now,
      };

      if (editingShipmentId) {
        const { error: updateError } = await supabase
          .schema('purchase')
          .from('shipments')
          .update(shipmentPayload)
          .eq('id', editingShipmentId);

        if (updateError) throw updateError;
        setSuccessMsg('LR details updated successfully!');
      } else {
        const { error: insertError } = await supabase
          .schema('purchase')
          .from('shipments')
          .insert({ ...shipmentPayload, created_at: now });

        if (insertError) throw insertError;
        setSuccessMsg('New LR attached successfully!');
      }

      await syncPurchaseOrder(selectedPO.id);
      await fetchExistingShipments(selectedPO.id);
      resetForm();

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error saving LR details:', err);
      setErrorMsg(err.message || 'Failed to update LR details.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <AnimatePresence>
        {isOpen && selectedPO && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop Fade In/Out */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              onClick={!loading && !actionInProgressId ? onClose : undefined}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
              {/* Drawer Panel Right-to-Left Sweep */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="pointer-events-auto w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200"
              >

                {/* Header */}
                <div className="border-b border-slate-100 bg-white px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80">
                        <Truck size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-800 leading-tight">
                          Manage Lorry Receipts (LR)
                        </h2>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          PO: <span className="font-mono font-bold text-slate-700">{selectedPO.po_number}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={onClose}
                      disabled={loading || actionInProgressId}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition disabled:opacity-50"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Vendor & Amount Summary Card */}
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50/80 border border-slate-100 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 truncate mr-2">
                      <Building2 size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate font-semibold text-slate-700">
                        {selectedPO.vendors?.vendor_name || 'Vendor N/A'}
                      </span>
                    </div>
                    {/* {selectedPO.grand_total && (
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        ₹{Number(selectedPO.grand_total).toLocaleString('en-IN')}
                      </span>
                    )} */}
                  </div>
                </div>

                {/* Body / Form */}
                <form id="lr-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                  {errorMsg && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                      <AlertCircle size={15} className="shrink-0" />
                      <span className="font-medium">{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
                      <CheckCircle2 size={15} className="shrink-0" />
                      <span className="font-medium">{successMsg}</span>
                    </div>
                  )}

                  {/* Existing Attached LRs List */}
                  {existingShipments.length > 0 && (
                    <div className="space-y-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 text-xs">
                          Attached LRs ({existingShipments.length})
                        </span>
                        {editingShipmentId && (
                          <button
                            type="button"
                            onClick={resetForm}
                            disabled={loading || actionInProgressId}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50"
                          >
                            <RotateCcw size={11} />
                            <span>Cancel Edit</span>
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {existingShipments.map((s) => {
                          const isCurrentlyEditing = editingShipmentId === s.id;
                          const isItemDeleting = actionInProgressId === s.id;

                          return (
                            <div
                              key={s.id}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${isCurrentlyEditing
                                ? 'bg-indigo-50/70 border-indigo-200'
                                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                                }`}
                            >
                              <div className="flex flex-col gap-0.5 truncate mr-2">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Truck size={13} className="text-indigo-600 shrink-0" />
                                  <span className="font-mono font-bold text-slate-800">{s.lr_number}</span>
                                  <span className="text-slate-500 text-[11px] truncate">
                                    • {s.transporter || 'No Transporter'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 pl-4">
                                  {s.no_of_boxes ? `${s.no_of_boxes} Boxes` : 'Boxes unassigned'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(s)}
                                  disabled={loading || actionInProgressId}
                                  className="p-1 rounded-md text-slate-500 hover:bg-indigo-100 hover:text-indigo-700 transition disabled:opacity-40"
                                  title="Edit LR"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(s.id)}
                                  disabled={loading || actionInProgressId}
                                  className="p-1 min-w-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 transition disabled:opacity-40"
                                  title="Delete LR"
                                >
                                  {isItemDeleting ? (
                                    <Bouncy size="16" speed="1.75" color="#ef4444" />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Mode Indicator */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      {editingShipmentId ? 'Edit LR Details' : 'Add New LR'}
                    </span>
                    {editingShipmentId && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Editing Mode
                      </span>
                    )}
                  </div>

                  {/* LR Number (Required) */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">
                      LR / Bilty Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        disabled={loading || actionInProgressId}
                        placeholder="e.g. VRL-98726354"
                        value={lrNumber}
                        onChange={(e) => setLrNumber(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 font-mono font-semibold text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Transporter Dropdown (Required) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700">
                        Transporter <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddTransporterOpen(true)}
                        disabled={loading || actionInProgressId}
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline disabled:opacity-50"
                      >
                        <Plus size={12} />
                        <span>Add Transporter</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Truck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        required
                        disabled={loading || actionInProgressId}
                        value={transporterName}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setIsAddTransporterOpen(true);
                          } else {
                            setTransporterName(e.target.value);
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs disabled:bg-slate-50"
                      >
                        <option value="">-- Select Transporter --</option>
                        {transporters.map((t) => (
                          <option key={t.id} value={t.transporter_name}>
                            {t.transporter_name} {t.phone ? `(${t.phone})` : ''}
                          </option>
                        ))}
                        <option value="__add_new__" className="font-bold text-indigo-600">
                          + Add New Transporter...
                        </option>
                      </select>
                    </div>
                  </div>

                  
                  {/* Booking Date */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">
                      Booking Date <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <Calendar
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        type="date"
                        required
                        disabled={loading || actionInProgressId}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Package Count & Expected Delivery (Both Required) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">
                        Parcel / Box Count <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Package size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          required
                          min="1"
                          disabled={loading || actionInProgressId}
                          placeholder="e.g. 5"
                          value={packageCount}
                          onChange={(e) => setPackageCount(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 font-mono text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs disabled:bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">
                        Expected Delivery <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          required
                          disabled={loading || actionInProgressId}
                          value={expectedDate}
                          onChange={(e) => setExpectedDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs disabled:bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logistics Remarks (Optional) */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">
                      Logistics Remarks / Notes <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      disabled={loading || actionInProgressId}
                      placeholder="Gate pass number, delivery notes, or special handling..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs disabled:bg-slate-50"
                    />
                  </div>
                </form>

                {/* Footer Actions */}
                <div className="border-t border-slate-100 bg-white p-4 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading || actionInProgressId}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition disabled:opacity-50"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    form="lr-form"
                    disabled={loading || actionInProgressId}
                    className="flex min-w-[130px] justify-center items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition disabled:opacity-75 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <div className="py-0.5">
                        <Bouncy size="25" speed="1.75" color="white" />
                      </div>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>{editingShipmentId ? 'Update LR' : 'Save LR Details'}</span>
                      </>
                    )}
                  </button>
                </div>

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD NEW TRANSPORTER MODAL --- */}
      <AnimatePresence>
        {isAddTransporterOpen && (
          <div className="fixed inset-0 z-60 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4 text-center">
              {/* Modal Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={!modalLoading ? () => setIsAddTransporterOpen(false) : undefined}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
              />

              {/* Modal Panel */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl border border-slate-100 transition-all z-10"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Truck size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Add New Transporter</h3>
                      <p className="text-[11px] text-slate-400">All fields below are mandatory</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddTransporterOpen(false)}
                    disabled={modalLoading}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-50"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleCreateTransporter} className="mt-4 space-y-3.5 text-xs">
                  {modalError && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-700">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{modalError}</span>
                    </div>
                  )}

                  {/* Transporter Name */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">
                      Transporter Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        disabled={modalLoading}
                        placeholder="e.g. VRL Logistics Ltd."
                        value={newTransporterName}
                        onChange={(e) => setNewTransporterName(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Contact Person & Phone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">
                        Contact Person <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          disabled={modalLoading}
                          placeholder="e.g. Rajesh Kumar"
                          value={newContactPerson}
                          onChange={(e) => setNewContactPerson(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          required
                          disabled={modalLoading}
                          placeholder="e.g. +91 98765 43210"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        disabled={modalLoading}
                        placeholder="e.g. dispatch@vrllogistics.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Tracking Base URL */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">
                      Tracking Base URL <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        required
                        disabled={modalLoading}
                        placeholder="e.g. https://www.vrllogistics.com/track"
                        value={newTrackingBaseUrl}
                        onChange={(e) => setNewTrackingBaseUrl(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  {/* Modal Buttons */}
                  <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsAddTransporterOpen(false)}
                      disabled={modalLoading}
                      className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="inline-flex min-w-[140px] justify-center items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 active:scale-95 transition disabled:opacity-75 disabled:pointer-events-none"
                    >
                      {modalLoading ? (
                        <div className="py-0.5">
                          <Bouncy size="22" speed="1.75" color="white" />
                        </div>
                      ) : (
                        <>
                          <Save size={13} />
                          <span>Save Transporter</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}