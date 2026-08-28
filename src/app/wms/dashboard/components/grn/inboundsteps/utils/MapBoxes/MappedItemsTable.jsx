import React from "react";
import { Table, Spin, Button, Tooltip, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined, BarcodeOutlined } from "@ant-design/icons";

export default function MappedItemsTable({
  mappedItems,
  loading,
  activeContainer,
  onEdit,
  onRemove,
}) {
  const columns = [
    {
      title: "Item Details",
      dataIndex: "item_name",
      key: "item_name",
      render: (text, record) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{text}</span>
          <span className="font-mono text-xs text-slate-500">
            Code: {record.item_code}
          </span>
        </div>
      ),
    },
    {
      title: "Batch & Serial",
      key: "batch_serial",
      render: (_, record) => (
        <div className="flex flex-col gap-1 text-xs font-mono">
          <div>
            <span className="text-slate-400">Batch: </span>
            {record.batch_number || "N/A"}
          </div>
          <div>
            <span className="text-slate-400">Serial: </span>
            {record.serial_number || "N/A"}
          </div>
        </div>
      ),
    },
    {
      title: "Expiry & MRP",
      key: "expiry_mrp",
      render: (_, record) => (
        <div className="flex flex-col gap-1 text-xs font-mono">
          <div>
            <span className="text-slate-400">Exp: </span>
            {record.expiry_date || "N/A"}
          </div>
          <div>
            <span className="text-slate-400">MRP: </span>
            {record.mrp ? `₹${record.mrp}` : "N/A"}
          </div>
        </div>
      ),
    },
    {
      title: "Qty",
      key: "qtys",
      align: "center",
      render: (_, record) => {
        const qty = record.packed_qty ?? record.received_qty ?? 0;
        return (
          <div className="flex flex-col items-center font-mono">
            <span className="font-bold text-emerald-700">{qty}</span>
            {record.rejected_qty > 0 && (
              <span className="text-[10px] text-rose-500">
                ({record.rejected_qty} Rejected)
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "action",
      width: 100,
      align: "center",
      render: (_, record) => {
        // Target row_key first to uniquely identify split batch entries
        const targetKey = record.row_key || record.id;
        
        return (
          <div className="flex items-center justify-center gap-1">
            <Tooltip title="Edit Details">
              <Button
                type="text"
                icon={<EditOutlined className="text-blue-600" />}
                size="small"
                onClick={() => onEdit(record)}
              />
            </Tooltip>
            <Popconfirm
              title="Remove Item?"
              onConfirm={() => onRemove(targetKey)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  return (
    <Spin spinning={loading}>
      <Table
        dataSource={mappedItems}
        columns={columns}
        // Dynamic key evaluation ensures no duplicate row warnings
        rowKey={(record, index) => record.row_key || `${record.id}_${index}`}
        size="small"
        pagination={
          mappedItems?.length > 10
            ? { pageSize: 10, hideOnSinglePage: true, size: "small" }
            : false
        }
        bordered
        locale={{
          emptyText: (
            <div className="py-8 text-center text-slate-400">
              <BarcodeOutlined className="text-3xl mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                {!activeContainer
                  ? "Scan container barcode to begin packing."
                  : "Scan item barcodes to map items into this container."}
              </p>
            </div>
          ),
        }}
      />
    </Spin>
  );
}