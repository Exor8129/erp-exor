"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const data = [
  { day: "Mon", inbound: 900, outbound: 620 },
  { day: "Tue", inbound: 500, outbound: 600 },
  { day: "Wed", inbound: 760, outbound: 470 },
  { day: "Thu", inbound: 980, outbound: 610 },
  { day: "Fri", inbound: 880, outbound: 580 },
  { day: "Sat", inbound: 470, outbound: 560 },
  { day: "Sun", inbound: 310, outbound: 710 },
];

export default function StockFlowChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] p-6 h-115 flex flex-col justify-between">
      
      {/* Chart Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Stock Flow Analysis
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Inbound vs Outbound Inventory
          </p>
        </div>

        {/* Custom Filter Selector */}
        <select className="border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50 text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer transition">
          <option>Weekly</option>
          <option>Monthly</option>
          <option>Yearly</option>
        </select>
      </div>

      {/* Chart Visualization Area */}
      <div className="flex-1 w-full min-h-75">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={6} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              stroke="#F1F5F9" // Softer border stroke
            />

            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
              dy={10}
            />

            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
              dx={-5}
            />

            {/* Custom Modern Hover Tooltip */}
            <Tooltip 
              cursor={{ fill: '#F8FAFC' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)',
                padding: '10px 14px'
              }}
              labelStyle={{ fontSize: '11px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}
              itemStyle={{ fontSize: '11px', fontWeight: '600', padding: '2px 0' }}
            />

            {/* Inbound Stock Bars (Primary Blue) */}
            <Bar
              dataKey="inbound"
              fill="#2563EB"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />

            {/* Outbound Stock Bars (Slate Accent Blue) */}
            <Bar
              dataKey="outbound"
              fill="#93C5FD"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Custom Labels */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-50 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-blue-600"></span>
          <span className="text-slate-600">Inbound Stock</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-blue-300"></span>
          <span className="text-slate-600">Outbound Stock</span>
        </div>
      </div>

    </div>
  );
}