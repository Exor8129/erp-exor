"use client";

import React from "react";
import { Search } from "lucide-react";
import InvoicesCard from "./utils/cards/invoices";
import PendingPOCard from "./utils/cards/pendingpo";
import PendingApprovalsCard from "./utils/cards/pendingapprvls";
import NewVendorRequestsCard from "./utils/cards/newvendreq";
import NewItemRequestsCard from "./utils/cards/newitemreq";
import CreatePurchaseOrderCard from "./utils/cards/createpo.js";
import PurchaseOrdersTable from "./utils/maincontents/purchaseorders";
import PendingApprovals from "./utils/maincontents/pendingapprovals";
import NewRequestFeed from "./utils/maincontents/newrequestfeed";




const PurchaseDashboard = () => {

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between bg-[#1e293b] p-4 rounded-t-lg text-white">
        <h1 className="text-xl font-bold tracking-tight uppercase">
          Purchase Department Dashboard
        </h1>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-white/10 border border-white/20 rounded-md py-1.5 px-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-white/50"
          />
          <Search className="absolute left-3 top-2 w-4 h-4 text-white/60" />
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
        <InvoicesCard />

        {/* Dynamic Metric Cards */}
        <PendingPOCard />
        <PendingApprovalsCard />
        <NewItemRequestsCard />
        <NewVendorRequestsCard />
        <CreatePurchaseOrderCard />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Left: Tables */}
        <div className="lg:col-span-2 space-y-6">
          <PurchaseOrdersTable />
          <PendingApprovals />
        </div>

        {/* Right: Feed */}
        <NewRequestFeed />
      </div>
    </div>
  );
};

export default PurchaseDashboard;
