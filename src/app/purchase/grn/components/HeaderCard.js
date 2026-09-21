"use client";

import { Card } from "antd";
import { useRouter } from "next/navigation";
import dayjs from "dayjs"; // Helpful for readable dates
import { Home } from "lucide-react";

export default function HeaderCard({ po }) {
  const router = useRouter();
  return (
    <Card className="shadow-sm">
      <div className="mb-4">
  <button
    onClick={() => router.push("/purchase")}
    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100 transition"
  >
    <Home size={17} />
    Home
  </button>
</div>
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
