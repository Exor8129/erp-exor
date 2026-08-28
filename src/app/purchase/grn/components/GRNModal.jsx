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
} from "antd";
import dayjs from "dayjs";
import { supabase } from "../../../lib/supabase";

export default function GRNModal({ open, onClose, po, items, setItems }) {
  // 1. Local state to manage metadata fields
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(null);
  const [transporterId, setTransporterId] = useState(null); 
  const [boxesReceived, setBoxesReceived] = useState(0); 

  // Transporters master dropdown state
  const [transporters, setTransporters] = useState([]);
  const [loadingTransporters, setLoadingTransporters] = useState(false);

  // 2. Local state to manage the dynamic "Receive Now" inputs
  const [receivedInputs, setReceivedInputs] = useState({});
  const [mode, setMode] = useState("create"); // create | edit
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [existingGRNs, setExistingGRNs] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset inputs when the modal opens or switches PO items
  useEffect(() => {
    if (open) {
      setReceivedInputs({});
      setInvoiceNo("");
      setInvoiceDate(null);
      setTransporterId(null);
      setBoxesReceived(0);
      fetchTransporters();
      fetchExistingGRNs();
    }
  }, [open, items]);

  const handleGRNChange = async (grnId) => {
    try {
      setSelectedGRN(grnId);

      // Fetch GRN Header
      const { data: header, error: headerError } = await supabase
        .schema("purchase")
        .from("grn")
        .select("*")
        .eq("id", grnId)
        .single();

      if (headerError) throw headerError;

      // Fetch GRN Items
      const { data: details, error: detailsError } = await supabase
        .schema("purchase")
        .from("grn_items")
        .select("*")
        .eq("grn_id", grnId);

      if (detailsError) throw detailsError;

      // Populate Header Fields
      setInvoiceNo(header.invoice_no || "");
      setInvoiceDate(header.invoice_date ? dayjs(header.invoice_date) : null);
      setBoxesReceived(header.boxes_received ?? 0);

      // Find transporter ID
      const transporter = transporters.find(
        (t) => t.transporter_name === header.transporter_name
      );
      setTransporterId(transporter ? transporter.id : null);

      // Populate Received Qty
      const qtyMap = {};
      (details || []).forEach((item) => {
        qtyMap[item.po_item_id] = Number(item.received_qty);
      });
      setReceivedInputs(qtyMap);

    } catch (err) {
      console.error("Error loading GRN:", err);
      alert("Failed to load selected GRN.");
    }
  };

  // Fetch transporters from the public schema master list
  const fetchTransporters = async () => {
    try {
      setLoadingTransporters(true);
      const { data, error } = await supabase
        .from("transporters")
        .select("id, transporter_name")
        .eq("active", true)
        .order("transporter_name");

      if (error) throw error;
      setTransporters(data || []);
    } catch (err) {
      console.error("Error fetching transporters:", err);
    } finally {
      setLoadingTransporters(false);
    }
  };

  const fetchExistingGRNs = async () => {
    const { data, error } = await supabase
      .schema("purchase")
      .from("grn")
      .select("id, grn_no, received_date")
      .eq("po_id", po.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setExistingGRNs(data || []);
    }
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

    // Call the database function instead of direct table modification
    const { error } = await supabase.rpc("delete_grn_with_items", {
      p_grn_id: selectedGRN,
    });

    if (error) throw error;

    alert("GRN Deleted Successfully!");
    
    // Reset layout states back to fresh create mode
    setMode("create");
    setSelectedGRN(null);
    setReceivedInputs({});
    setInvoiceNo("");
    setInvoiceDate(null);
    setTransporterId(null);
    setBoxesReceived(0);
    
    // Refresh the local dropdown lists
    fetchExistingGRNs();
    
  } catch (err) {
    console.error("Error deleting GRN:", err);
    alert(err.message || "Failed to delete the GRN.");
  } finally {
    setIsDeleting(false);
  }
};

  const handleCreateGRN = async () => {
    if (!(invoiceNo ?? "").trim()) {
      return alert("Supplier Invoice No is required");
    }
    if (!invoiceDate) {
      return alert("Invoice Date is required");
    }
    if (!transporterId) {
      return alert("Please select Transporter");
    }
    if (boxesReceived <= 0) {
      return alert("Boxes Received is required");
    }

    const entries = Object.entries(receivedInputs).filter(
      ([_, qty]) => Number(qty) > 0
    );

    if (!entries.length) {
      return alert("Enter at least one received quantity.");
    }

   const formattedItems = entries.map(([itemId, qty]) => {
  // Find the original item from props matching this po_item_id
  const selectedItem = items.find((item) => item.id === itemId);

  return {
    po_item_id: itemId,
    received_qty: Number(qty),
    // Fall back to item_id directly if product_id is not present on the record
    item_id: selectedItem?.product_id || selectedItem?.item_id || null, 
  };
});
    try {
      let result;

      if (mode === "create") {
        result = await supabase.rpc("create_grn_with_items", {
          p_po_id: po.id,
          p_supplier_id: po.supplier_id,
          p_transporter_id: transporterId,
          p_boxes_received: boxesReceived,
          p_invoice_no: invoiceNo,
          p_invoice_date: invoiceDate.format("YYYY-MM-DD"),
          p_items: formattedItems,
        });
      } else {
        result = await supabase.rpc("update_grn_with_items", {
          p_grn_id: selectedGRN,
          p_transporter_id: transporterId,
          p_boxes_received: boxesReceived,
          p_invoice_no: invoiceNo,
          p_invoice_date: invoiceDate.format("YYYY-MM-DD"),
          p_items: formattedItems,
        });
      }

      if (result.error) throw result.error;

      alert(
        mode === "create"
          ? "GRN Created Successfully!"
          : "GRN Updated Successfully!"
      );

      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // Build Footer Actions Array dynamically
  const footerButtons = [
    <Button key="back" onClick={onClose}>
      Cancel
    </Button>
  ];

  // Inject structural Delete Button on the left layout if criteria are met
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
        <Button danger type="dashed" className="float-left">
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
      onClick={handleCreateGRN}
    >
      {mode === "create" ? "Submit GRN" : "Update GRN"}
    </Button>
  );

  return (
    <Modal
      title="Create Goods Received Note"
      open={open}
      onCancel={onClose}
      width={1200}
      footer={footerButtons}
    >
      {/* ================= PO HEADER ================= */}
      <div>
        {/* Mode Selection Buttons */}
        <div className="flex gap-3 mb-4">
          <Button
            type={mode === "create" ? "primary" : "default"}
            onClick={() => {
              setMode("create");
              setSelectedGRN(null);
              setReceivedInputs({});
              setInvoiceNo("");
              setInvoiceDate(null);
              setTransporterId(null);
              setBoxesReceived(0);
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
        
        {mode === "edit" && (
          <div className="mb-5">
            <label className="text-xs text-gray-500 block mb-1">
              Select GRN
            </label>
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

        {/* Clean 6-Column Data Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border">
          <div>
            <label className="text-xs text-gray-500 block">PO Number</label>
            <div className="font-semibold">{po?.po_number || "-"}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Supplier</label>
            <div className="font-semibold">
              {po?.vendors?.vendor_name || "-"}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Status</label>
            <div className="font-semibold">{po?.status || "-"}</div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block">Total Items</label>
            <div className="font-semibold">{items?.length || 0}</div>
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
      </div>

      {/* ================= GRN ENTRY FIELDS ================= */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            Supplier Invoice No
          </label>
          <Input
            placeholder="Enter invoice number"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            Invoice Date
          </label>
          <DatePicker
            className="w-full"
            value={invoiceDate}
            onChange={(date) => setInvoiceDate(date)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            Transport Name
          </label>
          <Select
            className="w-full"
            placeholder="Select Transporter"
            loading={loadingTransporters}
            value={transporterId}
            onChange={(val) => setTransporterId(val)}
            options={transporters.map((t) => ({
              value: t.id,
              label: t.transporter_name,
            }))}
            allowClear
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            No. of Boxes Received
          </label>
          <InputNumber
            className="w-full"
            min={0}
            placeholder="0"
            value={boxesReceived}
            onChange={(val) => setBoxesReceived(val)}
          />
        </div>
      </div>

      {/* ================= PO ITEMS TABLE ================= */}
      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm font-semibold mb-3">Purchase Order Items</div>
        <Table
          dataSource={items}
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
              title: "Balance Qty",
              key: "balance_qty",
              width: 140,
              render: (_, record) => (
                <span className="font-semibold text-orange-600">
                  {record.balance_qty} {record.unit}
                </span>
              ),
            },
            {
              title: "Receive Now",
              key: "receive_now",
              width: 180,
              render: (_, record) => (
                <InputNumber
                  min={0}
                  value={receivedInputs[record.id] || null}
                  onChange={(val) => handleQtyChange(record.id, val)}
                  className="w-full"
                  placeholder="Qty"
                />
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}