"use client";

import { Card } from "antd";

export default function HeaderCard({ po }) {
  return (
    <Card className="shadow-sm">
      <div className="grid grid-cols-4 gap-6">
        <div>
          <p className="text-xs text-slate-500">PO Number</p>
          <p className="font-semibold">{po?.po_number}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Supplier</p>
          <p className="font-semibold">{po?.supplier_name}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">PO Date</p>
          <p className="font-semibold">{po?.po_date}</p>
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