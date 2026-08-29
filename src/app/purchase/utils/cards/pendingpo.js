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
      onClick={() => router.push('/purchase/pending-po')}
      className="
        group relative overflow-hidden
        w-full
        rounded-xl
        border border-slate-700/50
        bg-linear-to-br from-slate-800 via-slate-800 to-indigo-900
        px-4 py-3
        shadow-sm
        cursor-pointer
        transition-all duration-300
        hover:-translate-y-0.5
        hover:shadow-lg hover:shadow-indigo-900/20
      "
    >
      {/* Background Glow */}
      <div
        className="
          absolute -right-8 -top-8
          h-20 w-20
          rounded-full
          bg-indigo-500/20
          blur-xl
          transition-transform duration-500
          group-hover:scale-125
        "
      />

      <div className="relative z-10 flex flex-col gap-1.5">
        {/* 1. TOP: Icon + Navigation Arrow */}
        <div className="flex w-full items-center justify-between">
          <div
            className="
              flex h-7 w-7 shrink-0
              items-center justify-center
              rounded-md
              border border-white/10
              bg-white/10
              backdrop-blur-sm
            "
          >
            <ClipboardList size={15} className="text-indigo-300" />
          </div>

          <div
            className="
              flex h-6 w-6
              items-center justify-center
              rounded-full
              bg-white/5
              text-slate-400
              transition-all duration-300
              group-hover:bg-white/10
              group-hover:text-white
            "
          >
            <ArrowUpRight size={13} />
          </div>
        </div>

        {/* 2. SECOND: Compact Pending Count */}
        <div>
          <span className="text-2xl font-extrabold leading-none tracking-tight text-white">
            {loading ? (
              <span className="inline-block h-6 w-9 animate-pulse rounded bg-white/10" />
            ) : (
              pendingCount
            )}
          </span>
        </div>

        {/* 3. THIRD: Titles & Descriptions */}
        <div>
          <h3 className="text-xs font-bold text-white tracking-wide leading-tight">
            Pending POs
          </h3>
          <p className="text-[10px] font-medium text-slate-400 leading-tight">
            Orders requiring action
          </p>
        </div>

        {/* 4. BOTTOM: High Priority Badge */}
        <div className="mt-0.5">
          <span
            className="
              inline-flex items-center gap-1
              rounded-full
              bg-amber-400/10
              px-2 py-0.5
              text-[9px]
              font-bold
              uppercase
              tracking-wider
              text-amber-300
              border border-amber-400/20
              backdrop-blur-sm
            "
          >
            <span className="h-1 w-1 rounded-full bg-amber-300 animate-pulse" />
            <AlertTriangle size={10} className="text-amber-300" />
            High Priority
          </span>
        </div>
      </div>
    </div>
  );
}