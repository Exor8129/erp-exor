export default function UnderService() {
  const serviceItems = [
    { id: 'Bipap-018', eta: 'Tomorrow', statusStyle: 'text-amber-600 bg-amber-50' },
    { id: 'Oxy-115', eta: '2 Days', statusStyle: 'text-slate-600 bg-slate-100' },
    { id: 'CPAP-044', eta: 'Ready', statusStyle: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-base font-semibold text-slate-700 mb-4">Machines Under Service</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-400 px-2 pb-1">
          <span>Asset ID</span>
          <span>ETA</span>
        </div>
        {serviceItems.map((item, i) => (
          <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-sm font-semibold text-slate-700">{item.id}</span>
            <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${item.statusStyle}`}>{item.eta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}