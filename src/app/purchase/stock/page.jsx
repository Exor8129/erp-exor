// src/app/[department]/modules/inventory/stock/page.jsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  AlertTriangle,
  PackageX,
  IndianRupee,
  Search,
  Plus,
  Download,
  ChevronRight,
  Warehouse,
  History,
  X,
  ExternalLink,
  Layers,
} from 'lucide-react';

const INITIAL_STOCK = [
  {
    id: 'SKU-8902',
    name: 'Precision Rotor Shaft Assembly 45mm',
    category: 'Powertrain',
    location: 'Bay A-04 · WH-North',
    currentStock: 420,
    minThreshold: 120,
    maxCapacity: 600,
    unit: 'pcs',
    unitPrice: 148.5,
    status: 'IN_STOCK',
    lastAudited: 'Today, 08:30 AM',
  },
  {
    id: 'SKU-4412',
    name: 'High-Pressure Nitrile Hydraulic Seals',
    category: 'Hydraulics',
    location: 'Bin 18 · WH-East',
    currentStock: 24,
    minThreshold: 60,
    maxCapacity: 300,
    unit: 'sets',
    unitPrice: 62.0,
    status: 'LOW_STOCK',
    lastAudited: 'Yesterday',
  },
  {
    id: 'SKU-9011',
    name: 'Reinforced Kevlar Drive Belt 12m',
    category: 'Assembly',
    location: 'Rack 02 · WH-North',
    currentStock: 0,
    minThreshold: 8,
    maxCapacity: 40,
    unit: 'rolls',
    unitPrice: 410.0,
    status: 'OUT_OF_STOCK',
    lastAudited: '3 days ago',
  },
  {
    id: 'SKU-1284',
    name: 'M10 Grade 8.8 Galvanized Flange Bolts',
    category: 'Fasteners',
    location: 'Aisle 09 · WH-Central',
    currentStock: 6850,
    minThreshold: 1500,
    maxCapacity: 10000,
    unit: 'pcs',
    unitPrice: 0.42,
    status: 'IN_STOCK',
    lastAudited: 'Aug 24, 2026',
  },
  {
    id: 'SKU-6731',
    name: 'Optocoupled Industrial SSR Module 24V',
    category: 'Electrical',
    location: 'Bin 04 · WH-East',
    currentStock: 38,
    minThreshold: 50,
    maxCapacity: 200,
    unit: 'units',
    unitPrice: 27.8,
    status: 'LOW_STOCK',
    lastAudited: 'Aug 29, 2026',
  },
];

export default function BeautifulStockLevelsPage() {
  const params = useParams();
  const department = params?.department || 'inventory';

  const [items, setItems] = useState(INITIAL_STOCK);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [drawerItem, setDrawerItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // KPIs
  const stats = useMemo(() => {
    const totalCount = items.length;
    const lowCount = items.filter((i) => i.status === 'LOW_STOCK').length;
    const outCount = items.filter((i) => i.status === 'OUT_OF_STOCK').length;
    const valuation = items.reduce((acc, i) => acc + i.currentStock * i.unitPrice, 0);
    return { totalCount, lowCount, outCount, valuation };
  }, [items]);

  const categories = useMemo(() => ['ALL', ...new Set(items.map((i) => i.category))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchesSearch =
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.id.toLowerCase().includes(search.toLowerCase()) ||
        i.location.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === 'ALL' || i.status === activeTab;
      const matchesCategory = selectedCategory === 'ALL' || i.category === selectedCategory;
      return matchesSearch && matchesTab && matchesCategory;
    });
  }, [items, search, activeTab, selectedCategory]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
        
        {/* Dynamic Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <Link 
                href="/workspace" 
                className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150"
                title="Go to Workspace Home"
              >
                <span>Workspace</span>
              </Link>

              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />

              <Link 
                href={`/${department}`} 
                className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150 capitalize"
                title="Go to Department Overview"
              >
                <Boxes className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{department} Control</span>
              </Link>
              
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
              
              <Link 
                href={`/${department}/modules/inventory/stock`} 
                className="text-indigo-600 dark:text-indigo-400 hover:underline transition-colors"
                title="Current Page"
              >
                Stock Allocations
              </Link>
            </nav>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-slate-100">
              Stock Levels & Health
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm">
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Export Dataset
            </button>
            <button
              onClick={() => {
                setDrawerItem(null);
                setIsDrawerOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-xs font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              Add Stock SKU
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total SKUs</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.totalCount}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">registered items</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Under Threshold</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats.lowCount}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">need purchase order</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl border border-rose-300 dark:border-rose-900/60 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-rose-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Stockouts</span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500">
                <PackageX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-500">{stats.outCount}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">zero balance</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Inventory Value</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                ₹{stats.valuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'All Catalog' },
              { id: 'IN_STOCK', label: 'Sufficient' },
              { id: 'LOW_STOCK', label: 'Low Stock' },
              { id: 'OUT_OF_STOCK', label: 'Depleted' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU, item, bay..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 font-medium"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-white dark:bg-slate-900">
                  {c === 'ALL' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stock Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Item & SKU</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Warehouse Location</th>
                  <th className="px-6 py-4 min-w-[220px]">Stock Capacity & Health</th>
                  <th className="px-6 py-4 text-right">Unit Price</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                <AnimatePresence>
                  {filteredItems.map((item) => {
                    const ratio = Math.min(100, Math.round((item.currentStock / item.maxCapacity) * 100));
                    const isOut = item.status === 'OUT_OF_STOCK';
                    const isLow = item.status === 'LOW_STOCK';

                    return (
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={item.id}
                        className="group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                            <span>{item.id}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-sans text-[11px]">
                              <History className="w-3 h-3" /> {item.lastAudited}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            {item.location}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold">
                              <span
                                className={
                                  isOut
                                    ? 'text-rose-500'
                                    : isLow
                                    ? 'text-amber-500 dark:text-amber-400'
                                    : 'text-slate-900 dark:text-slate-100'
                                }
                              >
                                {item.currentStock.toLocaleString('en-IN')} {item.unit}
                              </span>
                              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                                Min: {item.minThreshold.toLocaleString('en-IN')} {item.unit}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${ratio}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className={`h-full rounded-full ${
                                  isOut
                                    ? 'bg-rose-500'
                                    : isLow
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setDrawerItem(item);
                              setIsDrawerOpen(true);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Audit Stock"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Slide-over Audit Drawer */}
        <AnimatePresence>
          {isDrawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDrawerOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 shadow-2xl flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {drawerItem ? `Audit ${drawerItem.id}` : 'Create Item Entry'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Adjust stock count and bin allocations
                      </p>
                    </div>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block mb-1.5 font-semibold text-slate-900 dark:text-slate-200">
                        Product Title
                      </label>
                      <input
                        type="text"
                        defaultValue={drawerItem?.name || ''}
                        placeholder="e.g. Linear Bearing Block 20mm"
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-900 dark:text-slate-200">
                          Current Stock Count
                        </label>
                        <input
                          type="number"
                          defaultValue={drawerItem?.currentStock || 0}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block mb-1.5 font-semibold text-slate-900 dark:text-slate-200">
                          Minimum Threshold
                        </label>
                        <input
                          type="number"
                          defaultValue={drawerItem?.minThreshold || 10}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1.5 font-semibold text-slate-900 dark:text-slate-200">
                        Warehouse Location Code
                      </label>
                      <input
                        type="text"
                        defaultValue={drawerItem?.location || 'Bay A-01 · WH-North'}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-xs font-semibold text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition"
                  >
                    Save & Update
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}