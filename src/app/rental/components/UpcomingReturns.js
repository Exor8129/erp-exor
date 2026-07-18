export default function UpcomingReturns() {
  const tableData = [
    { client: 'John', item: 'BiPAP', start: '01-Jul', end: '30-Jul', left: '2 Days', status: 'Due Soon', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    { client: 'Rahul', item: 'Oxygen', start: '12-Jul', end: '28-Jul', left: 'Today', status: 'Due Today', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
    { client: 'ABC Hosp.', item: 'Hospital Bed', start: '15-Jul', end: '29-Jul', left: '1 Day', status: 'Due Soon', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="text-base font-semibold text-slate-700">Upcoming Returns</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <th className="p-4">Customer</th>
              <th className="p-4">Machine</th>
              <th className="p-4">Start Date</th>
              <th className="p-4">Return Date</th>
              <th className="p-4">Days Left</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {tableData.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{row.client}</td>
                <td className="p-4">{row.item}</td>
                <td className="p-4 text-slate-400">{row.start}</td>
                <td className="p-4 text-slate-400">{row.end}</td>
                <td className="p-4 font-semibold">{row.left}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${row.badgeClass}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}