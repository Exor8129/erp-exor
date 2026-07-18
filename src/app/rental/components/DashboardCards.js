import KPICard from './KPICard';
import { Layers, PackageCheck, AlertCircle, RefreshCw, IndianRupee, Clock, ClipboardList, Truck } from 'lucide-react';

export default function DashboardCards() {
  const metrics = [
    { title: 'Total Assets', value: '520', subtext: 'Registered items', icon: Layers, colorClass: 'bg-slate-100 text-slate-600' },
    { title: 'Active Rent', value: '382', subtext: 'Deployed items', icon: PackageCheck, colorClass: 'bg-green-50 text-green-600' },
    { title: 'Available', value: '108', subtext: 'Ready in stock', icon: RefreshCw, colorClass: 'bg-blue-50 text-blue-600' },
    { title: 'Under Service', value: '30', subtext: 'In maintenance', icon: AlertCircle, colorClass: 'bg-amber-50 text-amber-600' },
    { title: 'Revenue', value: '₹18.45 Lakh', subtext: 'Total generated', icon: IndianRupee, colorClass: 'bg-emerald-50 text-emerald-600' },
    { title: 'Overdue', value: '9', subtext: 'Action required', icon: Clock, colorClass: 'bg-rose-50 text-rose-600' },
    { title: 'Returns Due', value: '14', subtext: 'Next 48 Hours', icon: ClipboardList, colorClass: 'bg-indigo-50 text-indigo-600' },
    { title: 'Pending Del.', value: '6', subtext: 'To be shipped', icon: Truck, colorClass: 'bg-cyan-50 text-cyan-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((item, index) => (
        <KPICard key={index} {...item} />
      ))}
    </div>
  );
}