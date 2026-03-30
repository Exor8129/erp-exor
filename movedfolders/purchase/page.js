import React from 'react';
import { Search, CheckCircle } from 'lucide-react';

const PurchaseDashboard = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between bg-[#1e293b] p-4 rounded-t-lg text-white">
        <h1 className="text-xl font-bold tracking-tight uppercase">Purchase Department Dashboard</h1>
        <div className="relative w-64">
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full bg-white/10 border border-white/20 rounded-md py-1.5 px-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-white/50"
          />
          <Search className="absolute left-3 top-2 w-4 h-4 text-white/60" />
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
        {/* Progress Ring Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
              <circle cx="48" cy="48" r="40" stroke="#3b82f6" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset="84" strokeLinecap="round" />
            </svg>
            <span className="absolute text-xl font-bold">12/18</span>
          </div>
          <span className="mt-4 px-4 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Invoices</span>
        </div>

        {/* Dynamic Metric Cards */}
        <StatCard color="bg-red-500" value="16" label="PENDING PO'S" badge="High Priority" />
        <StatCard color="bg-orange-400" value="5" label="PENDING APPROVALS" badge="Needs Action" />
        <StatCard color="bg-emerald-400" value="2" label="NEW ITEM REQUESTS" badge="Review Required" />
        
        {/* Onboarding Request Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-bold text-slate-700">2</span>
          <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase leading-tight">New Vendor<br/>Onboarding Request</span>
          <span className="mt-3 px-3 py-1 bg-emerald-50 text-emerald-500 text-[10px] font-bold rounded-full border border-emerald-100">Final Stage</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Left: Tables */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50">
              <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Active Purchase Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3">PO #</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <TableRow id="P0001" vendor="Global Steel Ltd" date="2023-10-26" amount="$150,000" status="Normal" />
                  <TableRow id="P0002" vendor="Techtronic Solutions" date="2023-10-27" amount="$45,000.75" status="Alert" />
                  <TableRow id="P0003" vendor="Techtronic Solutions" date="2023-10-28" amount="Pending" status="Action" />
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="p-4 border-b border-slate-50">
              <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Pending Approvals</h2>
            </div>
            <div className="p-4 space-y-2">
              <ApprovalItem name="Global Steel Ltd" date="2013 1029" />
              <ApprovalItem name="Glett Steel Ltd" date="2014 2026" hasQuickAction />
              <ApprovalItem name="Usstgstemit Solutions" date="2014 2028" />
            </div>
          </section>
        </div>

        {/* Right: Feed */}
        <aside>
          <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider mb-4">New Requests Feed</h2>
          <div className="space-y-4">
            <FeedCard type="NEW VENDOR" name="Global Steel Ltd" desc="Awaiting Document Verification" />
            <FeedCard type="NEW ITEM" name="Server Rack 42U" desc="Avgding Offiea, CBU - IT Dept" />
            <FeedCard type="NEW ITEM" name="Eigonit bck 42U" desc="Office Chai - HR Dept" isFinal />
          </div>
        </aside>
      </div>
    </div>
  );
};

/* --- Helper Components --- */

const StatCard = ({ color, value, label, badge }) => (
  <div className={`${color} p-6 rounded-xl shadow-md text-white flex flex-col items-center justify-center text-center relative overflow-hidden`}>
    <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full -mr-6 -mt-6" />
    <span className="text-4xl font-bold relative z-10">{value}</span>
    <span className="text-[10px] font-bold mt-1 opacity-90 relative z-10">{label}</span>
    <span className="mt-4 px-4 py-1 bg-white/20 text-[10px] font-bold rounded-full backdrop-blur-sm relative z-10 border border-white/10 hover:bg-white/30 transition-colors cursor-default">
      {badge}
    </span>
  </div>
);

const TableRow = ({ id, vendor, date, amount, status }) => (
  <tr className="hover:bg-slate-50 transition-colors group">
    <td className="px-4 py-4 font-bold text-slate-700">{id}</td>
    <td className="px-4 py-4 text-slate-600">{vendor}</td>
    <td className="px-4 py-4 text-slate-400 text-xs">{date}</td>
    <td className="px-4 py-4">
      {status === 'Alert' ? (
        <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">{amount}</span>
      ) : (
        <span className="text-slate-700 font-medium">{amount}</span>
      )}
    </td>
    <td className="px-4 py-4">
      {status === 'Action' ? (
        <span className="bg-red-400 text-white px-2 py-1 rounded text-[10px] font-bold">Pending</span>
      ) : (
        <span className="text-slate-500 text-xs italic">Pending</span>
      )}
    </td>
    <td className="px-4 py-4">
      <button className="bg-blue-50 text-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">View</button>
    </td>
  </tr>
);

const ApprovalItem = ({ name, date, hasQuickAction }) => (
  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
    <div className="flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-emerald-500" />
      <span className="text-sm font-medium text-slate-600">{name}</span>
    </div>
    <div className="flex items-center gap-6">
      <span className="text-slate-400 text-xs">{date}</span>
      {hasQuickAction && (
        <button className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-tighter">
          <CheckCircle className="w-3 h-3" /> Quick Approve
        </button>
      )}
    </div>
  </div>
);

const FeedCard = ({ type, name, desc, isFinal }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative">
    {isFinal && (
      <span className="absolute top-2 right-2 px-2 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-bold rounded-full border border-blue-100">
        Final Stage
      </span>
    )}
    <p className="text-[11px] font-bold text-slate-700 uppercase">
      {type}: <span className="text-slate-500 normal-case font-medium">{name}</span>
    </p>
    <p className="text-[10px] text-slate-400 mt-1">{desc}</p>
  </div>
);

export default PurchaseDashboard;