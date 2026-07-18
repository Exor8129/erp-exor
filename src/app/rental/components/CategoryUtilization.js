export default function CategoryUtilization() {
  const categories = [
    { name: 'Oxygen Concentrator', percentage: 92, color: 'bg-blue-600' },
    { name: 'BiPAP', percentage: 76, color: 'bg-emerald-600' },
    { name: 'CPAP', percentage: 64, color: 'bg-indigo-600' },
    { name: 'Wheelchair', percentage: 70, color: 'bg-cyan-600' },
    { name: 'Hospital Bed', percentage: 82, color: 'bg-violet-600' },
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-base font-semibold text-slate-700 mb-4">Category Utilization</h3>
      <div className="space-y-4">
        {categories.map((cat, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>{cat.name}</span>
              <span>{cat.percentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className={`${cat.color} h-full rounded-full`} style={{ width: `${cat.percentage}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}