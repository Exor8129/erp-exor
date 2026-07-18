"use client";

import { useState } from "react";
import { Modal, Table, InputNumber, message } from "antd";
import SummaryCards from "./SummaryCards";
import GRNItemsTable from "./GRNItemsTable";

export default function GRNPage({ initialItems = [] }) {
  // 1. Centralize master items state array
  const [items, setItems] = useState(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 2. Track matching input quantities inside the Modal using item IDs as object keys
  // Structure: { [itemId]: entryQuantity }
  const [receivedInputs, setReceivedInputs] = useState({});

  // Fires when user clicks your styled interactive Action summary card
  const handleOpenGRNModal = () => {
    const defaultInputs = {};
    items.forEach((item) => {
      // Auto-prefills the modal input fields with the balance remaining to save clicks
      defaultInputs[item.id] = item.balance_qty > 0 ? item.balance_qty : 0;
    });
    setReceivedInputs(defaultInputs);
    setIsModalOpen(true);
  };

  // Handles dynamic state tracking as values are changed in the input form
  const handleQtyChange = (itemId, val) => {
    setReceivedInputs((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  // Handles updates, recalculates balances, and appends the nested GRN history log
  const handleSubmitGRN = () => {
    // Validation: Enforce that at least one product has an incoming quantity added
    const hasValidQty = Object.values(receivedInputs).some((qty) => qty > 0);
    if (!hasValidQty) {
      message.warning("Please enter a receiving quantity greater than 0 for at least one item.");
      return;
    }

    const generatedGrnNo = `GRN-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingDate = new Date().toISOString();

    const updatedItems = items.map((item) => {
      const addedQty = receivedInputs[item.id] || 0;
      if (addedQty <= 0) return item;

      const newTotalReceived = item.total_received_qty + addedQty;
      // Protect values against sliding below zero if they over-receive on purpose
      const newBalance = Math.max(0, item.ordered_qty - newTotalReceived);
      const historicalRecords = item.grn_history || [];

      return {
        ...item,
        total_received_qty: newTotalReceived,
        balance_qty: newBalance,
        grn_history: [
          ...historicalRecords,
          { grn_no: generatedGrnNo, date: trackingDate, qty: addedQty },
        ],
      };
    });

    setItems(updatedItems);
    setIsModalOpen(false);
    message.success(`Successfully saved receipt voucher ${generatedGrnNo}!`);
  };

  // Specific column schemas for the table displaying inside the Pop-up Form
  const modalColumns = [
    {
      title: "Product Details",
      dataIndex: "product_name",
      key: "product_name",
    },
    {
      title: "Pending Balance",
      width: 160,
      key: "pending_balance",
      render: (_, record) => (
        <span className="font-semibold text-orange-600">
          {record.balance_qty} {record.unit}
        </span>
      ),
    },
    {
      title: "Receiving Quantity",
      width: 200,
      key: "receiving_qty",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <InputNumber
            min={0}
            value={receivedInputs[record.id]}
            onChange={(val) => handleQtyChange(record.id, val)}
            className="w-full"
            placeholder="Qty"
          />
          <span className="text-xs text-gray-400 font-medium w-8">{record.unit}</span>
        </div>
      ),
    },
  ];

  // Derive status counters dynamically from state array to feed into metrics dashboard
  const missingCount = items.filter((i) => i.total_received_qty === 0).length;
  const partialCount = items.filter((i) => i.total_received_qty > 0 && i.total_received_qty < i.ordered_qty).length;
  const addedCount = items.filter((i) => i.total_received_qty >= i.ordered_qty && i.total_received_qty > 0).length;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* 1. Header Aggregation Metric Blocks */}
      <SummaryCards
        missingCount={missingCount}
        partialCount={partialCount}
        addedCount={addedCount}
        attentionCount={0}
        onAddClick={handleOpenGRNModal}
      />

      {/* 2. Primary Item Master Registry */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800">Goods Received Note (GRN) Registry</h2>
          <p className="text-xs text-slate-400">Review line-item processing lifecycles and nested transaction histories.</p>
        </div>
        
        {/* Pass downstream state data into the static listing table view */}
        <GRNItemsTable items={items} />
      </div>

      {/* 3. Global Creation Dialog Context Overlay */}
      <Modal
        title="Log Incoming Goods Receipt"
        open={isModalOpen}
        onOk={handleSubmitGRN}
        onCancel={() => setIsModalOpen(false)}
        okText="Submit GRN"
        cancelText="Discard"
        width={680}
        okButtonProps={{ className: "bg-blue-600 hover:bg-blue-700" }}
        destroyOnHidden
      >
        <div className="my-3 text-xs text-slate-500">
          Analyze items pending delivery below. Values typed into the rows automatically update the metrics dashboard and log your entries into the popover transaction lines.
        </div>
        <Table
          rowKey="id"
          dataSource={items}
          columns={modalColumns}
          pagination={false}
          bordered
          size="small"
        />
      </Modal>
    </div>
  );
}