"use client";

import React from "react";
import { Modal } from "antd";

export default function ViewPurchaseOrderModal({
  viewModalOpen,
  setViewModalOpen,
  loadingPO,
  selectedPO,
}) {
  const getStatusStyles = (status) => {
    switch (status) {
      case "approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case "submitted":
        return "bg-sky-50 text-sky-700 border-sky-200/60";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200/60";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200/60";
    }
  };

  return (
    <Modal
      open={viewModalOpen}
      onCancel={() => setViewModalOpen(false)}
      footer={null}
      width={1100}
      centered
      styles={{ body: { padding: "28px" } }}
    >
      {loadingPO ? (
        <div className="flex flex-col justify-center items-center h-72 space-y-3">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-400 tracking-wide">
            Loading order context...
          </p>
        </div>
      ) : selectedPO ? (
        <div className="space-y-8 text-slate-600 antialiased selection:bg-indigo-50">
          
          {/* TOP MANAGEMENT ACTION DECK */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {selectedPO.po.po_number}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wide border ${getStatusStyles(selectedPO.po.status)}`}>
                  {selectedPO.po.status?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Issued on {new Date(selectedPO.po.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Order Architecture
              </span>
              <span className="text-sm font-medium text-slate-700 block mt-0.5">
                {selectedPO.po.qty_only_mode ? "Quantity Blueprint" : "Rate Valuation Based"}
              </span>
            </div>
          </div>

          {/* FULFILLMENT PARTY DIRECTORY */}
          <div className="grid grid-cols-3 gap-8 text-xs border-b border-slate-100 pb-6">
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px]">Corporate Entity</h4>
              <p className="font-semibold text-slate-800 text-sm">Exor Medical Systems</p>
              <p className="text-slate-400 leading-relaxed mt-1">Kozikode, Kerala, India</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px]">Primary Vendor</h4>
              <p className="font-semibold text-slate-800 text-sm">{selectedPO.vendor?.vendor_name}</p>
              <p className="text-slate-400 mt-0.5">{selectedPO.vendor?.mobile_number}</p>
              <p className="text-slate-400 leading-relaxed mt-1">{selectedPO.vendor?.address}</p>
            </div>

            <div className="bg-slate-50/60 border border-slate-100 p-4 rounded-xl">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-1.5 text-[10px]">Logistics Summary</h4>
              <div className="space-y-1 text-slate-500">
                <div className="flex justify-between"><span className="text-slate-400">Total Lines:</span><span className="font-medium text-slate-700">{selectedPO.items.length} lines</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Gross Vol:</span><span className="font-medium text-slate-700">{selectedPO.po.total_qty}</span></div>
                {!selectedPO.po.qty_only_mode && (
                  <div className="flex justify-between pt-1 border-t border-slate-200/60 mt-1">
                    <span className="font-medium text-slate-900">Total Value:</span>
                    <span className="font-bold text-indigo-600">₹{Number(selectedPO.po.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SEMANTIC DATA TABLE FOR LINE ITEMS */}
          <div className="overflow-hidden border border-slate-200/80 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 font-bold">Product Specification</th>
                  <th className="py-3 text-center font-bold">Allocation Qty</th>
                  {!selectedPO.po.qty_only_mode && (
                    <>
                      <th className="py-3 text-right font-bold">Unit Price</th>
                      <th className="py-3 text-center font-bold">Tax</th>
                      <th className="py-3 text-right font-bold px-4">Net Value</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {selectedPO.items.map((item, index) => {
                  const cf = Number(item.conversion_factor || 1);
                  const qty = Number(item.qty || 1);
                  const uomText = item.item_master?.uom || "UOM";
                  const totalConvertedBase = (qty * cf).toFixed(2);

                  return (
                    <tr key={index} className="even:bg-slate-50/50 hover:bg-indigo-50/20 transition-colors group">
                      {/* Product details cell */}
                      <td className="py-4 px-4 align-top">
                        <span className="font-semibold text-slate-900 text-sm block tracking-tight">
                          {item.product_name}
                        </span>
                        <span className="text-[11px] font-mono tracking-wider text-slate-400 mt-1 block">
                          {item.product_code}
                        </span>
                      </td>

                      {/* Quantity cell with clean conversion pill layout */}
                      <td className="py-4 px-4 text-center align-top whitespace-nowrap">
                        <span className="font-semibold text-slate-800 text-sm block">
                          {Number(qty).toFixed(2)}{" "}
                          <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                        </span>
                        {cf > 1 && (
                          <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100/70 px-2 py-0.5 rounded-md mt-1.5 inline-block">
                            {qty} {item.unit} = {totalConvertedBase} {uomText}
                          </span>
                        )}
                      </td>

                      {/* Financial data points */}
                      {!selectedPO.po.qty_only_mode && (
                        <>
                          <td className="py-4 px-4 text-right align-top font-medium text-slate-700 text-sm whitespace-nowrap">
                            ₹{Number(item.rate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-center align-top text-slate-500 text-xs font-medium whitespace-nowrap">
                            {item.tax}%
                          </td>
                          <td className="py-4 px-4 text-right align-top font-bold text-slate-900 text-sm whitespace-nowrap">
                            ₹{Number(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FOOTER METRICS AND NOTES CLOSURE */}
          <div className="flex justify-between items-start pt-2">
            <div className="max-w-md w-full">
              {selectedPO.po.notes ? (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Operational Notes</span>
                  <p className="text-slate-500 leading-relaxed">{selectedPO.po.notes}</p>
                </div>
              ) : <div />}
            </div>

            {!selectedPO.po.qty_only_mode && (
              <div className="w-80 space-y-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-400 font-medium">
                  <span>Cumulative Units</span>
                  <span className="text-slate-700 font-semibold">{selectedPO.po.total_qty}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-900">Grand Total Value</span>
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    ₹{Number(selectedPO.po.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : null}
    </Modal>
  );
}