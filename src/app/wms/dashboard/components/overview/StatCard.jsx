"use client";

import React from "react";

export default function StatCard({
  title,
  value,
  change,
  positive,
  icon: Icon,
  colorClasses,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] p-5 hover:-translate-y-1 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.12)] active:translate-y-0 transition-all duration-300 flex flex-col justify-between group">
      
      {/* Top Section: Title & Icon */}
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 duration-300 ${colorClasses}`}>
          <Icon size={18} />
        </div>
      </div>

      {/* Bottom Section: Value & Trend Badge */}
      <div className="mt-4 flex items-baseline justify-between">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          {value}
        </h2>
        
        <span
          className={`text-xs font-bold px-2 py-1 rounded-lg border flex items-center gap-0.5 ${
            positive
              ? "text-emerald-700 bg-emerald-50 border-emerald-100"
              : "text-rose-700 bg-rose-50 border-rose-100"
          }`}
        >
          {change}
        </span>
      </div>

    </div>
  );
}