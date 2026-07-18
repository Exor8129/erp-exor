export default function PendingPayments() {
  const payments = [
    { name: 'John', amount: '₹2,500' },
    { name: 'Rahul', amount: '₹4,800' },
    { name: 'ABC Hospital', amount: '₹12,400' },
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-base font-semibold text-slate-700 mb-4">Pending Payments</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-400 px-2 pb-1">
          <span>Customer</span>
          <span>Outstanding</span>
        </div>
        {payments.map((p, i) => (
          <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-sm font-medium text-slate-700">{p.name}</span>
            <span className="text-sm font-bold text-rose-600">{p.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}