'use client';

import React from 'react';

const StatCard = ({ color, value, label, badge }) => (
  <div
    className={`${color} h-46 p-6 rounded-xl shadow-md text-white flex flex-col items-center justify-center text-center relative overflow-hidden`}
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

export default function PendingApprovalsCard() {
  return (
    <div>
      <StatCard
          color="bg-orange-400"
          value="5"
          label="PENDING APPROVALS"
          badge="Needs Action"
        />
    </div>
  );
}