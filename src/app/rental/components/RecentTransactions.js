export default function RecentTransactions() {
  const transactions = [
    { id: 'RENT-1021', customer: 'John', machine: 'BiPAP', amount: '₹4,500', status: 'Active', executive: 'Alex', style: 'bg-green-50 text-green-700 border-green-200' },
    { id: 'RENT-1022', customer: 'Rahul', machine: 'Oxygen Concentrator', amount: '₹2,000', status: 'Delivered', style: 'bg-blue-50 text-blue-700 border-blue-200' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="text-base font-semibold text-slate-700">Recent Rental Transactions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <th className="p-4">Rental No</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Machine</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Executive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {transactions.map((tx, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-mono font-semibold text-blue-600">{tx.id}</td>
                <td className="p-4 font-medium text-slate-900">{tx.customer}</td>
                <td className="p-4">{tx.machine}</td>
                <td className="p-4 font-medium text-slate-800">{tx.amount}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${tx.style}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{tx.executive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}