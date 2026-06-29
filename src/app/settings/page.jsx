"use client";

import { useRouter } from "next/navigation";
// Optional: If you use lucide-react for icons across your ERP
import { 
  ShoppingBag, 
  TrendingUp, 
  BookOpen, 
  Boxes, 
  Users, 
  ShieldAlert 
} from "lucide-react";

// Department dictionary with human-readable labels and specific styling properties
const departments = [
  { id: "purchase", label: "Purchase", icon: ShoppingBag, desc: "Manage vendors, purchase limits, and PO configurations." },
  { id: "sales", label: "Sales & Distribution", icon: TrendingUp, desc: "Configure quotation numbers, discount targets, and margins." },
  { id: "accounts", label: "Accounts & Finance", icon: BookOpen, desc: "Manage ledger locks, fiscal dates, and tax exceptions." },
  { id: "inventory", label: "Inventory Control", icon: Boxes, desc: "Set reorder rules, warehouse maps, and batch controls." },
  { id: "crm", label: "CRM Management", icon: Users, desc: "Configure lead assignment matrices and pipelines." },
  { id: "admin", label: "Administration", icon: ShieldAlert, desc: "Global system overrides, audits logs, and system controls." },
];

export default function SettingsHome() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* Module Header Area */}
        <div className="border-b border-slate-200 pb-6 mb-8">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">ERP Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Select a localized department configuration module to adjust system constraints.
          </p>
        </div>

        {/* Improved Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const IconComponent = dept.icon;
            
            return (
              <button
                key={dept.id}
                onClick={() => router.push(`/settings/${dept.id}`)}
                className="group bg-white rounded-xl border border-slate-200 p-5 text-left transition-all duration-200 shadow-sm hover:shadow-md hover:border-blue-500/50 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {/* Icon wrapper badge */}
                <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center mb-4 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                  <IconComponent className="w-5 h-5" />
                </div>

                <h2 className="text-base font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                  {dept.label}
                </h2>

                <p className="text-xs text-slate-400 font-medium tracking-tight mt-0.5">
                  /settings/{dept.id}
                </p>

                <p className="text-sm text-slate-500 line-clamp-2 mt-2.5 leading-relaxed">
                  {dept.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}