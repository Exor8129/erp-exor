"use client";

import { useState } from "react";
import { Modal, Button, Table, Input, DatePicker, Card } from "antd";
import {
  AlertTriangle,
  PackageMinus,
  PackagePlus,
  Bell,
  PlusCircle,
} from "lucide-react";

export default function SummaryCards({
  missingCount = 0,
  partialCount = 0,
  addedCount = 0,
  attentionCount = 0,
  onAddClick,
}) {
  // Track hover state explicitly in React
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const columns = [
    {
      title: "Sl No",
      dataIndex: "slNo",
      key: "slNo",
      width: 70,
      align: "center",
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: "Balance Qty (PO)",
      dataIndex: "balanceQty",
      key: "balanceQty",
      width: 170,
      align: "center",
    },
    {
      title: "GRN Qty",
      dataIndex: "grnQty",
      key: "grnQty",
      width: 150,
      align: "center",
      render: (_, record) => (
        <Input type="number" min={0} defaultValue={record.grnQty} />
      ),
    },
  ];

  const data = [
    {
      key: 1,
      slNo: 1,
      productName: "Syringe 5ml",
      balanceQty: 120,
      grnQty: 0,
    },
    {
      key: 2,
      slNo: 2,
      productName: "Oxygen Mask",
      balanceQty: 45,
      grnQty: 0,
    },
  ];

  const cards = [
    {
      title: "Missing",
      value: missingCount,
      icon: <AlertTriangle size={20} />,
      color: "text-red-600",
    },
    {
      title: "Partial",
      value: partialCount,
      icon: <PackageMinus size={20} />,
      color: "text-yellow-600",
    },
    {
      title: "Over Received",
      value: addedCount,
      icon: <PackagePlus size={20} />,
      color: "text-blue-600",
    },
    {
      title: "Attention",
      value: attentionCount,
      icon: <Bell size={20} />,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Render Standard Stat Cards */}
      {cards.map((card) => (
        <Card key={card.title}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-500">{card.title}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
            <div className={card.color}>{card.icon}</div>
          </div>
        </Card>
      ))}

      {/* Render Action Button Card with absolute style overrides */}
      <Card
        onClick={() => {
          if (onAddClick) {
            onAddClick();
          } else {
            showModal();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="cursor-pointer transition-all duration-300 transform active:scale-95 bg-white"
        style={{
          borderColor: isHovered ? "#2563eb" : "#e2e8f0", // Dynamically switches border between blue-600 and slate-200
          transform: isHovered ? "translateY(-4px)" : "none",
          boxShadow: isHovered ? "0 4px 6px -1px rgb(0 0 0 / 0.1)" : "none",
        }}
        styles={{ body: { padding: "16px" } }}
      >
        <div className="flex flex-col h-full justify-between gap-1">
          <span
            className="text-xs font-medium transition-colors duration-300"
            style={{ color: isHovered ? "#60a5fa" : "#94a3b8" }} // blue-400 vs slate-400
          >
            Quick Action
          </span>
          <div
            className="flex items-center gap-2 mt-1 font-bold text-base whitespace-nowrap transition-colors duration-300"
            style={{ color: isHovered ? "#2563eb" : "#334155" }} // blue-600 vs slate-700
          >
            <PlusCircle size={22} />
            <span>Add/Edit GRN</span>
          </div>
        </div>
      </Card>

      <Modal
  title={
    <span className="text-lg font-semibold">
      Create Goods Receipt Note (GRN)
    </span>
  }
  open={isModalOpen}
  onCancel={handleClose}
  width={1100}
  footer={[
    <Button key="cancel" onClick={handleClose}>
      Cancel
    </Button>,
    <Button key="save" type="primary">
      Save GRN
    </Button>,
  ]}
>
  <div className="space-y-5">

    {/* Header Section */}

    <Card size="small">
      <div className="grid grid-cols-2 gap-5">

        <div>
          <label className="block text-sm font-medium mb-1">
            Supplier Invoice No
          </label>

          <Input placeholder="Invoice Number" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Invoice Date
          </label>

          <DatePicker className="w-full" />
        </div>

      </div>
    </Card>

    {/* Items Table */}

    <Card
      size="small"
      title="Purchase Order Items"
    >
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        bordered
        size="small"
        scroll={{ y: 350 }}
      />
    </Card>

    {/* Remarks */}

    <Card size="small">
      <label className="block text-sm font-medium mb-2">
        Remarks
      </label>

      <Input.TextArea
        rows={3}
        placeholder="Remarks..."
      />
    </Card>

  </div>
</Modal>
    </div>
  );
}
