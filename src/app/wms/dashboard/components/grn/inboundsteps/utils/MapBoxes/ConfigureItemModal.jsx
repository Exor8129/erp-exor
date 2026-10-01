import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Tooltip,
  Alert,
  Card,
  Divider,
} from "antd";
import {
  BarcodeOutlined,
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  ClearOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  RocketOutlined,
  ContainerOutlined,
  MergeCellsOutlined,
  ScanOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { supabase } from "../../../../../../../lib/supabase";

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
  existingSerials = [],
  checkSerialExistsInDb,
  activeContainer,
}) {
  const [scannedQueue, setScannedQueue] = useState([]);
  const [currentSerialInput, setCurrentSerialInput] = useState("");
  const [editingRowKey, setEditingRowKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastScanStatus, setLastScanStatus] = useState({
    type: "idle",
    message: "Ready to scan items...",
  });

  // Duplicate batch resolution state for bulk items
  const [duplicateMatch, setDuplicateMatch] = useState(null);
  const [duplicateType, setDuplicateType] = useState(null);
  const [availableBatchOptions, setAvailableBatchOptions] = useState([]);
  const [nearExpiryWarning, setNearExpiryWarning] = useState(false);

  const scanInputRef = useRef(null);

  const scanType = (editingItem?.scan_type || "bulk").toLowerCase();
  const isSerialized = ["serialized", "piece", "serial"].includes(scanType);

  // Active container identifier helper
  const containerName =
    activeContainer?.name ||
    activeContainer?.barcode ||
    activeContainer?.id ||
    "Default Container";

  // Focus scan input and reset form states on modal open
  useEffect(() => {
    if (isModalOpen) {
      setScannedQueue([]);
      setCurrentSerialInput("");
      setEditingRowKey(null);
      setSubmitting(false);
      setDuplicateMatch(null);
      setDuplicateType(null);
      setNearExpiryWarning(false);

      setLastScanStatus({
        type: "idle",
        message:
          "Scanner ready. Point barcode reader or key-in serial numbers.",
      });

      if (isSerialized) {
        setTimeout(() => scanInputRef.current?.focus(), 150);
      }
    }
  }, [isModalOpen, isSerialized]);

  useEffect(() => {
    if (!isModalOpen || !editingItem?.product_id) {
      setAvailableBatchOptions([]);
      return;
    }

    fetchBatches();
  }, [isModalOpen, editingItem?.product_id]);

  // Calculated Queue Statistics for Real-time Dashboard Summary
  const queueStats = useMemo(() => {
    const totalCount = scannedQueue.length;
    const uniqueBatches = new Set(
      scannedQueue.map((item) => item.batch_number).filter(Boolean),
    ).size;
    const totalValue = scannedQueue.reduce(
      (acc, curr) => acc + (Number(curr.mrp) || 0),
      0,
    );
    const missingMetadataCount = scannedQueue.filter(
      (item) => !item.mrp || !item.mfg_date,
    ).length;

    return { totalCount, uniqueBatches, totalValue, missingMetadataCount };
  }, [scannedQueue]);

  // ---------------------------------------------------------------------------
  // BULK BATCH DUPLICATE WATCHER
  // Checks if the user-entered Batch + MRP combination matches existing container data
  // ---------------------------------------------------------------------------
  const watchBatchNumber = Form.useWatch("batch_number", form);
  const watchExpiryDate = Form.useWatch("expiry_date", form);

  const isExpired = useMemo(() => {
  if (!watchExpiryDate) return false;

  const today = dayjs().startOf("day");
  const expiryDate = dayjs(watchExpiryDate).startOf("day");

  return expiryDate.isBefore(today);
}, [watchExpiryDate]);

  useEffect(() => {
    if (isSerialized || !watchBatchNumber) {
      setDuplicateMatch(null);
      setDuplicateType(null);
      return;
    }

    const containerItems =
      editingItem?.container_items || activeContainer?.items || [];

    const existingItem = containerItems.find((item) => {
      const sameBatch =
        (item.batch_number || "").trim().toLowerCase() ===
        (watchBatchNumber || "").trim().toLowerCase();

      const sameContainer =
        !item.container_id || item.container_id === activeContainer?.id;

      return sameBatch && sameContainer;
    });

    if (existingItem) {
      setDuplicateMatch(existingItem);
      setDuplicateType("bulk");
    } else {
      setDuplicateMatch(null);
      setDuplicateType(null);
    }
  }, [watchBatchNumber, isSerialized, editingItem, activeContainer]);

  // ---------------------------------------------------------------------------
  // SERIALIZED SCANNER HANDLER
  // ---------------------------------------------------------------------------
  const handleAddSerialToQueue = async (serialVal) => {
    const rawVal = serialVal || currentSerialInput;
    const trimmed = rawVal ? rawVal.trim() : "";

    if (!trimmed) {
      setLastScanStatus({
        type: "error",
        message: "Please scan or enter a serial number",
      });
      message.error("Invalid input! Serial number cannot be blank.");
      return;
    }

    const lowerVal = trimmed.toLowerCase();

    // 1. Check current queue duplicates
    if (
      scannedQueue.some((item) => item.serial_number.toLowerCase() === lowerVal)
    ) {
      setLastScanStatus({
        type: "warning",
        message: `Duplicate skipped: ${trimmed} is already in the scan queue`,
      });
      message.warning(`Serial "${trimmed}" is already in the current queue!`);
      setCurrentSerialInput("");
      return;
    }

    // 2. Check local session duplicates in current container
    const isExistingInSession = existingSerials.some((s) => {
      if (typeof s === "string") return s.toLowerCase() === lowerVal;
      if (typeof s === "object" && s.serial_number) {
        return (
          s.serial_number.toLowerCase() === lowerVal &&
          (!s.container_id || s.container_id === activeContainer?.id)
        );
      }
      return false;
    });

    if (isExistingInSession) {
      setLastScanStatus({
        type: "warning",
        message: `Serial "${trimmed}" is already added to ${containerName}.`,
      });

      message.warning({
        content: (
          <div>
            <strong>Serial already added</strong>
            <div className="text-xs mt-1">
              "{trimmed}" already exists in {containerName}.
              <br />
              Please edit the existing entry instead.
            </div>
          </div>
        ),
        duration: 4,
      });

      setCurrentSerialInput("");
      return;
    }

    // 3. Database Validation
    if (typeof checkSerialExistsInDb === "function") {
      try {
        const existsInDb = await checkSerialExistsInDb(
          trimmed,
          activeContainer?.id,
        );
        if (existsInDb) {
          setLastScanStatus({
            type: "warning",
            message: `Serial "${trimmed}" is already added to ${containerName}.`,
          });

          message.warning({
            content: (
              <div>
                <strong>Serial already added to this container</strong>
                <div className="text-xs mt-1">
                  Serial "{trimmed}" already exists.
                  <br />
                  Please edit the existing entry instead.
                </div>
              </div>
            ),
            duration: 4,
          });

          setCurrentSerialInput("");
          return;
        }
      } catch (err) {
        console.error("DB serial check failed:", err);
      }
    }

    // Fetch form preset values to apply to the scanned serial
    const formValues = form.getFieldsValue();

    const newItem = {
      key: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      serial_number: trimmed,
      batch_number: formValues.batch_number || null,
      mrp: formValues.mrp ? Number(formValues.mrp) : null,
      mfg_date: formValues.mfg_date ? dayjs(formValues.mfg_date) : null,
      scanned_at: dayjs().format("HH:mm:ss"),
      container_id: activeContainer?.id || null,
      is_preset: true,
    };

    setScannedQueue((prev) => [newItem, ...prev]);
    setLastScanStatus({
      type: "success",
      message: `Scanned successfully: ${trimmed}`,
    });
    message.success({ content: `Added: ${trimmed}`, duration: 1.5 });

    setCurrentSerialInput("");
    form.setFieldsValue({ serial_number: "" });

    // Instantly keep input focused for quick continuous handheld scanning
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  const handleQueueFieldChange = (key, field, value) => {
    setScannedQueue((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, [field]: value, is_preset: false } : row,
      ),
    );
  };

  const handleRemoveFromQueue = (key) => {
    setScannedQueue((prev) => prev.filter((item) => item.key !== key));
  };

  const handleClearAllQueue = () => {
    setScannedQueue([]);
    message.info("Staging queue cleared.");
  };

const handleExpiryDateChange = (date) => {
  if (!date) {
    setNearExpiryWarning(false);
    return;
  }

  const today = dayjs().startOf("day");
  const threeMonthsFromToday = today.add(3, "month").startOf("day");
  const selectedDate = dayjs(date).startOf("day");

  const isNearExpiry =
    !selectedDate.isBefore(today) &&
    selectedDate.isBefore(threeMonthsFromToday.add(1, "day"));

  setNearExpiryWarning(isNearExpiry);
};

  const handleCancel = () => {
    setIsModalOpen(false);
    setScannedQueue([]);
    setDuplicateMatch(null);
  };

  // ---------------------------------------------------------------------------
  // SUBMISSION LOGIC
  // ---------------------------------------------------------------------------
  const onSubmit = async () => {
    try {
      const formValues = await form.validateFields();

      if (isSerialized) {
        if (scannedQueue.length === 0) {
          message.warning("Please scan at least one item before committing!");
          return;
        }

        const invalidItem = scannedQueue.find(
          (item) => !item.mrp || !item.mfg_date,
        );
        if (invalidItem) {
          message.error(
            `Serial "${invalidItem.serial_number}" is missing required MRP or Mfg Date.`,
          );
          return;
        }

        setSubmitting(true);

        await handleModalSave({
          is_serialized: true,
          container_id: activeContainer?.id || null,
          items: scannedQueue.map((q) => ({
            serial_number: q.serial_number,
            batch_number: q.batch_number,
            mrp: q.mrp,
            mfg_date: q.mfg_date ? q.mfg_date.format("YYYY-MM-01") : null,
            container_id: activeContainer?.id || null,
          })),
          received_qty: scannedQueue.length,
        });
      } else {
        // Bulk items duplicate check confirmation
        if (duplicateMatch) {
          message.error(
            `Batch "${formValues.batch_number}" with MRP ₹${formValues.mrp} already exists in ${containerName}. Please update the MRP or change batch number.`,
          );
          return;
        }

        setSubmitting(true);
        await handleModalSave({
          ...formValues,
          container_id: activeContainer?.id || null,
          is_serialized: false,
          received_qty: formValues.received_qty,
        });
      }

      setIsModalOpen(false);
      setScannedQueue([]);
      setDuplicateMatch(null);
    } catch (err) {
      console.error("Form validation error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HIGH DENSITY TABLE COLUMNS
  // ---------------------------------------------------------------------------
  const queueColumns = [
    {
      title: "#",
      width: 45,
      align: "center",
      render: (_, __, index) => (
        <span className="text-[11px] font-mono text-slate-400 font-medium">
          {String(scannedQueue.length - index).padStart(2, "0")}
        </span>
      ),
    },
    {
      title: "Serial Number / Barcode",
      dataIndex: "serial_number",
      key: "serial_number",
      width: 180,
      render: (text, record) => (
        <div className="flex items-center gap-2">
          <BarcodeOutlined className="text-indigo-500 text-xs" />
          <span className="font-mono font-bold text-slate-800 text-xs tracking-wide">
            {text}
          </span>
          {record.is_preset && (
            <Tooltip title="Preset values automatically applied">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: "Batch No.",
      dataIndex: "batch_number",
      key: "batch_number",
      width: 140,
      render: (text, record) =>
        editingRowKey === record.key ? (
          <AutoComplete
            value={text}
            options={batchOptions}
            size="small"
            className="font-mono text-xs w-full"
            onChange={(val) =>
              handleQueueFieldChange(record.key, "batch_number", val)
            }
          />
        ) : (
          <Tag
            color="blue"
            className="font-mono text-[11px] border-blue-200 text-blue-700 m-0 rounded"
          >
            {text || "UNBATCHED"}
          </Tag>
        ),
    },
    {
      title: "Mfg. Month",
      dataIndex: "mfg_date",
      key: "mfg_date",
      width: 130,
      render: (val, record) =>
        editingRowKey === record.key ? (
          <DatePicker
            picker="month"
            format="MM/YYYY"
            value={val}
            size="small"
            className="w-full text-xs"
            onChange={(date) =>
              handleQueueFieldChange(record.key, "mfg_date", date)
            }
          />
        ) : (
          <span className="text-xs font-mono text-slate-700">
            {val ? (
              val.format("MM/YYYY")
            ) : (
              <span className="text-red-500 font-bold bg-red-50 px-1 py-0.5 rounded text-[10px]">
                MISSING
              </span>
            )}
          </span>
        ),
    },
    {
      title: "MRP (₹)",
      dataIndex: "mrp",
      key: "mrp",
      width: 110,
      align: "right",
      render: (val, record) =>
        editingRowKey === record.key ? (
          <InputNumber
            min={0}
            size="small"
            value={val}
            className="font-mono text-xs w-full"
            onChange={(num) => handleQueueFieldChange(record.key, "mrp", num)}
          />
        ) : (
          <span className="font-mono text-xs font-bold text-slate-800">
            {val !== null && val !== undefined ? (
              `₹${Number(val).toFixed(2)}`
            ) : (
              <span className="text-red-500 font-bold bg-red-50 px-1 py-0.5 rounded text-[10px]">
                MISSING
              </span>
            )}
          </span>
        ),
    },
    {
      title: "Time",
      dataIndex: "scanned_at",
      key: "scanned_at",
      width: 80,
      align: "center",
      render: (time) => (
        <span className="text-[10px] font-mono text-slate-400">{time}</span>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 70,
      align: "center",
      render: (_, record) => (
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            className={
              editingRowKey === record.key
                ? "text-indigo-600 bg-indigo-50"
                : "text-slate-400 hover:text-indigo-600"
            }
            onClick={() =>
              setEditingRowKey(editingRowKey === record.key ? null : record.key)
            }
          />
          <Popconfirm
            title="Remove item?"
            onConfirm={() => handleRemoveFromQueue(record.key)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              className="text-slate-400 hover:text-red-600"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const fetchBatches = async () => {
    if (!editingItem?.product_id) {
      setAvailableBatchOptions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .schema("purchase")
        .from("container_item_details")
        .select("batch_number")
        .eq("item_id", editingItem.product_id)
        .not("batch_number", "is", null);

      if (error) {
        console.error("Error fetching batches:", error);
        setAvailableBatchOptions([]);
        return;
      }

      // Remove duplicate batch numbers
      const uniqueBatches = [
        ...new Set(
          (data || []).map((row) => row.batch_number?.trim()).filter(Boolean),
        ),
      ];

      setAvailableBatchOptions(
        uniqueBatches.map((batch) => ({
          value: batch,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch batches:", err);
      setAvailableBatchOptions([]);
    }
  };

  return (
    <Modal
      title={
        <div className="pr-8 pb-3 border-b border-slate-100">
          {/* ITEM NAME */}
          <div className="mb-2">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Item Receipt Entry
            </div>

            <div className="text-base font-bold text-slate-800 leading-tight">
              {editingItem?.item_name || "Unspecified Item SKU"}
            </div>
          </div>

          {/* CONTAINER + SCAN TYPE */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag
              icon={<ContainerOutlined />}
              color="cyan"
              className="px-2.5 py-1 text-xs font-semibold rounded-md border-cyan-200 m-0"
            >
              Container: {containerName}
            </Tag>

            <Tag
              icon={isSerialized ? <BarcodeOutlined /> : <AppstoreOutlined />}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider m-0 ${
                isSerialized
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-teal-50 text-teal-700 border-teal-200"
              }`}
            >
              {isSerialized ? "Serialized" : "Bulk"}
            </Tag>
          </div>
        </div>
      }
      open={isModalOpen}
      onCancel={handleCancel}
      destroyOnHidden
      width={isSerialized ? 980 : 740}
      style={{ top: 20 }}
      footer={[
        <div
          key="footer-container"
          className="flex items-center justify-between w-full px-1"
        >
          <Space>
            <Button
              key="cancel"
              onClick={handleCancel}
              className="rounded-lg font-medium"
            >
              Cancel (Esc)
            </Button>
            <Button
              key="submit"
              type="primary"
              loading={submitting}
              icon={<CheckCircleOutlined />}
              disabled={isExpired}
              onClick={onSubmit}
              className="bg-slate-900 hover:bg-slate-800 rounded-lg font-medium shadow-sm"
            >
              {isSerialized
                ? `Commit Scanned Items (${scannedQueue.length})`
                : "Save Batch Stock"}
            </Button>
          </Space>
        </div>,
      ]}
    >
      <Form form={form} layout="vertical" className="pt-2">
        {/* ========================================================
            CASE 1: SERIALIZED WORKFLOW (HANDHELD BARCODE SCANNER)
           ======================================================== */}
        {isSerialized && (
          <div className="space-y-4">
            {/* WMS QUICK METRICS SUMMARY DASHBOARD */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200/80 p-3 rounded-xl shadow-xs">
              <div className="border-r border-slate-200 pr-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Scanned Qty
                </span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  {queueStats.totalCount} Pcs
                </span>
              </div>
              <div className="border-r border-slate-200 pr-2 pl-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Total Batches
                </span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  {queueStats.uniqueBatches}
                </span>
              </div>
              <div className="border-r border-slate-200 pr-2 pl-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Total Value
                </span>
                <span className="text-lg font-bold font-mono text-slate-800">
                  ₹{queueStats.totalValue.toFixed(2)}
                </span>
              </div>
              <div className="pl-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Data Status
                </span>
                {queueStats.missingMetadataCount === 0 ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                    <SafetyCertificateOutlined /> All Complete
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1 mt-1">
                    <WarningOutlined /> {queueStats.missingMetadataCount} Needs
                    Info
                  </span>
                )}
              </div>
            </div>

            {/* PRESET CONFIGURATION BOX */}
            <Card
              size="small"
              className="bg-indigo-50/40 border-indigo-100 rounded-xl shadow-none"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <RocketOutlined className="text-indigo-600" />
                  <span>Auto-Assign Batch Defaults</span>
                </div>
                <Tooltip title="Values entered here will be auto-filled for every serial barcode scanned below.">
                  <InfoCircleOutlined className="text-indigo-400 text-xs" />
                </Tooltip>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Form.Item
                  name="batch_number"
                  label={
                    <span className="text-xs font-medium text-slate-600">
                      Default Batch No.
                    </span>
                  }
                  className="mb-0"
                >
                  <AutoComplete
                    options={availableBatchOptions}
                    placeholder="e.g. BATCH-2026-09"
                    className="font-mono text-sm"
                    onChange={handleBatchChange}
                  />
                </Form.Item>

                <Form.Item
                  name="mfg_date"
                  label={
                    <span className="text-xs font-medium text-slate-600">
                      Default Mfg. Month
                    </span>
                  }
                  className="mb-0"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <DatePicker
                    picker="month"
                    format="MM/YYYY"
                    size="small"
                    className="w-full text-xs"
                  />
                </Form.Item>

                <Form.Item
                  name="mrp"
                  label={
                    <span className="text-xs font-medium text-slate-600">
                      Default Unit MRP (₹)
                    </span>
                  }
                  className="mb-0"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <InputNumber
                    min={0}
                    size="small"
                    className="w-full font-mono text-xs"
                    placeholder="0.00"
                  />
                </Form.Item>
              </div>
            </Card>

            {/* BARCODE SCANNER INPUT BOX */}
            <div className="space-y-2">
              <div className="flex gap-2 items-end">
                <div className="grow">
                  <Form.Item
                    label={
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        <ScanOutlined className="text-indigo-600" /> Barcode /
                        Serial Scan Box
                      </span>
                    }
                    className="mb-0"
                  >
                    <AutoComplete
                      ref={scanInputRef}
                      options={serialOptions}
                      value={currentSerialInput}
                      placeholder="Scan serial barcode or press enter..."
                      className="font-mono text-base"
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
                  className="bg-indigo-600 hover:bg-indigo-500 h-9.5 px-5 font-semibold text-xs uppercase tracking-wider rounded-lg"
                >
                  Add Serial
                </Button>
              </div>

              {/* SCANNER FEEDBACK STRIP */}
              <div
                className={`px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between border transition-all ${
                  lastScanStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : lastScanStatus.type === "warning"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : lastScanStatus.type === "error"
                        ? "bg-red-50 text-red-800 border-red-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      lastScanStatus.type === "success"
                        ? "bg-emerald-500 animate-ping"
                        : lastScanStatus.type === "warning"
                          ? "bg-amber-500"
                          : lastScanStatus.type === "error"
                            ? "bg-red-500"
                            : "bg-slate-400"
                    }`}
                  />
                  <strong>Scanner Feedback:</strong> {lastScanStatus.message}
                </span>
                <span className="text-[10px] text-slate-400 font-sans">
                  Destination: <strong>{containerName}</strong>
                </span>
              </div>
            </div>

            {/* STAGING QUEUE TABLE */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center px-0.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span>Staged Items Buffer</span>
                  <Badge
                    count={scannedQueue.length}
                    overflowCount={999}
                    style={{ backgroundColor: "#0f172a" }}
                  />
                </span>

                {scannedQueue.length > 0 && (
                  <Popconfirm
                    title="Clear entire queue?"
                    onConfirm={handleClearAllQueue}
                    okText="Clear All"
                    cancelText="Cancel"
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<ClearOutlined />}
                      className="text-xs"
                    >
                      Clear Queue
                    </Button>
                  </Popconfirm>
                )}
              </div>

              <Table
                dataSource={scannedQueue}
                columns={queueColumns}
                pagination={{ pageSize: 5, simple: true, size: "small" }}
                size="small"
                bordered
                className="erp-high-density-table shadow-xs rounded-lg overflow-hidden border-slate-200"
                rowClassName={(record) =>
                  !record.mrp || !record.mfg_date ? "bg-amber-50/40" : ""
                }
                locale={{
                  emptyText: (
                    <div className="py-8 text-center text-slate-400">
                      <BarcodeOutlined className="text-3xl mb-2 text-slate-300" />
                      <p className="text-xs font-mono">
                        No items in current scan buffer. Start scanning barcodes
                        above.
                      </p>
                    </div>
                  ),
                }}
              />
            </div>
          </div>
        )}

        {/* ========================================================
            CASE 2: BULK / NON-SERIALIZED WORKFLOW
           ======================================================== */}
        {!isSerialized && (
          <div className="space-y-4 py-2">
            {/* DUPLICATE BATCH DETECTED WARNING BANNER */}
            {duplicateMatch && duplicateType === "bulk" && (
              <Alert
                type="warning"
                showIcon
                icon={<ExclamationCircleOutlined className="text-amber-600" />}
                className="border-amber-200 bg-amber-50 rounded-lg"
                message={
                  <span className="font-bold text-amber-900 text-xs">
                    Batch Already Added to This Container
                  </span>
                }
                description={
                  <div className="space-y-3 mt-1">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Batch <strong>"{duplicateMatch.batch_number}"</strong> is
                      already stored in <strong>{containerName}</strong>.
                      <br />
                      Existing Quantity:{" "}
                      <strong>
                        {duplicateMatch.received_qty ||
                          duplicateMatch.quantity ||
                          0}
                      </strong>
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        size="small"
                        type="primary"
                        icon={<EditOutlined />}
                        className="bg-amber-600 hover:bg-amber-700 text-xs rounded"
                        onClick={handleEditDuplicate}
                      >
                        Edit Existing Entry
                      </Button>

                      <span className="text-[11px] text-amber-700">
                        Increase the quantity in the existing entry instead.
                      </span>
                    </div>
                  </div>
                }
              />
            )}

            <Form.Item
              name="batch_number"
              label={
                <span className="text-xs font-bold text-slate-700">
                  Batch / Lot Number
                </span>
              }
              rules={[{ required: true, message: "Batch number is required" }]}
            >
              <AutoComplete
                options={availableBatchOptions}
                placeholder="e.g. BATCH-2026-09"
                className="font-mono text-sm"
                onChange={handleBatchChange}
                onSelect={(val) => lookupBatchOrSerialDetails("batch", val)}
              />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item
                name="expiry_date"
                label={
                  <span className="text-xs font-bold text-slate-700">
                    Expiry Date
                  </span>
                }
                rules={[
                  { required: true, message: "Expiry Date is required" },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const today = dayjs().startOf("day");
                      const selectedDate = dayjs(value).startOf("day");

                      if (selectedDate.isBefore(today)) {
                        return Promise.reject(
                          new Error("Selected date is already expired"),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <DatePicker
                  className="w-full text-sm rounded-md"
                  format="YYYY-MM-DD"
                  onChange={handleExpiryDateChange}
                />
              </Form.Item>

              <Form.Item
                name="mrp"
                label={
                  <span className="text-xs font-bold text-slate-700">
                    Unit MRP (₹)
                  </span>
                }
                rules={[{ required: true, message: "MRP is required" }]}
              >
                <InputNumber
                  min={0}
                  className="w-full font-mono text-sm rounded-md"
                  placeholder="0.00"
                />
              </Form.Item>
            </div>

            {nearExpiryWarning && (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                className="my-2 border-amber-200 bg-amber-50 rounded-lg"
                title={
                  <span className="font-bold text-amber-900 text-xs">
                    Near-Expiry Item
                  </span>
                }
                description={
                  <span className="text-xs text-amber-800">
                    This item expires within 3 months from today (or today).
                    <strong> Please proceed with caution.</strong>
                  </span>
                }
              />
            )}

            <Divider className="my-2" />

            <Form.Item
              name="received_qty"
              label={
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Total Quantity Received
                </span>
              }
              rules={[{ required: true, message: "Quantity is required" }]}
            >
              <InputNumber
                min={1}
                className="w-full font-mono text-base font-bold rounded-lg"
                placeholder="1"
              />
            </Form.Item>
          </div>
        )}
      </Form>
    </Modal>
  );
}



