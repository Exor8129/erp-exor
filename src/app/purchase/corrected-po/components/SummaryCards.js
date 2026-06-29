"use client";

import { Card } from "antd";
import {
  AlertTriangle,
  PackageMinus,
  PackagePlus,
  Bell,
} from "lucide-react";

export default function SummaryCards({
  missingCount = 0,
  partialCount = 0,
  addedCount = 0,
  attentionCount = 0,
}) {
  const cards = [
    {
      title: "Missing",
      value: missingCount,
      icon: <AlertTriangle size={20} />,
      color: "text-red-600",
    },
    {
      title: "Partial",
      value: partialCount,
      icon: <PackageMinus size={20} />,
      color: "text-yellow-600",
    },
    {
      title: "Added",
      value: addedCount,
      icon: <PackagePlus size={20} />,
      color: "text-blue-600",
    },
    {
      title: "Attention",
      value: attentionCount,
      icon: <Bell size={20} />,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500">{card.title}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>

            <div className={card.color}>{card.icon}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}