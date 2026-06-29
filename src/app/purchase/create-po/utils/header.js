"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Tooltip } from "antd";

import { Home } from "lucide-react";

export default function PoHeader({ poNumber, poDate }) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Side */}
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center">
              <Tooltip title="Purchase Dashboard">
                <Home
                  size={22}
                  // Add a slight scale effect too
                  className="text-blue-600 hover:text-blue-800 hover:scale-110 cursor-pointer transition-all duration-200"
                  onClick={() => router.push("/purchase")}
                />
              </Tooltip>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Create Purchase Order
              </h1>

              <p className="text-sm text-slate-500">
                Generate and manage supplier purchase orders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PO Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-200">
        <div>
          <p className="text-xs uppercase text-slate-500 mb-1">PO Number</p>
          <p className="font-semibold">{poNumber}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500 mb-1">Date</p>
          <p className="font-semibold">{poDate}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500 mb-1">Status</p>

          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            Draft
          </span>
        </div>
      </div>
    </div>
  );
}
