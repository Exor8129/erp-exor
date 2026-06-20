"use client";

import { useEffect, useMemo, useState } from "react";

import { Modal, Segmented } from "antd";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import { loadTallyExcel } from "../../../../lib/loadTallyExcel";

export default function TrendCard({ open, onClose, selectedProduct }) {
  const [period, setPeriod] = useState("12 Months");

  const [salesData, setSalesData] = useState([]);

  function KpiCard({ title, value, subtitle, icon }) {
    return (
      <div className="bg-white rounded-xl border p-4">
        <div className="flex justify-between">
          <span className="text-xs text-slate-500">{title}</span>

          {icon}
        </div>

        <div className="text-2xl font-bold mt-2">{value}</div>

        {subtitle && (
          <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
        )}
      </div>
    );
  }

  // =========================
  // LOAD EXCEL
  // =========================

  useEffect(() => {
    async function loadData() {
      const data = await loadTallyExcel();

      setSalesData(data || []);
    }

    if (open) {
      loadData();
    }
  }, [open]);

  // =========================
  // TALLY DATE PARSER
  // 17-Jun-26
  // =========================

  const parseTallyDate = (dateStr) => {
    if (!dateStr) return null;

    const months = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const parts = String(dateStr).trim().split("-");

    if (parts.length !== 3) {
      return null;
    }

    const [day, mon, year] = parts;

    const monthIndex = months[mon];

    if (monthIndex === undefined) {
      return null;
    }

    const date = new Date(Number(`20${year}`), monthIndex, Number(day));

    return date;
  };

  // =========================
  // PRODUCT SALES
  // =========================

  const productSales = useMemo(() => {
    if (!selectedProduct) return [];

    const matches = salesData.filter(
      (row) =>
        String(row["Item Name"] || "")
          .trim()
          .toLowerCase() ===
        String(selectedProduct.productName || "")
          .trim()
          .toLowerCase(),
    );

    return matches;
  }, [salesData, selectedProduct]);

  // =========================
  // FILTER PERIOD
  // =========================

  const filteredSales = useMemo(() => {
    const today = new Date();

    const filtered = productSales.filter((row) => {
      const dateObj = parseTallyDate(row.Date);

      if (!dateObj) return false;

      const diffDays = (today - dateObj) / (1000 * 60 * 60 * 24);

      switch (period) {
        case "30 Days":
          return diffDays <= 30;

        case "90 Days":
          return diffDays <= 90;

        case "12 Months":
          return diffDays <= 365;

        case "3 Years":
          return diffDays <= 1095;

        default:
          return true;
      }
    });

    return filtered;
  }, [productSales, period]);

  // =========================
  // KPI CALCULATIONS
  // =========================

  const totalUnits = useMemo(() => {
    return filteredSales.reduce((sum, row) => {
      const qty =
        parseFloat(
          String(row.Qty || "")
            .replace(/,/g, "")
            .replace(/[^\d.-]/g, ""),
        ) || 0;

      return sum + qty;
    }, 0);
  }, [filteredSales]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, row) => {
      const amount =
        parseFloat(
          String(row.Amount || "")
            .replace(/,/g, "")
            .replace(/[^\d.-]/g, ""),
        ) || 0;

      return sum + amount;
    }, 0);
  }, [filteredSales]);

  const totalTransactions = filteredSales.length;

  const monthlyTotals = useMemo(() => {
    const grouped = {};

    filteredSales.forEach((row) => {
      const dateObj = parseTallyDate(row.Date);

      if (!dateObj) return;

      const key = `${dateObj.getMonth()}-${dateObj.getFullYear()}`;

      const qty =
        parseFloat(
          String(row.Qty || "")
            .replace(/,/g, "")
            .replace(/[^\d.-]/g, ""),
        ) || 0;

      grouped[key] = (grouped[key] || 0) + qty;
    });

    return grouped;
  }, [filteredSales]);

  const avgMonthlyConsumption = useMemo(() => {
    const values = Object.values(monthlyTotals);

    if (!values.length) return 0;

    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [monthlyTotals]);

  const avgDailyConsumption = useMemo(() => {
    if (!totalUnits) return 0;

    const days =
      period === "30 Days"
        ? 30
        : period === "90 Days"
          ? 90
          : period === "12 Months"
            ? 365
            : 1095;

    return totalUnits / days;
  }, [totalUnits, period]);

  const currentStock = 120;

  const stockCoverageDays = useMemo(() => {
    if (!avgDailyConsumption) return 0;

    return Math.round(currentStock / avgDailyConsumption);
  }, [avgDailyConsumption]);

  const suggestedReorderQty = useMemo(() => {
    if (!avgDailyConsumption) return 0;

    const targetStock = avgDailyConsumption * 90;

    return Math.max(0, Math.round(targetStock - currentStock));
  }, [avgDailyConsumption]);

  const fastestMonth = useMemo(() => {
    const entries = Object.entries(monthlyTotals);

    if (!entries.length) return "-";

    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [monthlyTotals]);

  const slowestMonth = useMemo(() => {
    const entries = Object.entries(monthlyTotals);

    if (!entries.length) return "-";

    return entries.sort((a, b) => a[1] - b[1])[0][0];
  }, [monthlyTotals]);

  const lastSaleDate = useMemo(() => {
    if (!filteredSales.length) return null;

    const dates = filteredSales
      .map((row) => parseTallyDate(row.Date))
      .filter(Boolean);

    if (!dates.length) return null;

    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }, [filteredSales]);

  const daysSinceLastSale = useMemo(() => {
    if (!lastSaleDate) return "-";

    return Math.floor((new Date() - lastSaleDate) / (1000 * 60 * 60 * 24));
  }, [lastSaleDate]);

  // =========================
  // CHART DATA
  // =========================

  const chartData = useMemo(() => {
    if (!filteredSales.length) {
      return [];
    }

    const grouped = {};

    filteredSales.forEach((row) => {
      const dateObj = parseTallyDate(row.Date);

      if (!dateObj) return;

      const qty =
        parseFloat(
          String(row.Qty || "")
            .replace(/,/g, "")
            .replace(/[^\d.-]/g, ""),
        ) || 0;

      let label = "";

      switch (period) {
        case "30 Days":
          label = dateObj.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          });
          break;

        case "90 Days": {
          const week = Math.ceil(dateObj.getDate() / 7);

          label = `W${week}-${dateObj.toLocaleDateString("en-IN", {
            month: "short",
          })}`;

          break;
        }

        case "12 Months":
          label = dateObj.toLocaleDateString("en-IN", {
            month: "short",
            year: "2-digit",
          });
          break;

        case "3 Years":
          label = String(dateObj.getFullYear());
          break;

        default:
          label = String(dateObj.getFullYear());
      }

      grouped[label] = (grouped[label] || 0) + qty;
    });

    const result = Object.entries(grouped).map(([label, qty]) => ({
      label,
      qty,
    }));

    return result;
  }, [filteredSales, period]);

  return (
<Modal
  title={
    <div className="flex items-center justify-between pr-8">
      <div>
        <div className="text-lg font-semibold">
          {selectedProduct?.productName}
        </div>

        <div className="text-xs text-slate-500">
          Product Sales Analytics
        </div>
      </div>
    </div>
  }
  open={open}
  onCancel={onClose}
  footer={null}
  width={1200}
  destroyOnHidden
>
  <div className="space-y-6">

    {/* ================================= */}
    {/* TOP FILTER BAR */}
    {/* ================================= */}

    <div className="flex justify-between items-center border-b pb-4">
      <div>
        <h3 className="font-semibold text-slate-800">
          Sales Trend
        </h3>

        <p className="text-xs text-slate-500">
          Historical sales performance
        </p>
      </div>

      <Segmented
        options={[
          "30 Days",
          "90 Days",
          "12 Months",
          "3 Years",
        ]}
        value={period}
        onChange={setPeriod}
      />
    </div>

    {/* ================================= */}
    {/* PRIMARY KPI STRIP */}
    {/* ================================= */}

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

      <KpiCard
        title="Units Sold"
        value={totalUnits.toLocaleString()}
      />

      <KpiCard
        title="Revenue"
        value={`₹${Math.round(totalRevenue).toLocaleString()}`}
      />

      <KpiCard
        title="Transactions"
        value={totalTransactions}
      />

      <KpiCard
        title="Avg Daily"
        value={avgDailyConsumption.toFixed(2)}
      />

    </div>

    {/* ================================= */}
    {/* CHART + INVENTORY PANEL */}
    {/* ================================= */}

    <div className="grid grid-cols-12 gap-4">

      {/* CHART */}

      <div className="col-span-12 lg:col-span-8 border rounded-xl p-4 bg-white">

        <div className="mb-3">
          <h4 className="font-semibold">
            Sales Trend
          </h4>

          <p className="text-xs text-slate-500">
            Quantity sold over time
          </p>
        </div>

        <div
          style={{
            width: "100%",
            height: 420,
            minWidth: 0,
          }}
        >
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              No sales data found
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="label" />

                <YAxis />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="qty"
                  name="Sales Qty"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* INVENTORY INSIGHTS */}

      <div className="col-span-12 lg:col-span-4 border rounded-xl p-4 bg-slate-50">

        <h4 className="font-semibold mb-4">
          Inventory Insights
        </h4>

        <div className="space-y-3">

          <KpiCard
            title="Stock Coverage"
            value={`${stockCoverageDays} Days`}
          />

          <KpiCard
            title="Suggested Reorder"
            value={suggestedReorderQty}
          />

          <KpiCard
            title="Last Sale"
            value={
              lastSaleDate
                ? lastSaleDate.toLocaleDateString("en-IN")
                : "-"
            }
          />

          <KpiCard
            title="Days Since Sale"
            value={daysSinceLastSale}
          />

        </div>
      </div>

    </div>

    {/* ================================= */}
    {/* ADVANCED ANALYTICS */}
    {/* ================================= */}

    <div className="border rounded-xl p-4">

      <h4 className="font-semibold mb-4">
        Performance Analytics
      </h4>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <KpiCard
          title="Avg Monthly"
          value={avgMonthlyConsumption.toFixed(0)}
        />

        <KpiCard
          title="Fastest Month"
          value={fastestMonth}
        />

        <KpiCard
          title="Slowest Month"
          value={slowestMonth}
        />

      </div>

    </div>

  </div>
</Modal>
  );
}
