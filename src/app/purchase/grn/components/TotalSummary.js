"use client";

import { Card } from "antd";

export default function TotalSummary({
  orderedTotal = 0,
  receivedTotal = 0,
  balanceTotal = 0,
}) {
  return (
    <Card>
      <div className="space-y-3">

        <div className="flex justify-between">
          <span>Ordered Value</span>
          <span className="font-medium">
            ₹ {orderedTotal.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Received Value</span>
          <span className="font-medium text-green-600">
            ₹ {receivedTotal.toLocaleString()}
          </span>
        </div>

        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Balance Value</span>

          <span
            className={
              balanceTotal > 0
                ? "text-orange-600"
                : "text-green-600"
            }
          >
            ₹ {balanceTotal.toLocaleString()}
          </span>
        </div>

      </div>
    </Card>
  );
}