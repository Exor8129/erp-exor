'use client';

import React from 'react';

export default function InvoicesCard() {
  return (
    <div>
       {/* Progress Ring Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#e2e8f0"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#3b82f6"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset="84"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xl font-bold">12/18</span>
          </div>
          <span className="mt-4 px-4 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
            Invoices
          </span>
        </div>
    </div>
  );
}