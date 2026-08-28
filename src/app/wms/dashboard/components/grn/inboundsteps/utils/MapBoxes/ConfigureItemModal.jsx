import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Form,
  AutoComplete,
  DatePicker,
  InputNumber,
  Tag,
  Button,
  Table,
  message,
  Popconfirm,
  Badge,
  Space,
} from "antd";
import {
  BarcodeOutlined,
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

export default function ConfigureItemModal({
  isModalOpen,
  setIsModalOpen,
  editingItem,
  form,
  handleModalSave,
  batchOptions = [],
  serialOptions = [],
  handleBatchChange,
  handleSerialChange,
  lookupBatchOrSerialDetails,
  existingSerials = [], // Local state serial check
  checkSerialExistsInDb, // DB duplicate check function
}) {
  const [scannedQueue, setScannedQueue] = useState([]);
  const [currentSerialInput, setCurrentSerialInput] = useState("");
  const [editingRowKey, setEditingRowKey] = useState(null); // Key of item being inline-edited
  const [submitting, setSubmitting] = useState(false);
  const scanInputRef = useRef(null);

  const scanType = (editingItem?.scan_type || "bulk").toLowerCase();
  
  const isSerialized = ["serialized", "piece", "serial"].includes(scanType);

  // Focus scan field automatically when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setScannedQueue([]);
      setCurrentSerialInput("");
      setEditingRowKey(null);
      setSubmitting(false);

      if (isSerialized) {
        setTimeout(() => scanInputRef.current?.focus(), 150);
      }
    }
  }, [isModalOpen, editingItem, isSerialized]);

  // ---------------------------------------------------------------------------
  // RAPID SCANNER: Add item using active form metadata as default
  // ---------------------------------------------------------------------------
  const handleAddSerialToQueue = async (serialVal) => {
    const rawVal = serialVal || currentSerialInput;
    const trimmed = rawVal ? rawVal.trim() : "";

    if (!trimmed) {
      message.error("Please enter or scan a valid serial number!");
      return;
    }

    const lowerVal = trimmed.toLowerCase();

    // 1. Check current queue duplicates
    if (scannedQueue.some((item) => item.serial_number.toLowerCase() === lowerVal)) {
      message.error(`Serial "${trimmed}" is already in the current queue!`);
      setCurrentSerialInput("");
      return;
    }

    // 2. Check local session duplicates
    if (existingSerials.some((s) => s.toLowerCase() === lowerVal)) {
      message.error(`Serial "${trimmed}" was already saved in this session!`);
      setCurrentSerialInput("");
      return;
    }

    // 3. Database Check
    if (typeof checkSerialExistsInDb === "function") {
      try {
        const existsInDb = await checkSerialExistsInDb(trimmed);
        if (existsInDb) {
          message.error(`Serial "${trimmed}" already exists in the system database!`);
          setCurrentSerialInput("");
          return;
        }
      } catch (err) {
        console.error("DB serial check error:", err);
      }
    }

    // Read current form metadata values to attach to this scanned serial
    const formValues = form.getFieldsValue();

    const newItem = {
      key: Date.now() + Math.random(),
      serial_number: trimmed,
      batch_number: formValues.batch_number || null,
      mrp: formValues.mrp ? Number(formValues.mrp) : null,
      mfg_date: formValues.mfg_date ? dayjs(formValues.mfg_date) : null,
      scanned_at: dayjs().format("HH:mm:ss"),
    };

    setScannedQueue((prev) => [newItem, ...prev]);

    message.success({ content: `Queued: ${trimmed}`, duration: 1.2 });
    setCurrentSerialInput("");
    form.setFieldsValue({ serial_number: "" });

    // Re-focus scanner field immediately
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  // ---------------------------------------------------------------------------
  // INLINE METADATA EDITING IN QUEUE TABLE
  // ---------------------------------------------------------------------------
  const handleQueueFieldChange = (key, field, value) => {
    setScannedQueue((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  };

  const handleRemoveFromQueue = (key) => {
    setScannedQueue((prev) => prev.filter((item) => item.key !== key));
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setScannedQueue([]);
  };

  // ---------------------------------------------------------------------------
  // CONFIRMATION SUBMISSION
  // ---------------------------------------------------------------------------
  const onSubmit = async () => {
    try {
      const formValues = await form.validateFields();

      if (isSerialized) {
        if (scannedQueue.length === 0) {
          message.warning("Please scan at least one serial number before confirming!");
          return;
        }

        // Validate that all queued items have required metadata
        const invalidItem = scannedQueue.find((item) => !item.mrp || !item.mfg_date);
        if (invalidItem) {
          message.error(
            `Serial "${invalidItem.serial_number}" is missing MRP or Mfg Date in table!`
          );
          return;
        }

        setSubmitting(true);

        // Submit rich payload containing array of objects with individual metadata
        await handleModalSave({
          is_serialized: true,
          items: scannedQueue.map((q) => ({
            serial_number: q.serial_number,
            batch_number: q.batch_number,
            mrp: q.mrp,
            mfg_date: q.mfg_date ? q.mfg_date.format("YYYY-MM-01") : null,
          })),
          received_qty: scannedQueue.length,
        });
      } else {
        // Standard non-serialized payload
        setSubmitting(true);
        await handleModalSave({
          ...formValues,
          is_serialized: false,
          received_qty: formValues.received_qty,
        });
      }

      setIsModalOpen(false);
      setScannedQueue([]);
    } catch (err) {
      console.error("Form submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // TABLE COLUMNS WITH INLINE EDIT CAPABILITY
  // ---------------------------------------------------------------------------
  const queueColumns = [
    {
      title: "#",
      width: 45,
      render: (_, __, index) => scannedQueue.length - index,
    },
    {
      title: "Serial Number",
      dataIndex: "serial_number",
      key: "serial_number",
      width: 140,
      render: (text) => <span className="font-mono font-bold text-slate-800">{text}</span>,
    },
    {
      title: "Batch No.",
      dataIndex: "batch_number",
      key: "batch_number",
      width: 120,
      render: (text, record) =>
        editingRowKey === record.key ? (
          <AutoComplete
            value={text}
            options={batchOptions}
            size="small"
            className="font-mono"
            onChange={(val) => handleQueueFieldChange(record.key, "batch_number", val)}
          />
        ) : (
          <span className="font-mono text-xs">{text || "N/A"}</span>
        ),
    },
    {
      title: "Mfg. Month",
      dataIndex: "mfg_date",
      key: "mfg_date",
      width: 110,
      render: (val, record) =>
        editingRowKey === record.key ? (
          <DatePicker
            picker="month"
            format="MM/YYYY"
            value={val}
            size="small"
            onChange={(date) => handleQueueFieldChange(record.key, "mfg_date", date)}
          />
        ) : (
          <span className="text-xs">{val ? val.format("MM/YYYY") : "-"}</span>
        ),
    },
    {
      title: "MRP (₹)",
      dataIndex: "mrp",
      key: "mrp",
      width: 100,
      render: (val, record) =>
        editingRowKey === record.key ? (
          <InputNumber
            min={0}
            size="small"
            value={val}
            className="font-mono w-full"
            onChange={(num) => handleQueueFieldChange(record.key, "mrp", num)}
          />
        ) : (
          <span className="font-mono text-xs font-semibold">
            {val !== null && val !== undefined ? `₹${val}` : "-"}
          </span>
        ),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      render: (_, record) => (
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            className={editingRowKey === record.key ? "text-emerald-600 font-bold" : "text-slate-400"}
            onClick={() =>
              setEditingRowKey(editingRowKey === record.key ? null : record.key)
            }
          />
          <Popconfirm
            title="Remove serial?"
            onConfirm={() => handleRemoveFromQueue(record.key)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
          <span className="font-semibold text-slate-800">
            Configure: {editingItem?.item_name || "Item"}
          </span>
          <Tag
            icon={isSerialized ? <BarcodeOutlined /> : <AppstoreOutlined />}
            color={isSerialized ? "purple" : "cyan"}
            className="px-2.5 py-0.5 text-xs font-semibold"
          >
            {isSerialized ? "SERIALIZED SCANNING" : "BULK / QUANTITY"}
          </Tag>
        </div>
      }
      open={isModalOpen}
      onCancel={handleCancel}
      destroyOnHidden
      width={isSerialized ? 780 : 520}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          icon={<CheckCircleOutlined />}
          onClick={onSubmit}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          {isSerialized ? `Confirm Item (${scannedQueue.length})` : "Confirm Items"}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" className="pt-2">
        {/* ========================================================
            CASE 1: SERIALIZED WORKFLOW (Scan -> Set Defaults -> Edit in Table)
           ======================================================== */}
        {isSerialized && (
          <div className="space-y-4">
            {/* TOP PANEL: Default Metadata Controls for upcoming scans */}
            <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg space-y-3">
              <div className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                <BarcodeOutlined className="text-purple-600" />
                <span>Active Metadata Presets (Applied to next scanned serials)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Form.Item name="batch_number" label="Default Batch" className="mb-0">
                  <AutoComplete
                    options={batchOptions}
                    placeholder="BATCH-123"
                    className="font-mono"
                    onChange={handleBatchChange}
                    onSelect={(val) => lookupBatchOrSerialDetails("batch", val)}
                  />
                </Form.Item>

                <Form.Item
                  name="mfg_date"
                  label="Default Mfg. Month"
                  className="mb-0"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <DatePicker picker="month" format="MM/YYYY" className="w-full" />
                </Form.Item>

                <Form.Item
                  name="mrp"
                  label="Default MRP (₹)"
                  className="mb-0"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <InputNumber min={0} className="w-full font-mono" placeholder="0.00" />
                </Form.Item>
              </div>
            </div>

            {/* SCANNER INPUT FIELD */}
            <div className="flex gap-2 items-end">
              <div className="grow">
                <Form.Item
                  label="Scan Serial Number"
                  className="mb-0"
                  help="Scan barcode or press Enter to add to queue below"
                >
                  <AutoComplete
                    ref={scanInputRef}
                    options={serialOptions}
                    value={currentSerialInput}
                    placeholder="Scan barcode or type SN-123..."
                    className="font-mono text-lg"
                    onChange={(val) => {
                      setCurrentSerialInput(val);
                      if (handleSerialChange) handleSerialChange(val);
                    }}
                    onSelect={(val) => handleAddSerialToQueue(val)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSerialToQueue();
                      }
                    }}
                  />
                </Form.Item>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleAddSerialToQueue()}
                className="bg-purple-600 hover:bg-purple-500 h-10 mb-6"
              >
                Add
              </Button>
            </div>

            {/* QUEUED SCANS TABLE WITH BATCH/MRP COLUMNS */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-semibold text-slate-600">
                  Scanned Queue
                </span>
                <Badge count={`${scannedQueue.length} Serials`} style={{ backgroundColor: "#7c3aed" }} />
              </div>

              <Table
                dataSource={scannedQueue}
                columns={queueColumns}
                pagination={{ pageSize: 5, simple: true }}
                size="small"
                bordered
                locale={{ emptyText: "No serial numbers scanned yet." }}
              />
            </div>
          </div>
        )}

        {/* ========================================================
            CASE 2: BULK / NON-SERIALIZED WORKFLOW
           ======================================================== */}
        {!isSerialized && (
          <div className="space-y-3">
            <Form.Item
              name="batch_number"
              label="Batch Number"
              rules={[{ required: true, message: "Batch number is required" }]}
            >
              <AutoComplete
                options={batchOptions}
                placeholder="BATCH-123"
                className="font-mono"
                onChange={handleBatchChange}
                onSelect={(val) => lookupBatchOrSerialDetails("batch", val)}
              />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="expiry_date"
                label="Expiry Date"
                rules={[{ required: true, message: "Expiry Date is required" }]}
              >
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>

              <Form.Item
                name="mrp"
                label="MRP (₹)"
                rules={[{ required: true, message: "MRP is required" }]}
              >
                <InputNumber min={0} className="w-full font-mono" placeholder="0.00" />
              </Form.Item>
            </div>

            <Form.Item
              name="received_qty"
              label="Received Qty"
              rules={[{ required: true, message: "Qty is required" }]}
            >
              <InputNumber min={1} className="w-full font-mono" />
            </Form.Item>
          </div>
        )}
      </Form>
    </Modal>
  );
}