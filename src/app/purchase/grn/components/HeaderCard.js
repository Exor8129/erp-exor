"use client";

import { Card } from "antd";
import dayjs from "dayjs"; // Helpful for readable dates

export default function HeaderCard({ po }) {
  return (
    <Card className="shadow-sm">
      <div className="grid grid-cols-4 gap-6">
        <div>
          <p className="text-xs text-slate-500">PO Number</p>
          <p className="font-semibold">{po?.po_number || "-"}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Supplier</p>
          {/* 👇 Updated to map to vendor_name instead of company_name */}
          <p className="font-semibold">{po?.vendors?.vendor_name || "-"}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">PO Date</p>
          {/* 👇 Standardizes your timestamp column */}
          <p className="font-semibold">
            {po?.created_at ? dayjs(po.created_at).format("DD-MMM-YYYY") : "-"}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Original Value</p>
          <p className="font-semibold">
            ₹ {Number(po?.grand_total || 0).toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
}
