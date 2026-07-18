export default function RentalStatusChart() {
  return (
    <div className="h-48 w-full bg-slate-50 rounded-lg flex flex-col items-center justify-center p-4 border border-dashed border-slate-200">
      {/* Circular Mock Doughnut */}
      <div className="w-24 h-24 rounded-full border-8 border-blue-500 border-t-green-500 border-r-amber-500 flex items-center justify-center mb-3">
        <span className="text-xs font-bold text-slate-600">382 Active</span>
      </div>
      <div className="flex gap-3 text-2xs justify-center text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Active</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Stock</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Service</span>
      </div>
    </div>
  );
}