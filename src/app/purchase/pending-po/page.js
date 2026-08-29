'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  Search, 
  RefreshCw, 
  FileText, 
  Truck, 
  Calendar, 
  User, 
  Hash,
  MapPin
} from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Adjust import path if needed
import InTransitQueueModal from './sub/InTransitQueueModal'; // Adjust import path to your modal component location

export default function PendingPoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('in_transit');

  // Modal State
  const [isInTransitModalOpen, setIsInTransitModalOpen] = useState(false);

  // Fetch pending purchase orders (status != 'completed')
  const fetchPendingPOs = async () => {
    try {
      setLoading(true);

      // 1. Fetch Purchase Orders from the 'purchase' schema
      const { data: pos, error: poError } = await supabase
        .schema('purchase')
        .from('purchase_orders')
        .select('id, po_number, status, lr, updated_at, created_at, grand_total, supplier_id')
        .neq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (poError) throw poError;

      // 2. Extract unique supplier IDs
      const supplierIds = Array.from(
        new Set((pos || []).map((po) => po.supplier_id).filter(Boolean))
      );

      // 3. Fetch Vendors from the 'public' schema using the collected IDs
      let vendorMap = {};
      if (supplierIds.length > 0) {
        const { data: vendors, error: vendorError } = await supabase
          .from('vendors')
          .select('id, vendor_name')
          .in('id', supplierIds);

        if (vendorError) throw vendorError;

        (vendors || []).forEach((v) => {
          vendorMap[v.id] = v;
        });
      }

      // 4. Combine the data back into a single object array
      const combinedData = (pos || []).map((po) => ({
        ...po,
        vendors: vendorMap[po.supplier_id] || null,
      }));

      setPurchaseOrders(combinedData);
    } catch (err) {
      console.error('Error fetching pending POs:', err);
    } finally{
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPOs();
  }, []);

  // Filter logic
  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendors?.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.lr && po.lr.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || po.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Count active in-transit items for button badge display
  const inTransitCount = purchaseOrders.filter(
    (po) => po.status === 'in_transit'
  ).length;

  // Status Badge Formatter
  const getStatusBadge = (status) => {
    const statusMap = {
      draft: 'bg-slate-100 text-slate-700 border-slate-300',
      inbound: 'bg-blue-50 text-blue-700 border-blue-200',
      grn_created: 'bg-purple-50 text-purple-700 border-purple-200',
      waiting_lr: 'bg-amber-50 text-amber-700 border-amber-200',
      in_transit: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      at_destination: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };

    const label = status?.replace('_', ' ').toUpperCase() || 'UNKNOWN';
    const style = statusMap[status] || 'bg-gray-100 text-gray-700 border-gray-200';

    return (
      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider ${style}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/purchase')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
              >
                <Home size={14} />
                <span>Purchase Dashboard</span>
              </button>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-indigo-600" size={24} />
              Pending Purchase Orders
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Overview of all purchase orders requiring action or logistics updates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Daily LR Check Button */}
            <button
              onClick={() => setIsInTransitModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
            >
              <MapPin size={15} />
              <span>Daily LR Check</span>
              {inTransitCount > 0 && (
                <span className="ml-1 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                  {inTransitCount}
                </span>
              )}
            </button>

            <button
              onClick={fetchPendingPOs}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search PO Number, Vendor, or LR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2">
            <span className="text-xs font-medium text-slate-500 shrink-0">Status Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Pending Statuses</option>
              <option value="draft">Draft</option>
              <option value="inbound">Inbound</option>
              <option value="grn_created">GRN Created</option>
              <option value="waiting_lr">Waiting LR</option>
              <option value="in_transit">In Transit</option>
              <option value="at_destination">At Destination</option>
            </select>
          </div>
        </div>

        {/* Data Table Card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3.5">#</th>
                  <th scope="col" className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Hash size={13} />
                      PO Number
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <User size={13} />
                      Supplier Name
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Truck size={13} />
                      LR Update
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} />
                      Last Updated On
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-indigo-500" />
                      Loading pending purchase orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No pending purchase orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((po, index) => (
                    <tr 
                      key={po.id} 
                      className="transition-colors hover:bg-slate-50/80 cursor-pointer"
                    >
                      {/* Sl No */}
                      <td className="px-6 py-4 font-semibold text-slate-400">
                        {index + 1}
                      </td>

                      {/* PO Number */}
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        {po.po_number}
                      </td>

                      {/* Party Name */}
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {po.vendors?.vendor_name || 'N/A'}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {getStatusBadge(po.status)}
                      </td>

                      {/* LR Update */}
                      <td className="px-6 py-4">
                        {po.lr ? (
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                            {po.lr}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending LR</span>
                        )}
                      </td>

                      {/* Last Updated On */}
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {po.updated_at
                          ? new Date(po.updated_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            <span>Showing {filteredOrders.length} pending items</span>
            <span>Database Table: <code className="font-mono text-[10px] bg-slate-200 px-1 py-0.5 rounded">purchase.purchase_orders</code></span>
          </div>
        </div>

      </div>

      {/* In-Transit Workflow Queue Modal */}
      <InTransitQueueModal
        isOpen={isInTransitModalOpen}
        onClose={() => setIsInTransitModalOpen(false)}
        onWorkflowComplete={() => {
          fetchPendingPOs(); // Auto-refreshes the table when an LR status update completes
        }}
      />
    </div>
  );
}