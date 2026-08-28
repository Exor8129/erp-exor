"use client";

import Link from "next/link";
import {
  ShoppingBag,
  TrendingUp,
  BookOpen,
  Boxes,
  Users,
  ShieldAlert,
} from "lucide-react";

const departments = [
  {
    id: "purchase",
    label: "Purchase",
    icon: ShoppingBag,
    desc: "Manage vendors, purchase limits and PO configuration.",
  },
  {
    id: "sales",
    label: "Sales",
    icon: TrendingUp,
    desc: "Quotation numbering, discounts and pricing.",
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: BookOpen,
    desc: "Finance, ledgers and taxation.",
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Boxes,
    desc: "Warehouse, stock and unit conversion.",
  },
  {
    id: "crm",
    label: "CRM",
    icon: Users,
    desc: "Lead and customer management.",
  },
  {
    id: "admin",
    label: "Administration",
    icon: ShieldAlert,
    desc: "System configuration and security.",
  },
];

export default function SettingsHome() {
  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">
          ERP Settings
        </h1>

        <p className="text-slate-500 mb-8">
          Select a department to configure.
        </p>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

          {departments.map((dept) => {
            const Icon = dept.icon;

            return (
              <Link
                key={dept.id}
                href={`/settings/${dept.id}`}
              >
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-blue-500 transition cursor-pointer h-full">

                  <Icon
                    size={36}
                    className="text-blue-600 mb-4"
                  />

                  <h2 className="text-xl font-semibold">
                    {dept.label}
                  </h2>

                  <p className="text-slate-500 mt-2">
                    {dept.desc}
                  </p>

                </div>
              </Link>
            );
          })}

        </div>
      </div>
    </div>
  );
}