"use client";

import { Card } from "antd";

export default function TotalSummary({
  originalTotal,
  correctedTotal,
}) {
  const difference =
    correctedTotal - originalTotal;

  return (
    <Card>
      <div className="space-y-3">

        <div className="flex justify-between">
          <span>Original Total</span>
          <span>
            ₹ {originalTotal.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Corrected Total</span>
          <span>
            ₹ {correctedTotal.toLocaleString()}
          </span>
        </div>

        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Difference</span>

          <span
            className={
              difference < 0
                ? "text-red-600"
                : "text-green-600"
            }
          >
            ₹ {difference.toLocaleString()}
          </span>
        </div>

      </div>
    </Card>
  );
}