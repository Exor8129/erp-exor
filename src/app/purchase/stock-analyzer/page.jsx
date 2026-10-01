'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Button,
  Card,
  InputNumber,
  Table,
  Tag,
  Select,
  Input,
  Statistic,
  Row,
  Col,
  Tabs,
  Space,
  Tooltip,
  DatePicker,
  Radio,
  message,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
  DollarCircleOutlined,
  AlertOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const { RangePicker } = DatePicker;

export default function StockAnalyzer() {
  const [stockData, setStockData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [stockFileName, setStockFileName] = useState('');
  const [salesFileName, setSalesFileName] = useState('');

  // Rules & Filters
  const [thresholdPercent, setThresholdPercent] = useState(2);
  const [baseMetric, setBaseMetric] = useState('closing');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Period / Date Filters
  const [periodOption, setPeriodOption] = useState('all'); // '30', '60', '90', 'current_fy', 'last_fy', 'custom', 'all'
  const [customDateRange, setCustomDateRange] = useState(null);
  const [dateAnchor, setDateAnchor] = useState('latestInFile'); // 'today' or 'latestInFile'

  // Helper to parse dates from Tally exports
  const parseTallyDate = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') {
      const parsedExcelDate = XLSX.SSF.parse_date_code(dateVal);
      if (parsedExcelDate) {
        return dayjs(new Date(parsedExcelDate.y, parsedExcelDate.m - 1, parsedExcelDate.d));
      }
    }
    const str = String(dateVal).trim();
    const formatted = dayjs(str);
    if (formatted.isValid()) return formatted;

    const parts = str.split(/[-/]/);
    if (parts.length === 3 && parts[2].length === 4) {
      return dayjs(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return null;
  };

  // Upload & Parse Stock Excel
  const handleStockUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          message.error('Uploaded Stock sheet is empty!');
          return;
        }

        const parsed = jsonData
          .map((row) => {
            const name = String(
              row['$Name'] || row['Name'] || row['Item Name'] || row['Stock Item'] || ''
            ).trim();
            const opening =
              parseFloat(
                row['$OpeningBalance'] || row['Opening Balance'] || row['Opening'] || 0
              ) || 0;
            const inward =
              parseFloat(
                row['$InwardQuantity'] || row['Inward Quantity'] || row['Inward'] || 0
              ) || 0;
            const outwardStockSheet =
              parseFloat(
                row['$OutwardQuantity'] || row['Outward Quantity'] || row['Outward'] || 0
              ) || 0;
            const closing =
              parseFloat(
                row['$ClosingBalance'] || row['Closing Balance'] || row['Closing'] || 0
              ) || 0;
            const lastPurcDate = String(row['$LastPurcDate'] || row['Last Purchase Date'] || '');
            const lastSaleDate = String(row['$LastSaleDate'] || row['Last Sale Date'] || '');

            // Cleaned JavaScript OR operator
            const lastPurcRate =
              parseFloat(
                row['$LastPurcPrice'] ||
                  row['$LastPurcRate'] ||
                  row['Last Purchase Price'] ||
                  row['Last Purchase Rate'] ||
                  row['Purchase Rate'] ||
                  row['Rate'] ||
                  0
              ) || 0;

            return {
              name,
              opening,
              inward,
              outwardStockSheet,
              closing,
              lastPurcDate,
              lastSaleDate,
              lastPurcRate,
            };
          })
          .filter((item) => item.name !== '');

        setStockData(parsed);
        setStockFileName(file.name);
        message.success(`Loaded ${parsed.length} stock items.`);
      } catch (err) {
        message.error('Failed to parse Stock Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  // Upload & Parse Sales Register Excel
  const handleSalesUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          message.error('Uploaded Sales sheet is empty!');
          return;
        }

        const parsed = jsonData
          .map((row) => {
            const itemName = String(row['Item Name'] || row['$Name'] || row['Product'] || '').trim();
            const qty = Math.abs(parseFloat(row['Qty'] || row['Quantity'] || 0) || 0);
            const rate = parseFloat(row['Rate'] || 0) || 0;
            const amount = parseFloat(row['Amount'] || 0) || 0;
            const rawDate = row['Date'] || '';
            const parsedDate = parseTallyDate(rawDate);
            const vchNo = String(row['Vch No'] || '');
            const partyName = String(row['Party Name'] || '');
            const vchType = String(row['Vch Type'] || '');

            return { itemName, qty, rate, amount, rawDate, parsedDate, vchNo, partyName, vchType };
          })
          .filter((item) => item.itemName !== '');

        setSalesData(parsed);
        setSalesFileName(file.name);
        message.success(`Loaded ${parsed.length} sales voucher records.`);
      } catch (err) {
        message.error('Failed to parse Sales Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  // Reference Anchor Date
  const maxSalesDateInFile = useMemo(() => {
    let max = null;
    salesData.forEach((s) => {
      if (s.parsedDate && s.parsedDate.isValid()) {
        if (!max || s.parsedDate.isAfter(max)) {
          max = s.parsedDate;
        }
      }
    });
    return max || dayjs();
  }, [salesData]);

  const refDate = dateAnchor === 'today' ? dayjs() : maxSalesDateInFile;

  // Active Date Range Filter
  const activeDateRange = useMemo(() => {
    if (periodOption === 'all') return null;

    if (periodOption === 'custom') {
      if (customDateRange && customDateRange[0] && customDateRange[1]) {
        return { start: customDateRange[0].startOf('day'), end: customDateRange[1].endOf('day') };
      }
      return null;
    }

    if (periodOption === '30') return { start: refDate.subtract(30, 'day').startOf('day'), end: refDate.endOf('day') };
    if (periodOption === '60') return { start: refDate.subtract(60, 'day').startOf('day'), end: refDate.endOf('day') };
    if (periodOption === '90') return { start: refDate.subtract(90, 'day').startOf('day'), end: refDate.endOf('day') };

    const currentYear = refDate.year();
    const isAprOrLater = refDate.month() >= 3;

    if (periodOption === 'current_fy') {
      const startYear = isAprOrLater ? currentYear : currentYear - 1;
      return {
        start: dayjs(`${startYear}-04-01`).startOf('day'),
        end: dayjs(`${startYear + 1}-03-31`).endOf('day'),
      };
    }

    if (periodOption === 'last_fy') {
      const startYear = isAprOrLater ? currentYear - 1 : currentYear - 2;
      return {
        start: dayjs(`${startYear}-04-01`).startOf('day'),
        end: dayjs(`${startYear + 1}-03-31`).endOf('day'),
      };
    }

    return null;
  }, [periodOption, customDateRange, refDate]);

  // Aggregate Sales & Process Stock Rules
  const processedData = useMemo(() => {
    const salesMap = new Map();

    salesData.forEach((row) => {
      let include = true;
      if (activeDateRange) {
        if (!row.parsedDate || !row.parsedDate.isValid()) {
          include = false;
        } else {
          include = row.parsedDate.isBetween(activeDateRange.start, activeDateRange.end, null, '[]');
        }
      }

      if (include) {
        const current = salesMap.get(row.itemName.toLowerCase()) || 0;
        salesMap.set(row.itemName.toLowerCase(), current + row.qty);
      }
    });

    return stockData.map((item, index) => {
      const matchedSales = salesMap.get(item.name.toLowerCase());

      let actualSalesQty = 0;
      if (matchedSales !== undefined) {
        actualSalesQty = matchedSales;
      } else if (salesData.length === 0 && periodOption === 'all') {
        actualSalesQty = item.outwardStockSheet;
      }

      let baseValue = item.closing;
      if (baseMetric === 'totalAvailable') {
        baseValue = item.opening + item.inward;
      } else if (baseMetric === 'opening') {
        baseValue = item.opening;
      }

      const salesTargetQty = (baseValue * thresholdPercent) / 100;
      const stockValue = item.closing * item.lastPurcRate;
      const salePercentage = baseValue > 0 ? (actualSalesQty / baseValue) * 100 : 0;

      let status = 'Normal';
      if (actualSalesQty === 0) {
        status = 'Zero';
      } else if (actualSalesQty < salesTargetQty) {
        status = 'Low';
      }

      const qtyDeficit = Math.max(0, salesTargetQty - actualSalesQty);

      return {
        ...item,
        key: `${item.name}-${index}`,
        actualSalesQty,
        salesTargetQty,
        stockValue,
        salePercentage,
        status,
        qtyDeficit,
      };
    });
  }, [stockData, salesData, thresholdPercent, baseMetric, activeDateRange, periodOption]);

  // Financial Metrics
  const metrics = useMemo(() => {
    let totalStockVal = 0;
    let zeroSaleVal = 0;
    let lowSaleVal = 0;
    let normalSaleVal = 0;

    let zeroCount = 0;
    let lowCount = 0;
    let normalCount = 0;

    processedData.forEach((item) => {
      totalStockVal += item.stockValue;

      if (item.status === 'Zero') {
        zeroSaleVal += item.stockValue;
        zeroCount++;
      } else if (item.status === 'Low') {
        lowSaleVal += item.stockValue;
        lowCount++;
      } else {
        normalSaleVal += item.stockValue;
        normalCount++;
      }
    });

    return {
      totalItems: processedData.length,
      totalStockVal,
      zeroSaleVal,
      lowSaleVal,
      normalSaleVal,
      zeroCount,
      lowCount,
      normalCount,
    };
  }, [processedData]);

  // Filter Table Records
  const filteredData = useMemo(() => {
    return processedData.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === 'zero') return item.status === 'Zero';
      if (activeTab === 'low') return item.status === 'Low';
      if (activeTab === 'normal') return item.status === 'Normal';
      return true;
    });
  }, [processedData, searchText, activeTab]);

  // Demo Data Generator
  const handleLoadDemo = () => {
    const demoStock = [
      { name: 'ECG Cable 3-Lead', opening: 100, inward: 50, outwardStockSheet: 1, closing: 149, lastPurcDate: '2026-02-10', lastSaleDate: '2026-02-15', lastPurcRate: 450 },
      { name: 'SpO2 Sensor Adult', opening: 200, inward: 0, outwardStockSheet: 0, closing: 200, lastPurcDate: '2026-01-05', lastSaleDate: '2025-11-20', lastPurcRate: 1200 },
      { name: 'NIBP Cuff Large', opening: 80, inward: 20, outwardStockSheet: 15, closing: 85, lastPurcDate: '2026-03-01', lastSaleDate: '2026-03-25', lastPurcRate: 850 },
      { name: 'Ultrasound Gel 5L', opening: 50, inward: 10, outwardStockSheet: 0.5, closing: 59.5, lastPurcDate: '2026-01-20', lastSaleDate: '2026-02-01', lastPurcRate: 320 },
      { name: 'Thermal Paper Rolls', opening: 500, inward: 500, outwardStockSheet: 450, closing: 550, lastPurcDate: '2026-03-10', lastSaleDate: '2026-03-29', lastPurcRate: 45 },
    ];

    const demoSales = [
      { rawDate: '2026-03-12', parsedDate: dayjs('2026-03-12'), vchNo: 'INV-001', partyName: 'City Hospital', vchType: 'Sales', itemName: 'ECG Cable 3-Lead', qty: 1, rate: 750, amount: 750 },
      { rawDate: '2026-03-15', parsedDate: dayjs('2026-03-15'), vchNo: 'INV-002', partyName: 'Metro Clinic', vchType: 'Sales', itemName: 'NIBP Cuff Large', qty: 15, rate: 1300, amount: 19500 },
      { rawDate: '2026-03-20', parsedDate: dayjs('2026-03-20'), vchNo: 'INV-003', partyName: 'Care Diagnostic', vchType: 'Sales', itemName: 'Thermal Paper Rolls', qty: 450, rate: 80, amount: 36000 },
    ];

    setStockData(demoStock);
    setSalesData(demoSales);
    setStockFileName('demo_stock_summary.xlsx');
    setSalesFileName('demo_sales_register.xlsx');
    message.info('Demo data loaded successfully!');
  };

  // Export Table Data to XLSX
  const handleExportExcel = () => {
    const exportData = filteredData.map((item) => ({
      'Item Name': item.name,
      'Status': item.status,
      'Closing Stock': item.closing,
      'Last Purc Price (₹)': item.lastPurcRate,
      'Total Stock Value (₹)': item.stockValue,
      'Period Sales Qty': item.actualSalesQty,
      [`Target Qty (${thresholdPercent}%)`]: item.salesTargetQty.toFixed(2),
      'Qty Deficit': item.qtyDeficit.toFixed(2),
      'Last Sale Date': item.lastSaleDate || 'N/A',
      'Last Purc Date': item.lastPurcDate || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Stage Analysis');
    XLSX.writeFile(workbook, `Stock_Sales_Analysis_${periodOption}.xlsx`);
  };

  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => <span className="font-semibold text-slate-800">{text}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Zero Sale', value: 'Zero' },
        { text: 'Low Sale', value: 'Low' },
        { text: 'Normal Sale', value: 'Normal' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        if (status === 'Zero') return <Tag color="error">Zero Sale</Tag>;
        if (status === 'Low') return <Tag color="warning">Low Sale</Tag>;
        return <Tag color="success">Normal</Tag>;
      },
    },
    {
      title: 'Closing Stock',
      dataIndex: 'closing',
      key: 'closing',
      sorter: (a, b) => a.closing - b.closing,
      render: (val) => val.toLocaleString(),
    },
    {
      title: 'Last Purc. Price (₹)',
      dataIndex: 'lastPurcRate',
      key: 'lastPurcRate',
      sorter: (a, b) => a.lastPurcRate - b.lastPurcRate,
      render: (val) => `₹${val.toLocaleString()}`,
    },
    {
      title: 'Total Stock Value (₹)',
      dataIndex: 'stockValue',
      key: 'stockValue',
      sorter: (a, b) => a.stockValue - b.stockValue,
      render: (val) => <span className="font-semibold text-blue-600">₹{val.toLocaleString()}</span>,
    },
    {
      title: 'Period Sales',
      dataIndex: 'actualSalesQty',
      key: 'actualSalesQty',
      sorter: (a, b) => a.actualSalesQty - b.actualSalesQty,
      render: (val) => <span className="font-medium text-emerald-700">{val.toLocaleString()}</span>,
    },
    {
      title: `Target Qty (${thresholdPercent}%)`,
      dataIndex: 'salesTargetQty',
      key: 'salesTargetQty',
      render: (val) => val.toFixed(2),
    },
    {
      title: 'Sales Deficit',
      dataIndex: 'qtyDeficit',
      key: 'qtyDeficit',
      sorter: (a, b) => a.qtyDeficit - b.qtyDeficit,
      render: (val) => (
        <span className={val > 0 ? 'text-red-500 font-medium' : 'text-slate-400'}>
          {val > 0 ? `-${val.toFixed(2)}` : '0'}
        </span>
      ),
    },
    {
      title: 'Last Sale Date',
      dataIndex: 'lastSaleDate',
      key: 'lastSaleDate',
      render: (val) => val || '—',
    },
  ];

  const doughnutData = {
    labels: ['Zero Sale Capital', 'Low Sale Capital', 'Normal Sale Capital'],
    datasets: [
      {
        data: [metrics.zeroSaleVal, metrics.lowSaleVal, metrics.normalSaleVal],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        hoverOffset: 6,
      },
    ],
  };

  const slowestItems = [...processedData]
    .sort((a, b) => a.salePercentage - b.salePercentage)
    .slice(0, 7);

  const barData = {
    labels: slowestItems.map((item) => item.name),
    datasets: [
      {
        label: 'Period Sales Qty',
        data: slowestItems.map((item) => item.actualSalesQty),
        backgroundColor: '#3b82f6',
      },
      {
        label: 'Target Qty',
        data: slowestItems.map((item) => item.salesTargetQty),
        backgroundColor: '#cbd5e1',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Low Sale & Stock Valuation Analyzer
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Analyze low sales performance & stock capital using customizable period windows (30/60/90 Days, FY).
            </p>
          </div>
          <Button icon={<ReloadOutlined />} onClick={handleLoadDemo} type="default" size="large">
            Load Demo Data
          </Button>
        </div>

        {/* File Uploads & Rule Config */}
        <Card className="shadow-sm rounded-2xl border-slate-200">
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <div className="flex flex-col h-full justify-between bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                <div>
                  <div className="font-semibold text-slate-700 mb-1">1. Stock Summary Sheet</div>
                  <div className="text-xs text-slate-500 mb-3">
                    Header: <code>$Name</code>, <code>$ClosingBalance</code>, <code>$LastPurcPrice</code>
                  </div>
                </div>
                <Upload beforeUpload={handleStockUpload} showUploadList={false} accept=".xlsx, .xls, .csv">
                  <Button icon={<UploadOutlined />} block type="primary" ghost>
                    {stockFileName ? `Loaded: ${stockFileName}` : 'Upload Stock File'}
                  </Button>
                </Upload>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className="flex flex-col h-full justify-between bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                <div>
                  <div className="font-semibold text-slate-700 mb-1">2. Sales Register Sheet</div>
                  <div className="text-xs text-slate-500 mb-3">
                    Header: <code>Item Name</code>, <code>Qty</code>, <code>Date</code>
                  </div>
                </div>
                <Upload beforeUpload={handleSalesUpload} showUploadList={false} accept=".xlsx, .xls, .csv">
                  <Button icon={<UploadOutlined />} block type="primary" ghost disabled={stockData.length === 0}>
                    {salesFileName ? `Loaded: ${salesFileName}` : 'Upload Sales File'}
                  </Button>
                </Upload>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full flex flex-col justify-between">
                <div className="font-semibold text-slate-700 mb-2">3. Rule Parameters</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Threshold (%):</span>
                    <InputNumber
                      min={0.1}
                      max={100}
                      step={0.5}
                      value={thresholdPercent}
                      onChange={(val) => setThresholdPercent(val || 0)}
                      addonAfter="%"
                      className="w-32"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Calculate % On:</span>
                    <Select
                      value={baseMetric}
                      onChange={(val) => setBaseMetric(val)}
                      className="w-36"
                      options={[
                        { label: 'Closing Stock', value: 'closing' },
                        { label: 'Total Available', value: 'totalAvailable' },
                        { label: 'Opening Stock', value: 'opening' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Period Window Selector */}
        <Card className="shadow-sm rounded-2xl border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-blue-500 text-lg" />
              <span className="font-semibold text-slate-800">Sales Period Window:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={periodOption}
                onChange={setPeriodOption}
                className="w-52"
                options={[
                  { label: 'All Time / Full File', value: 'all' },
                  { label: 'Last 30 Days', value: '30' },
                  { label: 'Last 60 Days', value: '60' },
                  { label: 'Last 90 Days', value: '90' },
                  { label: 'Current Financial Year (FY)', value: 'current_fy' },
                  { label: 'Last Financial Year (FY)', value: 'last_fy' },
                  { label: 'Custom Date Range', value: 'custom' },
                ]}
              />

              {periodOption === 'custom' && (
                <RangePicker
                  value={customDateRange}
                  onChange={setCustomDateRange}
                  format="YYYY-MM-DD"
                  className="w-64"
                />
              )}

              {['30', '60', '90'].includes(periodOption) && (
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-500">Anchor:</span>
                  <Radio.Group
                    size="small"
                    value={dateAnchor}
                    onChange={(e) => setDateAnchor(e.target.value)}
                  >
                    <Radio.Button value="latestInFile">Latest in File ({refDate.format('YYYY-MM-DD')})</Radio.Button>
                    <Radio.Button value="today">Today ({dayjs().format('YYYY-MM-DD')})</Radio.Button>
                  </Radio.Group>
                </div>
              )}
            </div>
          </div>

          {activeDateRange && (
            <div className="mt-3 text-xs text-blue-600 font-medium bg-blue-50 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
              <span>
                Active Sales Filter Range: <strong>{activeDateRange.start.format('DD MMM YYYY')}</strong> to <strong>{activeDateRange.end.format('DD MMM YYYY')}</strong>
              </span>
              <span>
                Sales matched only within this time window.
              </span>
            </div>
          )}
        </Card>

        {/* Dashboard Financial KPI Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm rounded-2xl border-slate-200">
              <Statistic
                title={<span className="text-slate-500 font-medium">Total Stock Value</span>}
                value={metrics.totalStockVal}
                precision={2}
                prefix={<DollarCircleOutlined className="text-blue-500 mr-2" />}
                suffix="₹"
              />
              <div className="mt-2 text-xs text-slate-400">{metrics.totalItems} Items Processed</div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm rounded-2xl border-red-200 bg-red-50/30">
              <Statistic
                title={<span className="text-red-600 font-medium">Zero Sales Capital</span>}
                value={metrics.zeroSaleVal}
                precision={2}
                valueStyle={{ color: '#dc2626' }}
                prefix={<AlertOutlined className="text-red-500 mr-2" />}
                suffix="₹"
              />
              <div className="mt-2 text-xs text-red-500 font-medium">{metrics.zeroCount} Products Unsold in Period</div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm rounded-2xl border-amber-200 bg-amber-50/30">
              <Statistic
                title={<span className="text-amber-700 font-medium">Low Sales Capital</span>}
                value={metrics.lowSaleVal}
                precision={2}
                valueStyle={{ color: '#d97706' }}
                prefix={<LineChartOutlined className="text-amber-500 mr-2" />}
                suffix="₹"
              />
              <div className="mt-2 text-xs text-amber-600 font-medium">{metrics.lowCount} Products Below {thresholdPercent}% Target</div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm rounded-2xl border-emerald-200 bg-emerald-50/30">
              <Statistic
                title={<span className="text-emerald-700 font-medium">Normal Sales Capital</span>}
                value={metrics.normalSaleVal}
                precision={2}
                valueStyle={{ color: '#059669' }}
                prefix={<CheckCircleOutlined className="text-emerald-500 mr-2" />}
                suffix="₹"
              />
              <div className="mt-2 text-xs text-emerald-600 font-medium">{metrics.normalCount} Products Performing Well</div>
            </Card>
          </Col>
        </Row>

        {/* Interactive Charts */}
        {processedData.length > 0 && (
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={10}>
              <Card title="Inventory Capital Allocation" className="shadow-sm rounded-2xl border-slate-200 h-full">
                <div className="h-64 flex justify-center items-center">
                  <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card title="Slowest Moving Products vs Target" className="shadow-sm rounded-2xl border-slate-200 h-full">
                <div className="h-64">
                  <Bar
                    data={barData}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      plugins: { legend: { position: 'bottom' } },
                    }}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Data Table */}
        <Card className="shadow-sm rounded-2xl border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                { label: `All Items (${processedData.length})`, key: 'all' },
                { label: `Zero Sales (${metrics.zeroCount})`, key: 'zero' },
                { label: `Low Sales (${metrics.lowCount})`, key: 'low' },
                { label: `Normal Sales (${metrics.normalCount})`, key: 'normal' },
              ]}
            />
            <Space>
              <Input
                placeholder="Search Item Name..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                className="w-64"
              />
              <Tooltip title="Export Filtered Table to Excel">
                <Button icon={<DownloadOutlined />} onClick={handleExportExcel} type="primary" className="bg-emerald-600 hover:bg-emerald-500">
                  Export
                </Button>
              </Tooltip>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={filteredData}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1000 }}
            bordered={false}
            rowClassName={(record) => {
              if (record.status === 'Zero') return 'bg-red-50/20';
              if (record.status === 'Low') return 'bg-amber-50/20';
              return '';
            }}
          />
        </Card>

      </div>
    </div>
  );
}