"use client";

import React, { useState, useMemo } from "react";
import { Radio, InputNumber, Select, DatePicker, Input, Button, Alert, Progress, message } from "antd";
import { CreditCard, Send, User } from "lucide-react";

export default function PaymentRequestCard({
  poNumber = "PO-LOADING",
  vendorName = "No Vendor Selected",
  totalAmount = 0,
  alreadyPaid = 0,
  onSubmit,
}) {
  const [requestType, setRequestType] = useState("advance"); // 'advance' | 'milestone'
  const [amount, setAmount] = useState(null);
  const [paymentMode, setPaymentMode] = useState("bank_transfer");
  const [dueDate, setDueDate] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Derive structural metrics dynamically from upstream core variables
  const metrics = useMemo(() => {
    const remaining = totalAmount - alreadyPaid;
    const excessRequest = amount > remaining;
    const paidPercentage = totalAmount > 0 ? Math.round((alreadyPaid / totalAmount) * 100) : 0;
    const highAdvanceWarning = requestType === "advance" && amount > totalAmount * 0.5;

    return {
      remaining,
      excessRequest,
      paidPercentage,
      highAdvanceWarning,
    };
  }, [totalAmount, alreadyPaid, amount, requestType]);

  const handleSubmit = () => {
    if (!amount || amount <= 0) {
      message.error("Please enter a valid payment amount");
      return;
    }
    if (metrics.excessRequest) {
      message.error("Requested amount exceeds the remaining PO balance");
      return;
    }
    if (!dueDate) {
      message.error("Please select a target payout date");
      return;
    }

    setSubmitting(true);

    setTimeout(() => {
      if (onSubmit) {
        onSubmit({
          poNumber,
          requestType,
          amount,
          paymentMode,
          dueDate: dueDate.format("YYYY-MM-DD"),
          notes,
        });
      }
      message.success("Payment request routed to approval workflow successfully!");
      setSubmitting(false);
      setAmount(null);
      setNotes("");
    }, 1000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full mt-2">
      {/* Structural Header Panel */}
      <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-blue-600" />
          <h2 className="font-semibold text-slate-800">New Payment Request</h2>
        </div>
        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium border border-blue-100">
          {poNumber}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Dynamic Financial Balance Matrix */}
        <div className="bg-slate-50/70 rounded-lg p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div>
            <div className="text-slate-400 font-medium mb-0.5">PO Grand Total</div>
            <div className="text-base font-bold text-slate-800">
              ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-medium mb-0.5">Paid Till Date</div>
            <div className="text-base font-semibold text-emerald-600">
              ₹{alreadyPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-medium mb-0.5">Remaining Balance</div>
            <div className="text-base font-semibold text-amber-600">
              ₹{metrics.remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="col-span-1 sm:col-span-3 pt-1">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-sans">
              <span>PO Drawdown Progress</span>
              <span>{metrics.paidPercentage}% Settled</span>
            </div>
            <Progress
              percent={metrics.paidPercentage}
              size="small"
              showInfo={false}
              strokeColor="#10b981"
              railColor="#e2e8f0"
            />
          </div>
        </div>

        {/* Selected Vendor Identity Label */}
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50/30 px-3 py-2 rounded border border-dashed border-slate-200">
          <User size={14} className="text-slate-400" />
          <span className="font-medium">Vendor Name:</span>
          <span className="text-slate-700 font-semibold">{vendorName}</span>
        </div>

        {/* Input Form Elements */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Request Type
            </label>
            <Radio.Group
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              buttonStyle="solid"
              className="w-full"
            >
              <Radio.Button value="advance" className="w-1/2 text-center text-sm">
                Advance Request
              </Radio.Button>
              <Radio.Button value="milestone" className="w-1/2 text-center text-sm">
                Milestone / Final
              </Radio.Button>
            </Radio.Group>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Request Amount
              </label>
              <InputNumber
                min={1}
                placeholder="Enter amount"
                className="w-full font-mono text-base"
                formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(value) => (value ? value.replace(/\₹\s?|(,*)/g, "") : "")}
                value={amount}
                onChange={setAmount}
                status={metrics.excessRequest ? "error" : ""}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Target Payout Date
              </label>
              <DatePicker
                className="w-full h-9.5"
                placeholder="Select date"
                value={dueDate}
                onChange={setDueDate}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Preferred Transfer Method
            </label>
            <Select
              className="w-full h-9.5"
              value={paymentMode}
              onChange={setPaymentMode}
              options={[
                { value: "bank_transfer", label: "NEFT / RTGS / IMPS (Bank Transfer)" },
                { value: "upi", label: "UPI Transfer" },
                { value: "cheque", label: "Account Payee Cheque" },
                { value: "letter_of_credit", label: "Letter of Credit (LC)" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Justification & Internal Notes
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Provide context for finance team (e.g., 'Material dispatch milestone reached')"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              showCount
            />
          </div>
        </div>

        {/* Context-aware Validation Warnings */}
        {metrics.excessRequest && (
          <Alert
            title="Over-Budget Warning"
            description="The requested amount exceeds the available PO balance. Please check figures before routing."
            type="error"
            showIcon
            closable={false}
          />
        )}

        {metrics.highAdvanceWarning && !metrics.excessRequest && (
          <Alert
            title="High Advance Ratio"
            description="This advance request represents more than 50% of the total PO size, which may trigger additional management authorization cycles."
            type="warning"
            showIcon
            closable={false}
          />
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3.5 flex justify-end gap-3 rounded-b-xl">
        <Button className="font-medium text-slate-600">Cancel</Button>
        <Button
          type="primary"
          icon={<Send size={14} />}
          loading={submitting}
          onClick={handleSubmit}
          disabled={metrics.excessRequest || totalAmount === 0}
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1 font-medium"
        >
          Route Request
        </Button>
      </div>
    </div>
  );
}