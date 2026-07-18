export default function KPICard({ title, value, subtext, icon: Icon, colorClass }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}