'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function PendingPOCard() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPendingPOCount() {
      try {
        setLoading(true);

        const { count, error } = await supabase
          .schema('purchase')
          .from('purchase_orders')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'completed');

        if (error) throw error;

        setPendingCount(count || 0);
      } catch (err) {
        console.error('Error fetching pending PO count:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPendingPOCount();
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push('/purchase/pending-po')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          router.push('/purchase/pending-po');
        }
      }}
      className="
        group relative overflow-hidden
        w-full
        rounded-xl
        border border-white/10
        bg-slate-900/80
        backdrop-blur-xl
        px-4 py-3
        shadow-sm
        cursor-pointer
        transition-all duration-300
        hover:-translate-y-0.5
        hover:border-indigo-500/40
        hover:shadow-xl hover:shadow-indigo-950/50
        ring-1 ring-white/5
      "
    >
      {/* Dynamic Ambient Mesh Glow */}
      <div 
        className="
          pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-28 w-28 
          rounded-full bg-indigo-500/15 blur-2xl 
          transition-all duration-500 group-hover:bg-indigo-500/25 group-hover:scale-125
        " 
      />

      {/* Top-Right Navigation Arrow Button */}
      <div
        className="
          absolute top-3 right-3 z-20
          flex h-6 w-6
          items-center justify-center
          rounded-full
          border border-white/5
          bg-white/5
          text-slate-400
          transition-all duration-300
          group-hover:border-white/20
          group-hover:bg-white/10
          group-hover:text-white
        "
      >
        <ArrowUpRight 
          size={12} 
          strokeWidth={2.2} 
          className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" 
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center gap-1.5">
        {/* 1. TOP: Centered Icon */}
        <div
          className="
            flex h-8 w-8 shrink-0
            items-center justify-center
            rounded-lg
            border border-indigo-400/20
            bg-indigo-500/10
            text-indigo-400
            shadow-inner
            transition-colors duration-300
            group-hover:bg-indigo-500/20
            group-hover:text-indigo-300
          "
        >
          <ClipboardList size={15} strokeWidth={2.2} />
        </div>

        {/* 2. SECOND: Centered Metric Value */}
        <div className="flex justify-center">
          <span className="text-2xl font-black font-mono tracking-tight text-slate-50">
            {loading ? (
              <span className="inline-block h-6 w-10 animate-pulse rounded-md bg-white/10" />
            ) : (
              pendingCount.toLocaleString()
            )}
          </span>
        </div>

        {/* 3. THIRD: Headings */}
        <div className="flex flex-col items-center">
          <h3 className="text-xs font-semibold text-slate-200 tracking-tight leading-tight group-hover:text-white transition-colors">
            Pending POs
          </h3>
          <p className="text-[10px] text-slate-400/90 leading-tight">
            Orders requiring action
          </p>
        </div>

        {/* 4. BOTTOM: Status Pill */}
        <div className="mt-0.5 flex justify-center">
          <span
            className="
              inline-flex items-center gap-1.5
              rounded-full
              border border-amber-500/20
              bg-amber-500/10
              px-2 py-0.5
              text-[9px]
              font-semibold
              tracking-wide
              text-amber-300/90
            "
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
            </span>
            <AlertTriangle size={9} className="text-amber-400 shrink-0" />
            High Priority
          </span>
        </div>
      </div>
    </div>
  );
}