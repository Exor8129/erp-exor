"use client";

import { Table, Tag, Checkbox, Popover } from "antd";

export default function GRNItemsTable({ items }) {
  const columns = [
    // SL NO
    {
      title: "Sl. No.",
      key: "sl_no",
      width: 70,
      align: "center",
      render: (_, __, index) => index + 1, // Auto-generates 1, 2, 3...
    },

    // PRODUCT
    {
      title: "Product",
      dataIndex: "product_name",
    },

    // ORDERED
    {
      title: "Ordered Qty",
      width: 140,
      render: (_, record) => (
        <div className="font-medium">
          {record.ordered_qty} {record.unit}
        </div>
      ),
    },

    // TOTAL RECEIVED + HISTORY POPUP
    {
      title: "Received",
      width: 180,
      render: (_, record) => (
        <Popover
          title="GRN History"
          trigger="hover"
          content={
            <div className="space-y-2 min-w-55">
              {record.grn_history?.length ? (
                record.grn_history.map((grn, i) => {
                  // Safely parse the 'YYYY-MM-DD' string to avoid timezone shifts
                  const formatDate = (dateStr) => {
                    if (!dateStr) return "N/A";
                    const [year, month, day] = dateStr.split("-");
                    return new Date(year, month - 1, day).toLocaleDateString();
                  };

                  // Inside the record.grn_history.map block of GRNItemsTable:
                  return (
                    <div key={i} className="flex justify-between border-b pb-1">
                      <div>
                        {/* 🎯 Updated to fall back to a generic tag if grn_no isn't present yet */}
                        <div className="font-medium text-slate-800">
                          {grn.grn_no || `GRN-Pending`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(grn.received_date)}
                        </div>
                      </div>
                      <div className="font-semibold text-slate-700">
                        {grn.received_qty} {record.unit}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div>No GRN</div>
              )}

              <div className="pt-2 font-bold text-blue-600">
                Total: {record.total_received_qty} {record.unit}
              </div>
            </div>
          }
        >
          <span className="cursor-pointer text-blue-600 font-semibold underline decoration-dotted">
            {record.total_received_qty} {record.unit}
          </span>
        </Popover>
      ),
    },

    // BALANCE
    {
      title: "Balance",
      width: 120,
      render: (_, record) => {
        const balance = record.balance_qty;

        return (
          <span
            className={
              balance > 0
                ? "text-orange-600 font-medium"
                : "text-green-600 font-medium"
            }
          >
            {balance} {record.unit}
          </span>
        );
      },
    },

    // STATUS
    {
      title: "Status",
      width: 120,
      render: (_, record) => {
        let status = "Pending";

        if (record.total_received_qty === 0) status = "Pending";
        else if (record.total_received_qty < record.ordered_qty)
          status = "Partial";
        else if (record.total_received_qty === record.ordered_qty)
          status = "Complete";
        else status = "Over Received";

        const color = {
          Pending: "red",
          Partial: "orange",
          Complete: "green",
          "Over Received": "blue",
        };

        return <Tag color={color[status]}>{status}</Tag>;
      },
    },

    // ATTENTION
    {
      title: "Attention",
      width: 100,
      align: "center",
      render: () => <Checkbox />,
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
