import { CheckCircle2 } from 'lucide-react';

export default function TodayActivity() {
  const activities = [
    '12 New Rentals',
    '8 Deliveries',
    '6 Pickups',
    '2 Service Visits',
    '5 Collections',
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-base font-semibold text-slate-700 mb-4">Today's Activities</h3>
      <ul className="space-y-3">
        {activities.map((act, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="font-medium">{act}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
