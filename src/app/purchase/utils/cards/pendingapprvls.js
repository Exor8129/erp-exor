'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase'; // Adjust import path if needed

const StatCard = ({ color, value, label, badge, onClick }) => (
  <div
    onClick={onClick}
    className={`${color} h-46 p-6 rounded-xl shadow-md text-white flex flex-col items-center justify-center text-center relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 select-none`}
  >
    <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full -mr-6 -mt-6" />
    <span className="text-4xl font-bold relative z-10">{value}</span>
    <span className="text-[10px] font-bold mt-1 opacity-90 relative z-10 tracking-wider">
      {label}
    </span>
    <span className="mt-4 px-4 py-1 bg-white/20 text-[10px] font-bold rounded-full backdrop-blur-sm relative z-10 border border-white/10 hover:bg-white/30 transition-colors">
      {badge}
    </span>
  </div>
);

export default function DiscrepanciesCard({ initialCount = null }) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount ?? '...');
  const [loading, setLoading] = useState(initialCount === null);

  useEffect(() => {
    if (initialCount !== null) return;

    const fetchDiscrepancyCount = async () => {
      try {
        setLoading(true);
        // Count all unresolved/actionable discrepancies
        const { count: openCount, error } = await supabase
          .schema('purchase')
          .from('discrepancies')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'investigating', 'awaiting_supplier']);

        if (error) throw error;
        setCount(openCount ?? 0);
      } catch (err) {
        console.error('Failed to fetch discrepancies count:', err);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscrepancyCount();
  }, [initialCount]);

  return (
    <StatCard
      color="bg-rose-500 hover:bg-rose-600"
      value={loading ? '...' : count}
      label="PENDING DISCREPANCIES"
      badge={Number(count) > 0 ? "Action Required" : "All Clear"}
      onClick={() => router.push('/purchase/discrepancies')}
    />
  );
}