"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Settings,
  Bell,
  Layers,
  TrendingUp,
  FileCheck,
  Sparkles,
} from "lucide-react";

import InvoicesCard from "./utils/cards/invoices";
import PendingPOCard from "./utils/cards/pendingpo";
import PendingApprovalsCard from "./utils/cards/pendingapprvls";
import NewVendorRequestsCard from "./utils/cards/newvendreq";
import NewItemRequestsCard from "./utils/cards/newitemreq";
import CreatePurchaseOrderCard from "./utils/cards/createpo.js";
import PurchaseOrdersTable from "./utils/maincontents/activepurchaseorders";
import PendingApprovals from "./utils/maincontents/pendingapprovals";

export default function PurchaseDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800">
      {/* Container with optimal padding & max-width */}
      <div className="max-w-[1580px] mx-auto p-6 space-y-6">

        {/* ================= TOP APPLICATION HEADER ================= */}
        <header className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Branding & Subtitle */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Procurement & Supply Chain
                </h1>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/60">
                  Live Operations
                </span>
              </div>
              <p className="text-xs text-slate-500 m-0">
                Manage orders, supplier contracts, demand pools, and goods receipts
              </p>
            </div>
          </div>

          {/* Right: Search + Tools */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search POs, vendors, SKUs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-2 pl-9 pr-12 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-white border border-slate-200 rounded">
                ⌘K
              </kbd>
            </div>

            <button
              type="button"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors relative"
              title="Alerts & Activity"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 bg-rose-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white" />
            </button>

            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 hover:border-indigo-200 transition-all"
              title="Purchase Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ================= METRIC HIGHLIGHT RIBBON ================= */}
        <section aria-label="Key Performance Indicators">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <InvoicesCard />
            <PendingPOCard />
            <PendingApprovalsCard />
            <NewItemRequestsCard />
            <NewVendorRequestsCard />
            <CreatePurchaseOrderCard />
          </div>
        </section>


        {/* ================= FULL WIDTH ACTIVE PURCHASE ORDERS ================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5 space-y-4 overflow-hidden min-w-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-none">
                  Active Purchase Orders
                </h2>
                <span className="text-[11px] text-slate-400">
                  Real-time delivery progress, verification status, and supplier shipments
                </span>
              </div>
            </div>
          </div>

          {/* Strict containment wrapper */}
          <div className="w-full overflow-x-auto min-w-0">
            <PurchaseOrdersTable searchQuery={searchQuery} />
          </div>
        </div>

        {/* ================= FULL WIDTH PENDING APPROVALS ================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-none">
                  Requisitions & Indents
                </h2>
                <span className="text-[11px] text-slate-400">
                  Pending authorization from department heads
                </span>
              </div>
            </div>
          </div>

          <PendingApprovals />
        </div>

      </div>
    </div>
  );
}