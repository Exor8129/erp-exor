export default function DashboardFilters() {
  return (
    <div className="flex items-center gap-2 self-end md:self-auto">
      <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 outline-none focus:border-blue-500">
        <option>All Warehouses</option>
        <option>Main Hub</option>
        <option>North Branch</option>
      </select>
      <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 outline-none focus:border-blue-500">
        <option>This Month</option>
        <option>Last 30 Days</option>
        <option>This Quarter</option>
      </select>
    </div>
  );
}