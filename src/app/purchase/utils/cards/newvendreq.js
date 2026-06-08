'use client';

import React from 'react';

const StatCard = ({ color, value, label, badge }) => (
  <div
    className={`${color} p-6 rounded-xl shadow-md text-white flex flex-col items-center justify-center text-center relative overflow-hidden`}
  >
    <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full -mr-6 -mt-6" />
    <span className="text-4xl font-bold relative z-10">{value}</span>
    <span className="text-[10px] font-bold mt-1 opacity-90 relative z-10">
      {label}
    </span>
    <span className="mt-4 px-4 py-1 bg-white/20 text-[10px] font-bold rounded-full backdrop-blur-sm relative z-10 border border-white/10 hover:bg-white/30 transition-colors cursor-default">
      {badge}
    </span>
  </div>
);

export default function NewVendorRequestsCard() {
  return (
    <div>
      <div className="bg-white h-46 p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-bold text-slate-700">2</span>
          <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase leading-tight">
            New Vendor
            <br />
            Onboarding Request
          </span>
          <span className="mt-3 px-3 py-1 bg-emerald-50 text-emerald-500 text-[10px] font-bold rounded-full border border-emerald-100">
            Final Stage
          </span>
        </div>
    </div>
  );
}