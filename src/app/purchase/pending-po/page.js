// src/app/purchase/pending-po/page.jsx
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
  MapPin,
} from 'lucide-react';
import { Helix } from 'ldrs/react';
import 'ldrs/react/Helix.css';

import { supabase } from '../../lib/supabase';
import InTransitQueueModal from './sub/InTransitQueueModal';
import AttachLrDrawer from './sub/attachLrDrawer';

// Helper to format ISO/UTC strings correctly in Indian Standard Time (IST)
function formatToIST(dateString) {
  if (!dateString) return 'N/A';
  const utcString =
    dateString.endsWith('Z') || dateString.includes('+')
      ? dateString
      : `${dateString}Z`;

  return new Date(utcString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function PendingPoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal & Drawer States
  const [isInTransitModalOpen, setIsInTransitModalOpen] = useState(false);
  const [selectedPoForDrawer, setSelectedPoForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Active click/action tracker to prevent multiple clicks
  const [activeAction, setActiveAction] = useState(null);

  // Fetch pending purchase orders & their LR exclusively from purchase.shipments
  const fetchPendingPOs = async () => {
    try {
      setLoading(true);

      const { data: pos, error: poError } = await supabase
        .schema('purchase')
        .from('purchase_orders')
        .select('*')
        .neq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (poError) throw poError;

      if (!pos || pos.length === 0) {
        setPurchaseOrders([]);
        return;
      }

      const poIds = pos.map((po) => po.id);
      const supplierIds = Array.from(
        new Set(pos.map((po) => po.supplier_id).filter(Boolean))
      );

      // Fetch vendors and shipments in parallel
      const [vendorRes, shipmentRes] = await Promise.all([
        supplierIds.length > 0
          ? supabase.from('vendors').select('id, vendor_name').in('id', supplierIds)
          : Promise.resolve({ data: [] }),
        supabase
          .schema('purchase')
          .from('shipments')
          .select('po_id, lr_number')
          .in('po_id', poIds)
          .not('lr_number', 'is', null)
          .order('created_at', { ascending: true }),
      ]);

      if (vendorRes.error) throw vendorRes.error;
      if (shipmentRes.error) throw shipmentRes.error;

      // Map vendors
      const vendorMap = (vendorRes.data || []).reduce((acc, v) => {
        acc[v.id] = v;
        return acc;
      }, {});

      // Build map exclusively from purchase.shipments.lr_number
      const shipmentLrMap = {};
      (shipmentRes.data || []).forEach((item) => {
        const cleanLr = item.lr_number?.trim();
        if (cleanLr) {
          if (!shipmentLrMap[item.po_id]) {
            shipmentLrMap[item.po_id] = [];
          }
          if (!shipmentLrMap[item.po_id].includes(cleanLr)) {
            shipmentLrMap[item.po_id].push(cleanLr);
          }
        }
      });

      const combinedData = pos.map((po) => {
        const shipmentLrs = shipmentLrMap[po.id] || [];
        const resolvedLr = shipmentLrs.length > 0 ? shipmentLrs.join(', ') : '';

        return {
          ...po,
          lr: resolvedLr, // Strictly sourced from purchase.shipments
          vendors: vendorMap[po.supplier_id] || null,
        };
      });

      setPurchaseOrders(combinedData);
    } catch (err) {
      console.error('Error fetching pending POs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPOs();
  }, []);

  const handleOpenDrawer = (po) => {
    if (activeAction) return;
    try {
      setActiveAction(`row-${po.id}`);
      setSelectedPoForDrawer(po);
      setIsDrawerOpen(true);
    } finally {
      setActiveAction(null);
    }
  };

  const handleRefresh = async () => {
    if (activeAction || loading) return;
    try {
      setActiveAction('refresh');
      await fetchPendingPOs();
    } finally {
      setActiveAction(null);
    }
  };

  const handleDailyLrCheck = () => {
    if (activeAction) return;
    setIsInTransitModalOpen(true);
  };

  const handleNavigateDashboard = () => {
    if (activeAction) return;
    setActiveAction('nav-dashboard');
    router.push('/purchase');
  };

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

  const inTransitCount = purchaseOrders.filter((po) => po.status === 'in_transit').length;

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

  // Helper to parse multiple LRs from purchase.shipments and render compact badge
  const renderLrBadge = (lrString) => {
    if (!lrString || !lrString.trim()) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
          + Attach LR
        </span>
      );
    }

    const lrList = lrString
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const firstLr = lrList[0];
    const extraCount = lrList.length - 1;

    return (
      <div 
        title={lrList.join(', ')} 
        className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shadow-2xs max-w-[190px]"
      >
        <Truck size={12} className="shrink-0 text-indigo-600" />
        <span className="truncate">{firstLr}</span>
        {extraCount > 0 && (
          <span className="shrink-0 rounded-full bg-indigo-200/70 px-1.5 py-0.2 text-[10px] font-extrabold text-indigo-900">
            +{extraCount}
          </span>
        )}
      </div>
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
                onClick={handleNavigateDashboard}
                disabled={Boolean(activeAction)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 min-h-[30px]"
              >
                {activeAction === 'nav-dashboard' ? (
                  <Helix size="14" speed="2.5" color="#475569" />
                ) : (
                  <>
                    <Home size={14} />
                    <span>Purchase Dashboard</span>
                  </>
                )}
              </button>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-indigo-600" size={24} />
              Pending Purchase Orders
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Click any row or LR pill to view, attach, or manage logistics records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDailyLrCheck}
              disabled={Boolean(activeAction)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
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
              onClick={handleRefresh}
              disabled={loading || Boolean(activeAction)}
              className="flex min-w-[95px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 disabled:opacity-60"
            >
              {loading || activeAction === 'refresh' ? (
                <Helix size="16" speed="2.5" color="#4f46e5" />
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search PO Number, Vendor, or LR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
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

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">#</th>
                  <th className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Hash size={13} />
                      PO Number
                    </div>
                  </th>
                  <th className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <User size={13} />
                      Supplier Name
                    </div>
                  </th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Truck size={13} />
                      LR Update
                    </div>
                  </th>
                  <th className="px-6 py-3.5">
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
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Helix size="36" speed="2.5" color="#4f46e5" />
                        <span className="text-xs font-semibold text-slate-400">
                          Loading pending purchase orders...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No pending purchase orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((po, index) => {
                    const isRowActive = activeAction === `row-${po.id}`;

                    return (
                      <tr 
                        key={po.id} 
                        onClick={() => handleOpenDrawer(po)}
                        className={`transition-colors cursor-pointer group ${
                          isRowActive 
                            ? 'bg-indigo-50/70' 
                            : 'hover:bg-indigo-50/40'
                        }`}
                      >
                        <td className="px-6 py-4 font-semibold text-slate-400">{index + 1}</td>
                        <td className="px-6 py-4 font-bold text-indigo-600 group-hover:underline">
                          <div className="flex items-center gap-2">
                            {isRowActive && <Helix size="14" speed="2.5" color="#4f46e5" />}
                            <span>{po.po_number}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">{po.vendors?.vendor_name || 'N/A'}</td>
                        <td className="px-6 py-4">{getStatusBadge(po.status)}</td>
                        <td className="px-6 py-4">{renderLrBadge(po.lr)}</td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {formatToIST(po.updated_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
            <span>Showing {filteredOrders.length} pending items</span>
            <span>Database Tables: <code className="font-mono text-[10px] bg-slate-200 px-1 py-0.5 rounded">purchase.purchase_orders</code> &amp; <code className="font-mono text-[10px] bg-slate-200 px-1 py-0.5 rounded">purchase.shipments</code></span>
          </div>
        </div>

      </div>

      {/* Attach LR Drawer */}
      <AttachLrDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedPoForDrawer(null);
        }}
        selectedPO={selectedPoForDrawer}
        onSuccess={() => {
          fetchPendingPOs();
        }}
      />

      {/* In-Transit Queue Modal */}
      <InTransitQueueModal
        isOpen={isInTransitModalOpen}
        onClose={() => setIsInTransitModalOpen(false)}
        onWorkflowComplete={() => fetchPendingPOs()}
      />
    </div>
  );
}