"use client";

import React from "react";
import {
  Bell,
  Search,
  Settings,
  ChevronDown,
  Moon,
  User,
} from "lucide-react";

export default function Header() {
  return (
    /* Flat background-aligned container */
    <header className="bg-[#F2F2F2] w-full py-2 flex items-center justify-between transition-all shrink-0">

      {/* Left Side: Title & Info */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Warehouse Dashboard
        </h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5 hidden sm:block">
          Monitor inventory, shipments, and real-time performance.
        </p>
      </div>

      {/* Right Side: Actions & Profile */}
      <div className="flex items-center gap-3.5">

        {/* Search Input */}
        <div className="relative hidden md:block">
          <Search
            size={15}
            className="absolute left-3.5 top-3 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search inventory..."
            className="pl-10 pr-4 py-2 w-64 rounded-xl bg-slate-100/50 border border-slate-200/60 text-xs font-semibold text-slate-950 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
          />
        </div>

        {/* Action Buttons Stack */}
        <div className="flex items-center gap-1.5">
          {/* Theme Switcher */}
          <button className="w-9 h-9 rounded-xl border border-slate-200/60 hover:bg-slate-100/60 text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center">
            <Moon size={16} />
          </button>

          {/* Notifications */}
          <button className="relative w-9 h-9 rounded-xl border border-slate-200/60 hover:bg-slate-100/60 text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center">
            <Bell size={16} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-[#F8FAFC]"></span>
          </button>

          {/* Settings */}
          <button className="w-9 h-9 rounded-xl border border-slate-200/60 hover:bg-slate-100/60 text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center">
            <Settings size={16} />
          </button>
        </div>

        {/* Flat Profile Trigger containing Vector User Icon */}
        <div className="flex items-center gap-2.5 border border-slate-200/60 hover:bg-slate-100/60 rounded-xl pl-2 pr-3.5 py-1.5 cursor-pointer transition-all group">
          
          {/* Vector Profile Icon placeholder box */}
          <div className="w-7 h-7 rounded-lg bg-slate-100/80 border border-slate-200/40 text-slate-500 group-hover:text-blue-600 group-hover:bg-blue-50 flex items-center justify-center transition-colors shadow-xs">
            <User size={15} strokeWidth={2.5} />
          </div>

          <div className="text-left hidden sm:block">
            <h3 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-none">
              Warehouse Admin
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Administrator
            </p>
          </div>
          <ChevronDown size={12} className="text-slate-400 hidden sm:block group-hover:text-slate-600 transition-colors ml-1" />
        </div>

      </div>

    </header>
  );
}