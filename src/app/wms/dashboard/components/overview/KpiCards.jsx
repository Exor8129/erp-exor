"use client";

import {
  Boxes,
  DollarSign,
  ShoppingBag,
  Truck,
} from "lucide-react";

import StatCard from "./StatCard";

export default function KPICards() {
  const cards = [
    {
      title: "Total Inventory",
      value: "84,932",
      change: "+12.6%",
      positive: true,
      icon: Boxes,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Inventory Value",
      value: "₹1.25 Cr",
      change: "+6.4%",
      positive: true,
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      title: "Orders Today",
      value: "214",
      change: "-2.3%",
      positive: false,
      icon: ShoppingBag,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      title: "Shipments",
      value: "61",
      change: "+9.1%",
      positive: true,
      icon: Truck,
      color: "text-violet-600 bg-violet-50 border-violet-100",
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <StatCard
          key={index}
          title={card.title}
          value={card.value}
          change={card.change}
          positive={card.positive}
          icon={card.icon}
          colorClasses={card.color}
        />
      ))}
    </section>
  );
}