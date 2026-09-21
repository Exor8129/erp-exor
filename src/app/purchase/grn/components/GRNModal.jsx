"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Input,
  DatePicker,
  Table,
  InputNumber,
  Button,
  Select,
  Popconfirm,
  Radio,
  message,
} from "antd";
import dayjs from "dayjs";
import { supabase } from "../../../lib/supabase";
import { updatePoTableStatus } from "@/app/lib/services/updatePoTableStatus";

// Fixed numeric identifier for non-LR / direct local deliveries
const LOCAL_DIRECT_LR = "999000999";

export default function GRNModal({ open, onClose, po, items: initialItems, setItems }) {
  // Transport Mode: "3pl" (select LR) | "local" (uses fixed numeric identifier)
  const [deliveryMode, setDeliveryMode] = useState("3pl");

  // Metadata fields
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(null);
  const [selectedLr, setSelectedLr] = useState(null);
  const [boxesReceived, setBoxesReceived] = useState(0);
  const [isBoxesLocked, setIsBoxesLocked] = useState(false);

  // PO Items & Shipments
  const [poItems, setPoItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(false);

  // Form states
  const [receivedInputs, setReceivedInputs] = useState({});
  const [mode, setMode] = useState("create"); // create | edit
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [existingGRNs, setExistingGRNs] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Discrepancy Modal States
  const [discrepancyModalOpen, setDiscrepancyModalOpen] = useState(false);
  const [discrepancies, setDiscrepancies] = useState([]);

  useEffect(() => {
    if (open && po?.id) {
      resetForm();
      fetchPOItems();
      fetchShipments();
      fetchExistingGRNs();
    }
  }, [open, po?.id]);

  const resetForm = () => {
    setDeliveryMode("3pl");
    setReceivedInputs({});
    setInvoiceNo("");
    setInvoiceDate(null);
    setSelectedLr(null);
    setBoxesReceived(0);
    setIsBoxesLocked(false);
    setDiscrepancyModalOpen(false);
    setDiscrepancies([]);
  };

  const handleDeliveryModeChange = (newMode) => {
    setDeliveryMode(newMode);
    if (newMode === "local") {
      setSelectedLr(LOCAL_DIRECT_LR);
      setIsBoxesLocked(false);
      setBoxesReceived(0);
    } else {
      setSelectedLr(null);
      setBoxesReceived(0);
      setIsBoxesLocked(false);
    }
  };

  const fetchPOItems = async () => {
    try {
      setLoadingItems(true);
      const { data, error } = await supabase
        .schema("purchase")
        .from("purchase_order_items")
        .select("id, product_name, qty, unit, product_id")
        .eq("po_id", po.id);

      if (error) throw error;
      setPoItems(data || []);
      if (setItems) setItems(data || []);
    } catch (err) {
      console.error("Error fetching PO items:", err);
      setPoItems(initialItems || []);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchShipments = async () => {
    try {
      setLoadingShipments(true);
      const { data, error } = await supabase
        .schema("purchase")
        .from("shipments")
        .select("id, lr_number, no_of_boxes")
        .eq("po_id", po?.id);

      if (error) throw error;
      setShipments(data || []);
    } catch (err) {
      console.error("Error fetching shipments:", err);
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleLrChange = (lrValue) => {
    setSelectedLr(lrValue);
    const matched = shipments.find((s) => String(s.lr_number) === String(lrValue));
    if (matched) {
      setBoxesReceived(Number(matched.no_of_boxes) || 0);
      setIsBoxesLocked(true);
    } else {
      setBoxesReceived(0);
      setIsBoxesLocked(false);
    }
  };

  const handleBoxFieldClick = () => {
    if (!isBoxesLocked) return;

    Modal.confirm({
      title: "Modify Box Count?",
      content:
        "This box count was automatically fetched from the selected shipment LR. Modifying it manually may cause a mismatch with shipment documentation. Are you sure you want to edit it?",
      okText: "Yes, Unlock to Edit",
      cancelText: "Keep Original",
      okButtonProps: { danger: true },
      onOk: () => setIsBoxesLocked(false),
    });
  };

  const handleGRNChange = async (grnId) => {
    try {
      setSelectedGRN(grnId);

      const { data: header, error: headerError } = await supabase
        .schema("purchase")
        .from("grn")
        .select("*")
        .eq("id", grnId)
        .single();

      if (headerError) throw headerError;

      const { data: details, error: detailsError } = await supabase
        .schema("purchase")
        .from("grn_items")
        .select("*")
        .eq("grn_id", grnId);

      if (detailsError) throw detailsError;

      const isLocal = String(header.lr_number) === LOCAL_DIRECT_LR;
      setDeliveryMode(isLocal ? "local" : "3pl");
      setSelectedLr(header.lr_number ? String(header.lr_number) : (isLocal ? LOCAL_DIRECT_LR : null));
      setInvoiceNo(header.invoice_no || "");
      setInvoiceDate(header.invoice_date ? dayjs(header.invoice_date) : null);
      setBoxesReceived(header.boxes_received ?? 0);
      setIsBoxesLocked(false);

      const qtyMap = {};
      (details || []).forEach((item) => {
        qtyMap[item.po_item_id] = Number(item.received_qty);
      });
      setReceivedInputs(qtyMap);
    } catch (err) {
      console.error("Error loading GRN:", err);
      message.error("Failed to load selected GRN.");
    }
  };

  const fetchExistingGRNs = async () => {
    const { data, error } = await supabase
      .schema("purchase")
      .from("grn")
      .select("id, grn_no, received_date")
      .eq("po_id", po.id)
      .order("created_at", { ascending: false });

    if (!error) setExistingGRNs(data || []);
  };

  const handleQtyChange = (itemId, value) => {
    setReceivedInputs((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleDeleteGRN = async () => {
    if (!selectedGRN) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase.rpc("delete_grn_with_items", {
        p_grn_id: selectedGRN,
      });

      if (error) throw error;

      message.success("GRN Deleted Successfully!");
      await updatePoTableStatus(po.id, "waiting_grn");

      setMode("create");
      setSelectedGRN(null);
      resetForm();
      fetchExistingGRNs();
    } catch (err) {
      console.error("Error deleting GRN:", err);
      message.error(err.message || "Failed to delete the GRN.");
    } finally {
      setIsDeleting(false);
    }
  };




  // const executeGRNSubmission = async (formattedItems) => {
  //   try {
  //     setIsSubmitting(true);
  //     let result;

  //     if (mode === "create") {
  //       result = await supabase.rpc("create_grn_with_items", {
  //         p_po_id: po.id,
  //         p_supplier_id: po.supplier_id,
  //         // p_lr_number: selectedLr,
  //         p_transporter_id:  "4" || null,
  //         p_boxes_received: boxesReceived,
  //         p_invoice_no: invoiceNo,
  //         p_invoice_date: invoiceDate.format("YYYY-MM-DD"),
  //         p_items: formattedItems,
  //       });
  //     } else {
  //       result = await supabase.rpc("update_grn_with_items", {
  //         p_grn_id: selectedGRN,
  //         p_lr_number: selectedLr,
  //         p_boxes_received: boxesReceived,
  //         p_invoice_no: invoiceNo,
  //         p_invoice_date: invoiceDate.format("YYYY-MM-DD"),
  //         p_items: formattedItems,
  //       });
  //     }

  //     if (result.error) throw result.error;
  //     updatePoTableStatus("18005325-f79a-4ca2-8299-4819a1c2e3f9","grn_created")
  //     alert(
  //       mode === "create"
  //         ? "GRN Created Successfully!"
  //         : "GRN Updated Successfully!"
  //     );

  //     onClose();
  //     window.location.reload();
  //   } catch (err) {
  //     console.error(err);
  //     alert(err.message || "Failed to process GRN.");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const executeGRNSubmission = async (formattedItems) => {
    // console.log("PO Datas", po);
    // console.log("Formatted Datas", formattedItems);

    // Data to grn table
    const transporter = selectedLr === "999000999" ? "Direct" : null
    const transporter_id = selectedLr === "999000999" ? "14" : null


    const { data, error } = await supabase.rpc("create_grn_helper", {
      p_po_id: po.id,
      p_supplier_id: po.supplier_id,
      p_invoice_no: invoiceNo,
      p_invoice_date: invoiceDate,
      p_boxes_received: boxesReceived,
      p_status: "In Transit",
      p_transporter_name: transporter,
      p_lr_number: selectedLr,
      p_shipment_status: "In Transit",
      p_transporter_id: transporter_id,
      p_items: formattedItems.map((item) => ({
        po_item_id: item.po_item_id,
        item_id: item.item_id,
        expected_qty: item.expected_qty,
        received_qty: item.received_qty,
      })),
    });

    if (error) {
      console.error("RPC Error:", error);
      return;
    }

    // console.log("GRN Payload returned from RPC:", data);



  }


  const handleSubmit = async () => {
    if (!(invoiceNo ?? "").trim()) return message.error("Supplier Invoice No is required.");
    if (!invoiceDate) return message.error("Invoice Date is required.");
    if (!selectedLr) return message.error("Please select or specify an LR Number.");
    if (!boxesReceived || boxesReceived <= 0) {
      return message.error("No. of Boxes Received must be greater than 0.");
    }
    if (!poItems.length) return message.error("No PO items found to receive.");

    const unenteredItem = poItems.find(
      (item) =>
        receivedInputs[item.id] === undefined ||
        receivedInputs[item.id] === null ||
        receivedInputs[item.id] === ""
    );

    if (unenteredItem) {
      return message.error(`Please enter "Qty (as per GRN)" for all items. Missing: ${unenteredItem.product_name}`);
    }

    const formattedItems = [];
    const foundDiscrepancies = [];

    for (const item of poItems) {
      const poQty = Number(item.qty ?? 0);
      const grnQty = Number(receivedInputs[item.id] ?? 0);
      const diff = grnQty - poQty;

      formattedItems.push({
        po_item_id: item.id,
        received_qty: grnQty,
        item_id: item.product_id || item.item_id || null,
      });

      if (diff !== 0) {
        foundDiscrepancies.push({
          id: item.id,
          product_name: item.product_name,
          po_qty: poQty,
          grn_qty: grnQty,
          diff_qty: diff,
          unit: item.unit,
        });
      }
    }

    // Trigger discrepancy review modal if quantities don't match
    if (foundDiscrepancies.length > 0 && !discrepancyModalOpen) {
      setDiscrepancies(foundDiscrepancies);
      setDiscrepancyModalOpen(true);
      return;
    }

    await executeGRNSubmission(formattedItems);
    updatePoTableStatus(po.id,"grn_created")
    onClose();
  };

  const footerButtons = [
    <Button key="back" onClick={onClose} disabled={isSubmitting}>
      Cancel
    </Button>,
  ];

  if (mode === "edit" && selectedGRN) {
    footerButtons.unshift(
      <Popconfirm
        key="delete-confirm"
        title="Delete Goods Received Note"
        description="Are you absolutely sure you want to delete this GRN? This action cannot be undone."
        onConfirm={handleDeleteGRN}
        okText="Yes, Delete"
        cancelText="No"
        okButtonProps={{ danger: true, loading: isDeleting }}
      >
        <Button danger type="dashed" className="float-left" disabled={isSubmitting}>
          Delete GRN
        </Button>
      </Popconfirm>
    );
  }

  footerButtons.push(
    <Button
      key="submit"
      type="primary"
      className="bg-blue-600 hover:bg-blue-500"
      loading={isSubmitting}
      onClick={handleSubmit}
    >
      {mode === "create" ? "Submit GRN" : "Update GRN"}
    </Button>
  );

  return (
    <>
      <Modal
        title="Create Goods Received Note"
        open={open}
        onCancel={onClose}
        width={1200}
        footer={footerButtons}
      >
        {/* Action Header & Delivery Mode Selector */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button
              type={mode === "create" ? "primary" : "default"}
              onClick={() => {
                setMode("create");
                setSelectedGRN(null);
                resetForm();
              }}
            >
              Create New GRN
            </Button>
            <Button
              type={mode === "edit" ? "primary" : "default"}
              onClick={() => setMode("edit")}
            >
              Edit Existing GRN
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">Transport Type:</span>
            <Radio.Group
              value={deliveryMode}
              onChange={(e) => handleDeliveryModeChange(e.target.value)}
              size="small"
            >
              <Radio.Button value="3pl">3PL Transporter (Shipment LR)</Radio.Button>
              <Radio.Button value="local">Local / Direct Delivery</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        {mode === "edit" && (
          <div className="mb-5">
            <label className="text-xs text-gray-500 block mb-1">Select GRN</label>
            <Select
              className="w-full"
              placeholder="Select GRN"
              value={selectedGRN}
              onChange={handleGRNChange}
              options={existingGRNs.map((g) => ({
                value: g.id,
                label: `${g.grn_no} (${g.received_date})`,
              }))}
            />
          </div>
        )}

        {/* PO Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border">
          <div>
            <label className="text-xs text-gray-500 block">PO Number</label>
            <div className="font-semibold">{po?.po_number || "-"}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Supplier</label>
            <div className="font-semibold">{po?.vendors?.vendor_name || "-"}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Status</label>
            <div className="font-semibold">{po?.status || "-"}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Total Items</label>
            <div className="font-semibold">{poItems?.length || 0}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Total Qty</label>
            <div className="font-semibold">{po?.total_qty || 0}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Grand Total</label>
            <div className="font-semibold">{po?.grand_total || 0}</div>
          </div>
        </div>

        {/* GRN Entry Fields */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Supplier Invoice No <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Enter invoice number"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Invoice Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              className="w-full"
              value={invoiceDate}
              onChange={(date) => setInvoiceDate(date)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              {deliveryMode === "3pl" ? "Select Shipment LR" : "System LR (Local Delivery)"}{" "}
              <span className="text-red-500">*</span>
            </label>
            {deliveryMode === "3pl" ? (
              <Select
                className="w-full"
                placeholder="Choose LR Number"
                loading={loadingShipments}
                value={selectedLr}
                onChange={handleLrChange}
                options={shipments.map((s) => ({
                  value: s.lr_number,
                  label: `${s.lr_number} (${s.no_of_boxes ?? 0} boxes)`,
                }))}
                allowClear
              />
            ) : (
              <Input
                value={LOCAL_DIRECT_LR}
                disabled
                className="bg-slate-100 font-mono font-semibold text-slate-800"
                addonAfter={<span className="text-xs text-gray-500 font-sans">Direct</span>}
              />
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              No. of Boxes Received <span className="text-red-500">*</span>
            </label>
            <div
              onClick={handleBoxFieldClick}
              className={isBoxesLocked ? "cursor-pointer" : ""}
            >
              <InputNumber
                className="w-full"
                min={1}
                placeholder="0"
                value={boxesReceived}
                disabled={isBoxesLocked}
                onChange={(val) => setBoxesReceived(val)}
              />
            </div>
          </div>
        </div>

        {/* PO Items Table */}
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm font-semibold mb-3">Purchase Order Items</div>
          <Table
            dataSource={poItems}
            rowKey="id"
            loading={loadingItems}
            pagination={false}
            size="small"
            bordered
            columns={[
              {
                title: "Product",
                dataIndex: "product_name",
                key: "product_name",
              },
              {
                title: "Qty (as per PO)",
                key: "po_qty",
                width: 140,
                render: (_, record) => (
                  <span className="font-semibold text-slate-700">
                    {Number(record.qty ?? 0)} {record.unit || ""}
                  </span>
                ),
              },
              {
                title: "Qty (as per GRN)",
                key: "grn_qty",
                width: 160,
                render: (_, record) => (
                  <InputNumber
                    min={0}
                    value={receivedInputs[record.id] ?? null}
                    onChange={(val) => handleQtyChange(record.id, val)}
                    className="w-full"
                    placeholder="Enter Qty"
                  />
                ),
              },
              {
                title: "Diff in Qty",
                key: "diff_qty",
                width: 130,
                render: (_, record) => {
                  const poQty = Number(record.qty ?? 0);
                  const grnVal = receivedInputs[record.id];

                  if (grnVal === undefined || grnVal === null || grnVal === "") {
                    return <span className="text-gray-400 italic text-xs">Pending</span>;
                  }

                  const grnQty = Number(grnVal);
                  const diff = grnQty - poQty;
                  const badgeColor =
                    diff > 0
                      ? "text-blue-600 font-semibold"
                      : diff < 0
                        ? "text-red-600 font-semibold"
                        : "text-emerald-600 font-semibold";
                  const sign = diff > 0 ? "+" : "";

                  return (
                    <span className={badgeColor}>
                      {sign}{diff} {record.unit || ""}
                    </span>
                  );
                },
              },
            ]}
          />
        </div>
      </Modal>

      {/* Discrepancy Confirmation Modal */}
      <Modal
        title="Quantity Discrepancy Detected"
        open={discrepancyModalOpen}
        onCancel={() => setDiscrepancyModalOpen(false)}
        width={800}
        footer={[
          <Button key="back" onClick={() => setDiscrepancyModalOpen(false)}>
            Back to Edit
          </Button>,
          <Button
            key="resolve"
            type="primary"
            danger
            loading={isSubmitting}
            onClick={async () => {
              setDiscrepancyModalOpen(false);
              const formattedItems = poItems.map((item) => ({
                po_item_id: item.id,
                received_qty: Number(receivedInputs[item.id] ?? 0),
                item_id: item.product_id || item.item_id || null,
              }));
              await executeGRNSubmission(formattedItems);
            }}
          >
            Acknowledge & Submit GRN
          </Button>,
        ]}
      >
        <div className="py-2">
          <p className="text-sm text-gray-600 mb-3">
            The quantity entered as per GRN does not match the purchase order quantity for the following items. Please review the differences:
          </p>

          <Table
            dataSource={discrepancies}
            rowKey="id"
            pagination={false}
            size="small"
            bordered
            columns={[
              {
                title: "Product",
                dataIndex: "product_name",
                key: "product_name",
              },
              {
                title: "PO Qty",
                dataIndex: "po_qty",
                key: "po_qty",
                width: 100,
              },
              {
                title: "GRN Qty",
                dataIndex: "grn_qty",
                key: "grn_qty",
                width: 100,
              },
              {
                title: "Difference",
                key: "diff_qty",
                width: 120,
                render: (_, record) => (
                  <span
                    className={
                      record.diff_qty < 0
                        ? "text-red-600 font-semibold"
                        : "text-blue-600 font-semibold"
                    }
                  >
                    {record.diff_qty > 0 ? `+${record.diff_qty}` : record.diff_qty}{" "}
                    {record.unit || ""}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </Modal>
    </>
  );
}