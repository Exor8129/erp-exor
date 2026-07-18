// src/app/wms/dashboard/page.js
"use client";

import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
// 1. Import your Overview component from the pages directory
import Overview from "./pages/Overview";
import CreateWarehouse from "./pages/create-warehouse";
import Temp from "./pages/temp"
import "../../globals.css";

export default function WmsDashboardPage() {
  const [activeTab, setActiveTab] = useState("Overview");

  // 2. Helper function or object to dynamically switch content based on the active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "Overview":
        return <Overview />;

      case "Create Warehouse":
        return <CreateWarehouse />;

      case "Temp":
        return <Temp/>; // Placeholder for future content

      // You can add more tabs easily like this later:
      // case "Analytics":
      //   return <Analytics />;

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full min-h-100 text-center">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {activeTab} Workspace Loaded
            </h2>
            <p className="text-xs font-medium text-slate-400 max-w-xs mt-1">
              Ready for content insertion.
            </p>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "#f3f3f3",
        display: "flex",
        overflow: "hidden",
        userSelect: "none",
      }}
      className="antialiased"
    >
      {/* Flat Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* App Header */}
        <div className="px-8 pt-5 pb-3 bg-transparent shrink-0">
          <Header />
        </div>

        {/* Scrollable Viewport Container */}
        <div className="flex-1 h-full min-h-0 px-8 pb-8 pt-1">
          {/* THE ELEVATED MAIN CANVAS CARD WITH ROUNDED CORNERS */}
          <div
            style={{ borderRadius: "32px" }}
            className="
    w-full 
    h-full 
    bg-white 
    shadow-[0_20px_50px_-12px_rgba(0,0,0,0.06)]
    p-6 
    xl:p-8 
    overflow-y-hidden
    overflow-x-auto
  "
          >
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
