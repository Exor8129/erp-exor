"use client";

import React from "react";

const timeline = [
  {
    time: "08:00 AM",
    title: "Shipment Received",
    desc: "PO-10251 completed",
  },
  {
    time: "09:40 AM",
    title: "QC Inspection",
    desc: "Warehouse A",
  },
  {
    time: "11:20 AM",
    title: "Items Stored",
    desc: "Rack B12",
  },
  {
    time: "02:10 PM",
    title: "Dispatch Started",
    desc: "Invoice INV-2487",
  },
];

export default function ShipmentsTimeline() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] p-6 h-full flex flex-col justify-between">
      
      {/* Block Title */}
      <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-6">
        Today's Warehouse Activity
      </h2>

      {/* Timeline Dynamic List */}
      <div className="relative space-y-6">
        
        {timeline.map((item, index) => (
          <div
            key={index}
            className="relative flex gap-5 group"
          >
            {/* Timeline Track & Node Indicator Column */}
            <div className="flex flex-col items-center shrink-0">
              
              {/* Timeline Node dot with halo element */}
              <div className="w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-blue-50 z-10 group-hover:scale-110 transition-transform duration-200" />

              {/* Connecting Vertical Track line */}
              {index !== timeline.length - 1 && (
                <div className="w-0.5 absolute top-3.5 bottom-0 bg-slate-100 left-1.5 z-0" />
              )}

            </div>

            {/* Event Details Content Layout */}
            <div className="-mt-1 pb-2">
              <span className="text-xs font-semibold text-slate-400">
                {item.time}
              </span>

              <h3 className="text-sm font-semibold text-slate-900 tracking-tight mt-0.5 group-hover:text-blue-600 transition-colors">
                {item.title}
              </h3>

              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {item.desc}
              </p>
            </div>

          </div>
        ))}

      </div>

    </div>
  );
}