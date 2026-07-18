import { Activity } from 'lucide-react';

export default function DashboardHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
        <Activity size={24} />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Rental Dashboard</h1>
        <p className="text-xs text-slate-500">Medical equipment asset control overview</p>
      </div>
    </div>
  );
}