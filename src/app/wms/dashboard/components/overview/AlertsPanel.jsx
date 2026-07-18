"use client";

import React from "react";
import {
  AlertTriangle,
  Package,
  Truck,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";

const alerts = [
  {
    icon: AlertTriangle,
    colorClasses: "text-rose-600 bg-rose-50 border-rose-100/80 hover:bg-rose-100/40",
    title: "12 Low Stock Items",
  },
  {
    icon: Package,
    colorClasses: "text-amber-600 bg-amber-50 border-amber-100/80 hover:bg-amber-100/40",
    title: "5 Products Expiring",
  },
  {
    icon: Truck,
    colorClasses: "text-blue-600 bg-blue-50 border-blue-100/80 hover:bg-blue-100/40",
    title: "3 Delayed Deliveries",
  },
  {
    icon: ShieldAlert,
    colorClasses: "text-violet-600 bg-violet-50 border-violet-100/80 hover:bg-violet-100/40",
    title: "Pending QC Inspection",
  },
];

export default function AlertsPanel() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] p-6 h-115 flex flex-col justify-between">
      
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          System Alerts
        </h2>
        <p className="text-xs font-medium text-slate-500 mt-0.5">
          Requires immediate operations review
        </p>
      </div>

      {/* Alerts Container Stack */}
      <div className="space-y-3.5 mt-5 flex-1">
        {alerts.map((item, i) => {
          const Icon = item.icon;

          return (
            <div
              key={i}
              className={`flex items-center justify-between rounded-xl border p-3.5 transition-all duration-200 group ${item.colorClasses}`}
            >
              <div className="flex items-center gap-3.5">
                <Icon
                  size={18}
                  className="shrink-0"
                />
                <span className="text-xs font-bold text-slate-800">
                  {item.title}
                </span>
              </div>

              {/* View CTA Button */}
              <button className="flex items-center gap-0.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
                View
                <ChevronRight size={13} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}