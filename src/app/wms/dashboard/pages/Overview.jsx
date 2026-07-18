"use client";

import React from "react";
import KPICards from "../components/overview/KpiCards";
import StockFlowChart from "../components/overview/StockFlowChart";
import ShipmentsTimeline from "../components/overview/ShipmentsTimeline";
import AlertsPanel from "../components/overview/AlertsPanel";
import WarehouseUtilization from "../components/overview/WarehouseUtilization";
import RecentOrders from "../components/overview/RecentOrders";
import ActivityFeed from "../components/overview/ActivityFeed";

export default function Overview() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Level 1: Key Performance Indicators (Cards) */}
      <KPICards />

      {/* Level 2: Primary Analytics & Urgent Updates */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Main Visual Data */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <StockFlowChart />
          <ShipmentsTimeline />
        </div>

        {/* Quick-Scan Operational Status Panels */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <AlertsPanel />
          <WarehouseUtilization />
        </div>
      </div>

      {/* Level 3: Real-time Ledger & Execution Records */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col">
          <RecentOrders />
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}