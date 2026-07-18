"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";

const orders = [
  {
    po: "PO-10251",
    supplier: "Medisafe Pvt Ltd",
    amount: "₹48,250",
    status: "Received",
  },
  {
    po: "PO-10252",
    supplier: "Apollo Medical",
    amount: "₹18,600",
    status: "Pending",
  },
  {
    po: "PO-10253",
    supplier: "HealthCare Inc",
    amount: "₹82,900",
    status: "In Transit",
  },
  {
    po: "PO-10254",
    supplier: "Global Pharma",
    amount: "₹22,540",
    status: "Received",
  },
  {
    po: "PO-10255",
    supplier: "Wellness Medical",
    amount: "₹63,120",
    status: "Pending",
  },
];

const badge = {
  Received: "text-emerald-700 bg-emerald-50 border-emerald-100",
  Pending: "text-amber-700 bg-amber-50 border-amber-100",
  "In Transit": "text-blue-700 bg-blue-50 border-blue-100",
};

export default function RecentOrders() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] p-6 h-full flex flex-col justify-between">
      
      {/* Table Header Wrapper */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Recent Purchase Orders
        </h2>
        
        <button className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-xl transition active:scale-95">
          View All
          <ArrowUpRight size={13} />
        </button>
      </div>

      {/* Responsive Over-scroll Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">PO No</th>
              <th className="text-left pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Supplier</th>
              <th className="text-left pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</th>
              <th className="text-left pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-50">
            {orders.map((o, i) => (
              <tr
                key={i}
                className="hover:bg-slate-50/80 transition-colors group"
              >
                <td className="py-3.5 text-sm font-semibold text-blue-600 group-hover:underline cursor-pointer">
                  {o.po}
                </td>
                
                <td className="py-3.5 text-sm font-medium text-slate-700">
                  {o.supplier}
                </td>
                
                <td className="py-3.5 text-sm font-bold text-slate-900">
                  {o.amount}
                </td>
                
                <td className="py-3.5">
                  <span
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${badge[o.status]}`}
                  >
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}