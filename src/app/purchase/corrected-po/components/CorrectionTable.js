"use client";

import { Table, InputNumber, Checkbox, Tag } from "antd";

export default function CorrectionTable({ items, setItems }) {
  
  // Update parent unit or loose inner unit state
  const updateReceivedQty = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value || 0 } : item
      )
    );
  };

  const toggleAttention = (id, checked) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, attention: checked } : item
      )
    );
  };

  // Helper to normalize quantities down to base "Packs" for calculation accuracy
  const getPacksCalculations = (record) => {
    const factor = record.conversion_factor || 1;
    const orderedPacks = record.ordered_qty * factor;
    const receivedPacks = (record.received_qty || 0) * factor + (record.received_loose_qty || 0);
    const diffPacks = receivedPacks - orderedPacks;

    return { orderedPacks, receivedPacks, diffPacks, factor };
  };

  const getStatus = (record) => {
    const { diffPacks, receivedPacks } = getPacksCalculations(record);
    if (diffPacks === 0) return "Full";
    if (receivedPacks === 0) return "Missing";
    if (diffPacks < 0) return "Partial";
    return "Added";
  };

  const columns = [
    {
      title: "Product",
      dataIndex: "product_name",
    },
    {
      title: "Ordered",
      width: 160,
      render: (_, record) => {
        const { orderedPacks, factor } = getPacksCalculations(record);
        return (
          <div className="py-0.5">
            <div className="font-medium text-slate-800">
              {record.ordered_qty} {record.unit}
            </div>
            {factor > 1 && (
              <div className="text-xs text-slate-500 mt-0.5">
                = {orderedPacks} Packs
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Received",
      width: 320,
      render: (_, record) => {
        const { receivedPacks, factor } = getPacksCalculations(record);
        const hasConversion = factor > 1;

        return (
          <div className="flex flex-col gap-1.5 py-1">
            <div className="flex items-center gap-3">
              {/* Parent Unit Input (e.g., Cases) */}
              <div className="flex items-center gap-1">
                <InputNumber
                  min={0}
                  value={record.received_qty}
                  onChange={(val) => updateReceivedQty(record.id, "received_qty", val)}
                  className="w-20"
                />
                <span className="text-xs font-medium text-slate-500">{record.unit}</span>
              </div>

              {/* Loose Inner Unit Input (Only shows if item maps conversions) */}
              {hasConversion && (
                <div className="flex items-center gap-1 border-l pl-3 border-slate-200">
                  <InputNumber
                    min={0}
                    max={factor - 1} // Restricts user from inputting an entire extra package case
                    value={record.received_loose_qty}
                    onChange={(val) => updateReceivedQty(record.id, "received_loose_qty", val)}
                    className="w-20"
                    status={record.received_loose_qty ? "warning" : ""}
                  />
                  <span className="text-xs font-medium text-amber-600">Packs (Open)</span>
                </div>
              )}
            </div>

            {hasConversion && (
              <div className="text-xs text-blue-600 font-medium px-0.5 bg-blue-50/50 py-0.5 rounded border border-blue-100/50 w-fit">
                Total: {receivedPacks} Packs
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Difference",
      width: 140,
      render: (_, record) => {
        const { diffPacks, factor } = getPacksCalculations(record);
        if (diffPacks === 0) return <span className="text-slate-400">-</span>;

        // Display variance breakdown (e.g., -1 Case 2 Packs)
        const displayCases = Math.trunc(diffPacks / factor);
        const displayPacks = diffPacks % factor;

        return (
          <div className={`flex flex-col font-medium text-xs ${diffPacks < 0 ? "text-red-500" : "text-blue-500"}`}>
            <span>
              {diffPacks > 0 ? "+" : ""}
              {displayCases} {record.unit} {displayPacks !== 0 ? `${Math.abs(displayPacks)} Packs` : ""}
            </span>
            <span className="text-[10px] opacity-75">
              ({diffPacks > 0 ? "+" : ""}
              {diffPacks} total Packs)
            </span>
          </div>
        );
      },
    },
    {
      title: "Status",
      width: 110,
      render: (_, record) => {
        const status = getStatus(record);
        const colorMap = {
          Full: "green",
          Missing: "red",
          Partial: "orange",
          Added: "blue",
        };

        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: "Attention",
      width: 90,
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={record.attention}
          onChange={(e) => toggleAttention(record.id, e.target.checked)}
        />
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={items}
      pagination={false}
      bordered
      size="middle"
    />
  );
}