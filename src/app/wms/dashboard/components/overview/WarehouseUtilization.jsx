"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from "recharts";

const warehouse = [
  {
    area: "Sector A",
    value: 37,
  },
  {
    area: "Sector B",
    value: 32,
  },
  {
    area: "Sector C",
    value: 26,
  },
];

export default function WarehouseUtilization() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] p-6 h-115 flex flex-col justify-between">
      
      {/* Header Info */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Warehouse Utilization
        </h2>
        <p className="text-xs font-medium text-slate-500 mt-0.5">
          Current Storage Capacity
        </p>
      </div>

      {/* Recharts Bar Chart Area */}
      <div className="h-32 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={warehouse} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="area" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
            />
            
            <Tooltip 
              cursor={{ fill: '#F8FAFC' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.05)',
                padding: '6px 10px'
              }}
              labelStyle={{ fontSize: '10px', fontWeight: '700', color: '#1E293B' }}
              itemStyle={{ fontSize: '10px', fontWeight: '600', padding: '0' }}
            />
            
            <Bar
              dataKey="value"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sector Breakdown Progress Bars */}
      <div className="space-y-4 mt-4">
        
        {/* Sector A */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-600">Sector A</span>
            <span className="text-slate-900">
              12,589 <span className="text-slate-400 font-normal">/ 15,000</span>
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="w-[82%] bg-blue-600 h-full rounded-full transition-all duration-500"></div>
          </div>
        </div>

        {/* Sector B */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-600">Sector B</span>
            <span className="text-slate-900">
              8,292 <span className="text-slate-400 font-normal">/ 15,000</span>
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="w-[60%] bg-blue-400 h-full rounded-full transition-all duration-500"></div>
          </div>
        </div>

        {/* Sector C */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-600">Sector C</span>
            <span className="text-slate-900">
              6,675 <span className="text-slate-400 font-normal">/ 15,000</span>
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="w-[45%] bg-blue-200 h-full rounded-full transition-all duration-500"></div>
          </div>
        </div>

      </div>

      {/* Total Aggregation Capacity Bar */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs font-bold text-slate-800">Total Storage Used</span>
          <span className="text-xs font-bold text-blue-600">
            27,556 <span className="text-slate-400 font-medium">/ 30,000 Unit</span>
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="w-[92%] h-full bg-blue-600 rounded-full transition-all duration-500"></div>
        </div>
      </div>

    </div>
  );
}