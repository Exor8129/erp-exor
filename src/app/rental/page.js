import DashboardHeader from "../rental/components/DashboardHeader";
import DashboardFilters from '../rental/components/DashboardFilters';
import DashboardCards from '../rental/components/DashboardCards';
import RevenueChart from '../rental/components/RevenueChart';
import RentalStatusChart from '../rental/components/RentalStatusChart';
import CategoryUtilization from '../rental/components/CategoryUtilization';
import TodayActivity from '../rental/components/TodayActivity';
import UpcomingReturns from '../rental/components/UpcomingReturns';
import UnderService from '../rental/components/UnderService';
import PendingPayments from '../rental/components/PendingPayments';
import RecentTransactions from '../rental/components/RecentTransactions';

export default function RentalDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <DashboardHeader />
          <DashboardFilters />
        </div>

        {/* Core KPI Metrics */}
        <DashboardCards />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-base font-semibold text-slate-700 mb-4">Monthly Rental Revenue</h3>
            <RevenueChart />
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-base font-semibold text-slate-700 mb-4">Rental Status</h3>
            <RentalStatusChart />
          </div>
        </div>

        {/* Operational Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryUtilization />
          <TodayActivity />
        </div>

        {/* Deadlines & Schedules */}
        <UpcomingReturns />

        {/* Operations Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UnderService />
          <PendingPayments />
        </div>

        {/* Audit Log / Master Transactions */}
        <RecentTransactions />

      </div>
    </div>
  );
}