'use client';

import React from 'react';
import { useRouter } from "next/navigation";


export default function CreatePurchaseOrderCard() {
  const router = useRouter();
  return (
    <div
          className="bg-linear-to-br from-blue-500 to-indigo-600 p-4 rounded-xl shadow-sm border border-blue-400 flex flex-col items-center justify-center text-center transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
          onClick={() => router.push("/purchase/create-po")}
        >
          {/* Icon Circle */}
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-3">
            <span className="text-2xl font-bold text-white">+</span>
          </div>

          {/* Main Title */}
          <span className="text-lg font-bold text-white">Create PO</span>

          {/* Subtitle */}
          <span className="text-[11px] font-semibold text-blue-100 mt-1 uppercase tracking-wider leading-tight">
            New Purchase <br /> Order
          </span>

          {/* Bottom Badge */}
          <span className="mt-3 px-3 py-1 bg-white text-blue-600 text-[10px] font-bold rounded-full">
            Quick Access
          </span>
        </div>
  );
}