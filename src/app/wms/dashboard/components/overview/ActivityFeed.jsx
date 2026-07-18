"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

const activity = [
  {
    user: "Rahul",
    action: "created Purchase Order PO-10258",
    time: "5 min ago",
  },
  {
    user: "Anjali",
    action: "approved Goods Receipt GRN-205",
    time: "18 min ago",
  },
  {
    user: "Joseph",
    action: "updated stock quantity",
    time: "32 min ago",
  },
  {
    user: "Warehouse Bot",
    action: "generated inventory report",
    time: "1 hour ago",
  },
  {
    user: "Admin",
    action: "added new supplier",
    time: "2 hours ago",
  },
];

export default function ActivityFeed() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] p-6 h-full flex flex-col justify-between">
      
      {/* Header Area */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Activity Feed
        </h2>
        
        <button className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-xl transition active:scale-95">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Timeline Stream */}
      <div className="relative space-y-6 overflow-hidden">
        {/* The visual vertical timeline line */}
        <div className="absolute left-4.5 top-2 bottom-2 w-0.5 bg-slate-100 pointer-events-none" />

        {activity.map((item, index) => (
          <div
            key={index}
            className="relative flex items-start gap-4 group"
          >
            {/* User Initial Circle Badge */}
            <div className="relative z-10 w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors shrink-0">
              {item.user === "Warehouse Bot" ? "🤖" : item.user[0]}
            </div>

            {/* Event Description Content */}
            <div className="pt-1.5">
              <p className="text-sm text-slate-600 leading-normal">
                <span className="font-semibold text-slate-900 mr-1">
                  {item.user}
                </span>
                {item.action}
              </p>
              
              <p className="text-xs font-medium text-slate-400 mt-1">
                {item.time}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}