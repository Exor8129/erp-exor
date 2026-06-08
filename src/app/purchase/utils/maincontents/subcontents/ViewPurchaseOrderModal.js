"use client";

import React from "react";
import { Modal } from "antd";

export default function ViewPurchaseOrderModal({
  viewModalOpen,
  setViewModalOpen,
  loadingPO,
  selectedPO,
}) {
  return (
    <Modal
      open={viewModalOpen}
      onCancel={() => setViewModalOpen(false)}
      footer={null}
      width={1150}
      centered
      title={null}
    >
      {loadingPO ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-slate-500">
            Loading Purchase Order...
          </div>
        </div>
      ) : selectedPO ? (
        <div className="space-y-6">
          {/* HEADER */}

          <div className="bg-linear-to-r from-sky-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="uppercase tracking-widest text-sky-100 text-xs">
                  Purchase Order
                </p>

                <h1 className="text-3xl font-bold mt-2">
                  {selectedPO.po.po_number}
                </h1>

                <p className="text-sky-100 mt-2">
                  Created on{" "}
                  {new Date(selectedPO.po.created_at).toLocaleDateString(
                    "en-IN"
                  )}
                </p>
              </div>

              <div>
                <span
                  className={`px-4 py-2 rounded-full text-xs font-bold
                  ${
                    selectedPO.po.status === "approved"
                      ? "bg-green-500 text-white"
                      : selectedPO.po.status === "submitted"
                      ? "bg-blue-500 text-white"
                      : selectedPO.po.status === "cancelled"
                      ? "bg-red-500 text-white"
                      : "bg-yellow-500 text-white"
                  }`}
                >
                  {selectedPO.po.status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* SUMMARY */}

          <div
            className={`grid gap-4 ${
              selectedPO.po.qty_only_mode
                ? "grid-cols-4"
                : "grid-cols-5"
            }`}
          >
            <div className="bg-white border shadow-sm rounded-2xl p-5">
              <p className="text-xs text-slate-500">Total Qty</p>

              <h3 className="text-2xl font-bold mt-2 text-slate-800">
                {selectedPO.po.total_qty || 0}
              </h3>
            </div>

            <div className="bg-white border shadow-sm rounded-2xl p-5">
              <p className="text-xs text-slate-500">Total Items</p>

              <h3 className="text-2xl font-bold mt-2 text-slate-800">
                {selectedPO.items.length}
              </h3>
            </div>

            <div className="bg-white border shadow-sm rounded-2xl p-5">
              <p className="text-xs text-slate-500">Vendor</p>

              <h3 className="font-semibold mt-2 truncate">
                {selectedPO.vendor?.vendor_name}
              </h3>
            </div>

            <div className="bg-white border shadow-sm rounded-2xl p-5">
              <p className="text-xs text-slate-500">Order Type</p>

              <h3 className="font-semibold mt-2">
                {selectedPO.po.qty_only_mode
                  ? "Quantity Only"
                  : "Rate Based"}
              </h3>
            </div>

            {!selectedPO.po.qty_only_mode && (
              <div className="bg-linear-to-r from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
                <p className="text-xs text-emerald-100">
                  Grand Total
                </p>

                <h3 className="text-2xl font-bold mt-2">
                  ₹
                  {Number(
                    selectedPO.po.grand_total || 0
                  ).toLocaleString("en-IN")}
                </h3>
              </div>
            )}
          </div>

          {/* COMPANY + VENDOR */}

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-slate-50 rounded-2xl p-5 border">
              <p className="uppercase text-xs text-slate-400 mb-3">
                Bill To
              </p>

              <h3 className="font-bold text-lg">
                Exor Medical Systems
              </h3>

              <p className="text-slate-500 mt-2">
                Kozikode, Kerala, India
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border">
              <p className="uppercase text-xs text-slate-400 mb-3">
                Vendor
              </p>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  {selectedPO.vendor?.vendor_name?.charAt(0)}
                </div>

                <div>
                  <h3 className="font-bold">
                    {selectedPO.vendor?.vendor_name}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {selectedPO.vendor?.mobile_number}
                  </p>
                </div>
              </div>

              <p className="text-slate-500 text-sm mt-4">
                {selectedPO.vendor?.address}
              </p>
            </div>
          </div>

          {/* ITEMS */}

          <div className="border rounded-2xl overflow-hidden shadow-sm">
            <div
              className={`bg-slate-100 font-semibold text-sm grid ${
                selectedPO.po.qty_only_mode
                  ? "grid-cols-2"
                  : "grid-cols-5"
              }`}
            >
              <div className="p-4">Product</div>
              <div className="p-4 text-center">Qty</div>

              {!selectedPO.po.qty_only_mode && (
                <>
                  <div className="p-4 text-right">Rate</div>

                  <div className="p-4 text-center">Tax</div>

                  <div className="p-4 text-right">Amount</div>
                </>
              )}
            </div>

            {selectedPO.items.map((item, index) => (
              <div
                key={index}
                className={`grid border-t hover:bg-slate-50 transition ${
                  selectedPO.po.qty_only_mode
                    ? "grid-cols-2"
                    : "grid-cols-5"
                }`}
              >
                <div className="p-4">
                  <p className="font-medium">
                    {item.product_name}
                  </p>

                  <p className="text-xs text-slate-400">
                    {item.product_code}
                  </p>
                </div>

                <div className="p-4 text-center">
                  {item.qty}
                </div>

                {!selectedPO.po.qty_only_mode && (
                  <>
                    <div className="p-4 text-right">
                      ₹
                      {Number(item.rate || 0).toLocaleString(
                        "en-IN"
                      )}
                    </div>

                    <div className="p-4 text-center">
                      {item.tax}%
                    </div>

                    <div className="p-4 text-right font-semibold">
                      ₹
                      {Number(item.amount || 0).toLocaleString(
                        "en-IN"
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* NOTES */}

          {selectedPO.po.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="font-semibold text-amber-700 mb-2">
                Notes
              </h3>

              <p className="text-slate-600">
                {selectedPO.po.notes}
              </p>
            </div>
          )}

          {/* TOTALS */}

          {!selectedPO.po.qty_only_mode && (
            <div className="flex justify-end">
              <div className="w-96 bg-slate-50 border rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">
                    Total Quantity
                  </span>

                  <span className="font-medium">
                    {selectedPO.po.total_qty}
                  </span>
                </div>

                <div className="border-t mt-4 pt-4 flex justify-between">
                  <span className="text-lg font-bold">
                    Grand Total
                  </span>

                  <span className="text-2xl font-bold text-emerald-600">
                    ₹
                    {Number(
                      selectedPO.po.grand_total || 0
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}