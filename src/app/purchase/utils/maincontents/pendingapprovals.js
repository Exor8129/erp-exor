'use client';

import React from 'react';
import {  CheckCircle } from "lucide-react";


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

export default function PendingApprovals() {
  return (
    <div>
      <section className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="p-4 border-b border-slate-50">
              <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                Pending Approvals
              </h2>
            </div>
            <div className="p-4 space-y-2">
              <ApprovalItem name="Global Steel Ltd" date="2013 1029" />
              <ApprovalItem
                name="Glett Steel Ltd"
                date="2014 2026"
                hasQuickAction
              />
              <ApprovalItem name="Usstgstemit Solutions" date="2014 2028" />
            </div>
          </section>
    </div>
  );
}