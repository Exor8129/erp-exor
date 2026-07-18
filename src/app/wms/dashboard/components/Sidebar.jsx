"use client";

import React from "react";
import {
  LayoutDashboard,
  BarChart3,
  Boxes,
  Sliders,
  PieChart,
  ClipboardList,
  Truck,
  FileSpreadsheet,
  PackagePlus,
  Network,
  Users,
  Settings,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

const menuGroups = [
  {
    group: "Dashboard",
    items: [
      { title: "Overview", icon: LayoutDashboard },
      { title: "Analytics", icon: BarChart3 },
    ],
  },
  {
    group: "Inventory",
    items: [
      { title: "Stocks", icon: Boxes },
      { title: "Adjustments", icon: Sliders },
      { title: "Utilization", icon: PieChart },
    ],
  },
  {
    group: "Inbound",
    items: [
      { title: "Goods Receipt Note", icon: ClipboardList },
    ],
  },
  {
    group: "Outbound",
    items: [
      { title: "Dispatch", icon: Truck },
      { title: "Shipment Logs", icon: FileSpreadsheet },
    ],
  },
  {
    group: "Warehouse",
    items: [
      { title: "Create Warehouse", icon: PackagePlus },
      { title: "Sectors & Layout", icon: Network },
      { title: "Temp", icon: Sliders },

      
    ],
  },
  {
    group: "System",
    items: [
      { title: "Users", icon: Users },
      { title: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-64 bg-[#3d0505] flex flex-col justify-between shrink-0 h-screen">
      
      {/* Upper Scrollable Content Area */}
      <div className="flex flex-col flex-1 min-h-0">
        
        {/* Brand / Logo Area */}
        <div className="h-20 flex items-center px-6 gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-blue-500/20">
            W
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 tracking-tight leading-none">
              Warehouse
            </h1>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
              Management System
            </p>
          </div>
        </div>

        {/* Dynamic Navigation Groups */}
        <div className="flex-1 px-4 py-2 overflow-y-auto space-y-5">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              
              {/* Group Header Label */}
              <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider px-3 mb-1.5">
                {group.group}
              </p>

              {/* Group Nav Items */}
              <nav className="space-y-0.5">
                {group.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.title;

                  return (
                    <button
                      key={itemIdx}
                      onClick={() => setActiveTab(item.title)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group text-xs font-semibold ${
                        isActive
                          ? "bg-white border border-slate-100 text-blue-600 shadow-sm"
                          : "hover:bg-slate-100/60 text-slate-600 hover:text-slate-900 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon 
                          size={15} 
                          className={isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"} 
                        />
                        <span>{item.title}</span>
                      </div>

                      <ChevronRight
                        size={13}
                        className={`transition-all duration-200 ${
                          isActive
                            ? "text-blue-600 opacity-100 translate-x-0"
                            : "text-slate-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>

              {/* Subtle Group Separator Line */}
              {groupIdx !== menuGroups.length - 1 && (
                <div className="h-px bg-slate-200/50 mt-4 mx-3" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Capacity Block */}
      <div className="p-4 shrink-0">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Storage Capacity
            </p>
            <span className="text-xs font-bold text-slate-900">82%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div className="w-[82%] h-full bg-blue-600 rounded-full"></div>
          </div>

          <button className="mt-3.5 flex items-center justify-center gap-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl w-full py-2 text-xs font-bold hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98] transition-all">
            Capacity Report
            <ArrowUpRight size={13} className="text-slate-400" />
          </button>
        </div>
      </div>

    </aside>
  );
}