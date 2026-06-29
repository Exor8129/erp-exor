"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  Select,
  InputNumber,
  Button,
  Switch,
  Modal,
  Input,
  Divider,
} from "antd";
import { Package, Trash2, Plus, TrendingUpDown } from "lucide-react";

// import { loadTallyExcel } from "../../../lib/loadTallyExcel";
import TrendCard from "./sub-utils/trendcard";

export default function ProductSelection({
  items = [],
  addItem,
  removeItem,
  updateItem,
  productOptions = [],
  loadingProducts,
  activeRowId,
  setActiveRowId,
}) {
  const [showPricing, setShowPricing] = useState(false);
  const [tempProductModalOpen, setTempProductModalOpen] = useState(false);
  const [targetRow, setTargetRow] = useState(null);
  const [salesTrendModalOpen, setSalesTrendModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [salesData, setSalesData] = useState([]);
  const [tempProduct, setTempProduct] = useState({
    name: "",
    unit: "",
  });

  const handleShowSalesTrend = (record) => {
    setSelectedProduct(record);
    setSalesTrendModalOpen(true);
  };

  // Financial Calculations
  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (!item.productId) return acc;
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const taxRate = Number(item.tax || 0);
        const baseAmount = qty * rate;

        acc.qty += qty;
        acc.subtotal += baseAmount;
        acc.tax += baseAmount * (taxRate / 100);
        acc.grandTotal += baseAmount * (1 + taxRate / 100);
        return acc;
      },
      { qty: 0, subtotal: 0, tax: 0, grandTotal: 0 },
    );
  }, [items]);

  // ERP Round-Off Calculations
  const pricingSummary = useMemo(() => {
    const exactTotal = totals.grandTotal;
    const roundedTotal = Math.round(exactTotal);
    const roundOffValue = roundedTotal - exactTotal;

    return {
      subtotal: totals.subtotal,
      tax: totals.tax,
      roundOff: roundOffValue,
      grandTotal: roundedTotal,
    };
  }, [totals]);

  // Inline Ghost Row Construction
  const displayData = useMemo(() => {
    const data = [...items];
    const lastItem = items[items.length - 1];
    const showGhost = !lastItem || lastItem.productId;

    if (showGhost) {
      data.push({ id: "ghost-row", isGhost: true });
    }
    return data;
  }, [items]);

  const handleAddTemporaryProduct = () => {
    if (!tempProduct.name.trim()) return;

    const finalUnit = tempProduct.unit.trim() || "Nos";
    const uniqueId = `TEMP-${Date.now()}`;

    const dynamicProduct = {
      id: uniqueId,
      name: tempProduct.name.trim(),
      unit: finalUnit,
      purchaseUnit: finalUnit,
      conversionFactor: 1,
      tax: 0,
      basePrice: 0,
      temporary: true,
    };

    if (targetRow?.isGhost) {
      addItem(dynamicProduct);
    } else if (targetRow?.id) {
      updateItem(targetRow.id, {
        productId: dynamicProduct.id,
        productName: dynamicProduct.name,
        unit: dynamicProduct.unit,
        purchaseUom: dynamicProduct.purchaseUnit,
        conversionFactor: 1,
        tax: 0,
        rate: 0,
      });
    }

    setTempProduct({ name: "", unit: "" });
    setTargetRow(null);
    setTempProductModalOpen(false);
  };

  // Columns layout
  const columns = useMemo(() => {
    return [
      {
        title: "Product",
        width: 450,
        render: (_, record) => {
          const isEditing = activeRowId === record.id || record.isGhost;

          if (!isEditing && !record.isGhost) {
            return (
              <div
                className="cursor-pointer min-h-9.5 flex flex-col justify-center py-1 px-2 hover:bg-slate-50/50 rounded"
                onClick={() => setActiveRowId(record.id)}
              >
                <div className="font-medium text-slate-700">
                  {record.productName || "Unnamed Product"}
                </div>
                {record.conversionFactor > 1 && (
                  <div className="text-xs text-blue-600 mt-0.5 font-medium">
                    {record.qty} {record.purchaseUom} ={" "}
                    {record.qty * record.conversionFactor} {record.unit}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div className="flex flex-col w-full gap-1 py-0.5">
              <Select
                showSearch
                className="w-full"
                placeholder={
                  record.isGhost
                    ? "+ Click to add item..."
                    : "Search Product..."
                }
                variant={record.isGhost ? "dashed" : "outlined"}
                loading={loadingProducts}
                value={record.productName || undefined}
                optionFilterProp="label"
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                onChange={(value) => {
                  const product = productOptions.find((p) => p.id === value);
                  if (!product) return;

                  if (record.isGhost) {
                    addItem(product);
                  } else {
                    const firstConversion = product.conversions?.[0];

                    updateItem(record.id, {
                      productId: product.id,
                      productName: product.name,

                      unit: product.unit,

                      conversions: product.conversions || [],

                      purchaseUom: firstConversion
                        ? firstConversion.from_unit
                        : product.unit,

                      conversionFactor: firstConversion
                        ? Number(firstConversion.factor)
                        : 1,

                      hsn: product.hsn,
                      tax: product.tax || 0,
                      rate: product.basePrice || 0,
                    });
                  }
                }}
                options={productOptions.map((p) => ({
                  value: p.id,
                  // CHANGED HERE: Directly outputs "Product Name (ID)"
                  label: `${p.name} (${p.code})`,
                }))}
                popupRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: 0 }} />
                    <div
                      className="px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center gap-2 text-blue-600 font-medium"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setTargetRow(record);
                        setTempProductModalOpen(true);
                      }}
                    >
                      <Plus size={16} />
                      Add Temporary Product
                    </div>
                  </>
                )}
              />
              {!record.isGhost &&
                record.productId &&
                record.conversionFactor > 1 && (
                  <div className="text-xs text-blue-600 px-1 font-medium">
                    {record.qty || 0} {record.purchaseUom} ={" "}
                    {(record.qty || 0) * record.conversionFactor} {record.unit}
                  </div>
                )}
            </div>
          );
        },
      },
      {
        title: "Qty",
        width: 120,
        render: (_, record) => {
          if (record.isGhost)
            return <div className="text-slate-300 italic text-xs px-2">--</div>;

          const isEditing = activeRowId === record.id;
          if (!isEditing) {
            return (
              <div
                className="cursor-pointer min-h-9.5 flex items-center px-2 hover:bg-slate-50/50 rounded"
                onClick={() => setActiveRowId(record.id)}
              >
                {record.qty || 0}
              </div>
            );
          }

          return (
            <InputNumber
              min={1}
              className="w-full"
              value={record.qty}
              onChange={(v) => {
                const nextQty = v || 1;
                updateItem(record.id, { qty: nextQty });
              }}
            />
          );
        },
      },
      {
        title: "Unit",
        width: 150,

        render: (_, record) => {
          if (record.isGhost) return null;

          // No conversions → just display base unit
          if (!record.conversions?.length) {
            return <div className="px-2">{record.unit}</div>;
          }

          return (
            <Select
              className="w-full"
              value={record.purchaseUom}
              options={[
                ...record.conversions.map((c) => ({
                  value: c.from_unit,
                  label: c.from_unit,
                })),

                {
                  value: record.unit,
                  label: record.unit,
                },
              ]}
              onChange={(value) => {
                const selected = record.conversions.find(
                  (c) => c.from_unit === value,
                );

                updateItem(record.id, {
                  purchaseUom: value,

                  conversionFactor: selected ? Number(selected.factor) : 1,
                });
              }}
            />
          );
        },
      },
      ...(showPricing
        ? [
            {
              title: "Rate",
              width: 130,
              render: (_, record) => {
                if (record.isGhost) return null;
                const isEditing = activeRowId === record.id;

                if (!isEditing) {
                  return (
                    <div
                      className="cursor-pointer min-h-9.5 flex items-center font-mono text-slate-600 px-2 hover:bg-slate-50/50 rounded"
                      onClick={() => setActiveRowId(record.id)}
                    >
                      ₹{(record.rate || 0).toFixed(2)}
                    </div>
                  );
                }

                return (
                  <InputNumber
                    min={0}
                    className="w-full font-mono"
                    formatter={(value) =>
                      `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) =>
                      value ? value.replace(/\₹\s?|(,*)/g, "") : ""
                    }
                    value={record.rate}
                    onChange={(value) =>
                      updateItem(record.id, {
                        rate: value || 0,
                      })
                    }
                  />
                );
              },
            },
            {
              title: "Tax %",
              width: 110,
              render: (_, record) => {
                if (record.isGhost) return null;
                return (
                  <div
                    className="min-h-9.5 flex items-center text-slate-500 font-mono px-2"
                    onClick={() => setActiveRowId(record.id)}
                  >
                    {record.tax || 0}%
                  </div>
                );
              },
            },
            {
              title: "Amount",
              width: 160,
              render: (_, record) => {
                if (record.isGhost) return null;
                const amount = (record.qty || 0) * (record.rate || 0);
                return (
                  <div
                    className="min-h-9.5 flex items-center font-semibold text-slate-700 font-mono px-2"
                    onClick={() => setActiveRowId(record.id)}
                  >
                    ₹{amount.toFixed(2)}
                  </div>
                );
              },
            },
          ]
        : []),
      {
        title: "",
        width: 60,
        align: "center",
        render: (_, record) =>
          !record.isGhost && (
            <Button
              type="text"
              icon={<TrendingUpDown size={16} />}
              className="text-blue-500 hover:text-blue-700"
              onClick={() => handleShowSalesTrend(record)}
            />
          ),
      },
      {
        title: "",
        width: 60,
        align: "center",
        render: (_, record) =>
          !record.isGhost && (
            <Button
              danger
              type="text"
              icon={<Trash2 size={16} />}
              onClick={() => removeItem(record.id)}
            />
          ),
      },
    ];
  }, [
    activeRowId,
    showPricing,
    productOptions,
    loadingProducts,
    addItem,
    removeItem,
    updateItem,
    targetRow,
  ]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-2">
      <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-blue-600" />
          <h2 className="font-semibold text-slate-800">Products & Items</h2>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer select-none">
            <Switch
              checked={showPricing}
              onChange={setShowPricing}
              size="small"
            />
            Show Pricing Details
          </label>
        </div>
      </div>

      <div className="p-2">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={displayData}
          pagination={false}
          size="middle"
          rowClassName={(record) =>
            record.isGhost ? "opacity-60 bg-slate-50/30" : ""
          }
        />
      </div>

      {/* Summary Footer */}
      <div className="border-t border-slate-200 bg-slate-50/30 px-6 py-5 flex flex-col sm:flex-row justify-between items-start rounded-b-xl font-mono">
        <div className="text-xs text-slate-400 font-medium mb-4 sm:mb-0">
          Total Items: {items.filter((i) => i.productId).length} row(s)
        </div>

        <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto text-right text-sm">
          <div className="text-slate-600 font-medium">
            Total Qty:{" "}
            <span className="text-slate-900 font-semibold">{totals.qty}</span>
          </div>

          {showPricing && (
            <>
              <div className="text-slate-600 font-medium">
                Subtotal:{" "}
                <span className="text-slate-900 font-semibold">
                  ₹{pricingSummary.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="text-slate-600 font-medium">
                Tax Total:{" "}
                <span className="text-red-600 font-semibold">
                  + ₹{pricingSummary.tax.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium italic">
                Round Off:{" "}
                <span>
                  {pricingSummary.roundOff >= 0 ? "+ " : "- "}₹
                  {Math.abs(pricingSummary.roundOff).toFixed(2)}
                </span>
              </div>

              <div className="border-t border-slate-200 mt-1.5 pt-2 w-full sm:w-56 text-right text-base font-bold text-slate-800">
                Grand Total:{" "}
                <span className="text-emerald-600">
                  ₹{pricingSummary.grandTotal.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Localized Modal Control Element */}
      <Modal
        title="Add Temporary Product"
        open={tempProductModalOpen}
        footer={null}
        onCancel={() => {
          setTempProductModalOpen(false);
          setTargetRow(null);
        }}
      >
        <div className="space-y-3 pt-2">
          <Input
            size="large"
            placeholder="Product Name"
            value={tempProduct.name}
            onChange={(e) =>
              setTempProduct({
                ...tempProduct,
                name: e.target.value,
              })
            }
          />

          <Input
            size="large"
            placeholder="Unit (e.g., Nos, Box, Kg)"
            value={tempProduct.unit}
            onChange={(e) =>
              setTempProduct({
                ...tempProduct,
                unit: e.target.value,
              })
            }
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => {
                setTempProductModalOpen(false);
                setTargetRow(null);
              }}
            >
              Cancel
            </Button>

            <Button type="primary" onClick={handleAddTemporaryProduct}>
              Add Product
            </Button>
          </div>
        </div>
      </Modal>

      <TrendCard
        open={salesTrendModalOpen}
        onClose={() => setSalesTrendModalOpen(false)}
        selectedProduct={selectedProduct}
        salesData={salesData}
      />
    </div>
  );
}
