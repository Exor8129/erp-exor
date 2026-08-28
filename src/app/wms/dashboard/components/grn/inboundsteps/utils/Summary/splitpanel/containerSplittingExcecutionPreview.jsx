import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  Badge,
  Table,
  InputNumber,
  Button,
  Row,
  Col,
  Card,
  Tag,
  Tooltip,
  Spin,
  message,
} from "antd";
import { Scissors, Box } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

export default function ContainerSplittingExecutionPreview({
  open,
  onClose,
  onConfirm,
  initialItems = [],
  availableContainers = [],
  containerid,
  grnItemId,
}) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);

  // State for split sub-modal
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [splitQty, setSplitQty] = useState(1);

  // Fetch item details from Supabase when modal opens
  const fetchContainerItemsDetails = useCallback(async () => {
    if (!containerid || !grnItemId) return;

    setLoading(true);

    try {
      // 1. Get container item
      const { data: containerItem, error: containerError } = await supabase
        .schema("purchase")
        .from("container_items")
        .select("id, item_id")
        .eq("container_id", containerid)
        .eq("grn_item_id", grnItemId)
        .single();

      if (containerError) throw containerError;

      console.log("Container Item:", containerItem);

      // 2. Get item name
      const { data: itemData, error: itemError } = await supabase
        .from("item_master")
        .select("item_name")
        .eq("id", containerItem.item_id)
        .single();

      if (itemError) throw itemError;

      // 3. Get container item details
      const { data: itemDetails, error: detailsErr } = await supabase
        .schema("purchase")
        .from("container_item_details")
        .select(
          `
        id,
        batch_number,
        serial_number,
        expiry_date,
        mrp,
        qty
      `,
        )
        .eq("container_item_id", containerItem.id)
        .order("created_at", { ascending: true });

      if (detailsErr) throw detailsErr;

      console.log("ITEM NAME:", itemData?.item_name);
      console.log("ITEM DETAILS:", itemDetails);

      // 4. Convert DB data into table format
      const formattedItems = (itemDetails || []).map((detail) => ({
        id: detail.id,

        itemId: containerItem.item_id,
        itemName: itemData?.item_name || "Unknown Item",

        batch: detail.batch_number || "N/A",
        expiry: detail.expiry_date || "N/A",
        mrp: detail.mrp || 0,
        serialNum: detail.serial_number || "N/A",
        qty: detail.qty || 0,

        container: "Master",
        isSplit: false,
      }));

      console.log("FORMATTED TABLE ITEMS:", formattedItems);

      setItems(formattedItems);
    } catch (err) {
      console.error("Error fetching container items:", err);
      message.error("Failed to load container item details.");
    } finally {
      setLoading(false);
    }
  }, [containerid, grnItemId]);

  useEffect(() => {
    if (open) {
      if (containerid) {
        fetchContainerItemsDetails();
      } else if (initialItems.length > 0) {
        setItems(initialItems);
      }
    }
  }, [open, containerid, grnItemId]);

  // Handle opening split modal for a specific row
  const handleOpenSplit = (record) => {
    setSelectedItem(record);
    setSplitQty(1);
    setSplitModalOpen(true);
  };

  // Perform line item splitting logic
  const handleConfirmSplit = () => {
    if (!selectedItem || splitQty <= 0 || splitQty >= selectedItem.qty) return;

    const remainingQty = selectedItem.qty - splitQty;

    const updatedItems = items.flatMap((item) => {
      if (item.id === selectedItem.id) {
        // Updated existing row with remaining quantity
        const updatedOriginal = { ...item, qty: remainingQty };

        // New split row entry
        const newSplitRow = {
          ...item,
          id: `${item.id}-split-${Date.now()}`,
          qty: splitQty,
          container: "Unassigned", // To be assigned from section 2
          isSplit: true,
        };

        return [updatedOriginal, newSplitRow];
      }
      return item;
    });

    setItems(updatedItems);
    setSplitModalOpen(false);
    setSelectedItem(null);
  };

  // Table Columns Definition
  const columns = [
    { title: "Batch", dataIndex: "batch", key: "batch" },
    { title: "Expiry", dataIndex: "expiry", key: "expiry" },
    {
      title: "MRP",
      dataIndex: "mrp",
      key: "mrp",
      render: (val) => `₹${val}`,
    },
    { title: "Serial No", dataIndex: "serialNum", key: "serialNum" },
    {
      title: "Qty",
      dataIndex: "qty",
      key: "qty",
      render: (qty) => <span className="font-bold text-slate-900">{qty}</span>,
    },
    {
      title: "Container",
      dataIndex: "container",
      key: "container",
      render: (container) => (
        <Tag color={container === "Unassigned" ? "red" : "blue"}>
          {container}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 70,
      render: (_, record) => (
        <Tooltip title="Split Qty">
          <Button
            type="text"
            icon={<Scissors size={16} className="text-amber-600" />}
            onClick={() => handleOpenSplit(record)}
            disabled={record.qty <= 1}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      {/* Main Execution Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span>Container Splitting Execution Preview</span>
            <Tag color="cyan">{items[0]?.itemName || "Unknown Item"}</Tag>
          </div>
        }
        open={open}
        onCancel={onClose}
        onOk={() => onConfirm(items)}
        okText="Confirm Execution"
        cancelText="Cancel"
        width={1200}
        centered
        destroyOnHidden
      >
        <Spin spinning={loading}>
          <div className="py-2">
            <Row gutter={16}>
              {/* LEFT SECTION: Items Table */}
              <Col span={15}>
                <Card
                  title={
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold">
                        1. Line Items & Split Allocation
                      </span>
                      <Badge
                        count={items.length}
                        overflowCount={99}
                        color="#0284c7"
                      />
                    </div>
                  }
                  size="small"
                  className="shadow-sm border-slate-200"
                >
                  <Table
                    dataSource={items}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    scroll={{ y: 340 }}
                  />
                </Card>
              </Col>

              {/* RIGHT SECTION: Available Empty Containers */}
              <Col span={9}>
                <Card
                  title={
                    <span className="text-xs font-semibold">
                      2. Available Empty Containers
                    </span>
                  }
                  extra={
                    <Button
                      type="primary"
                      size="small"
                      className="text-xs h-7"
                      // onClick={handleCreateContainer} // Add your click handler here
                    >
                      + Add Container
                    </Button>
                  }
                  size="small"
                  className="shadow-sm border-slate-200 h-full"
                >
                  <div className="space-y-2 max-h-85 overflow-y-auto pr-1">
                    {availableContainers.length > 0 ? (
                      availableContainers.map((box) => (
                        <div
                          key={box.id}
                          className="p-2.5 border border-slate-200 rounded-md bg-slate-50 hover:bg-slate-100 transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Box size={16} className="text-emerald-600" />
                              <div>
                                <div className="text-xs font-bold font-mono text-slate-800">
                                  {box.barcode || box.id}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Type: {box.type || "Standard Box"}
                                </div>
                              </div>
                            </div>
                            <Tag color="green">Empty</Tag>
                          </div>

                          {/* Split row target selector */}
                          {items.some(
                            (i) => i.isSplit && i.container === "Unassigned",
                          ) && (
                            <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-1">
                              <span className="text-[10px] text-slate-500 w-full mb-1">
                                Assign to split item:
                              </span>
                              {items
                                .filter(
                                  (i) =>
                                    i.isSplit && i.container === "Unassigned",
                                )
                                .map((unassignedItem) => (
                                  <Button
                                    key={unassignedItem.id}
                                    size="small"
                                    type="dashed"
                                    className="text-[11px] h-6 px-2"
                                    onClick={() =>
                                      handleAssignContainer(
                                        unassignedItem.id,
                                        box,
                                      )
                                    }
                                  >
                                    Assign ({unassignedItem.qty} qty)
                                  </Button>
                                ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-xs text-slate-400">
                        No empty containers available.
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        </Spin>
      </Modal>

      {/* SUB-MODAL: Split Quantity Input */}
      <Modal
        title="Split Line Item"
        open={splitModalOpen}
        onCancel={() => setSplitModalOpen(false)}
        onOk={handleConfirmSplit}
        okText="Split Item"
        cancelText="Cancel"
        width={360}
        centered
      >
        {selectedItem && (
          <div className="py-2 space-y-3">
            <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
              <div>
                <span className="text-slate-500">Item:</span>{" "}
                <span className="font-semibold text-slate-800">
                  {selectedItem.itemName}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Available Qty:</span>{" "}
                <span className="font-bold text-slate-900">
                  {selectedItem.qty}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Enter Qty to Split Out:
              </label>
              <InputNumber
                min={1}
                max={selectedItem.qty - 1}
                value={splitQty}
                onChange={(val) => setSplitQty(val || 1)}
                className="w-full"
              />
            </div>

            <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>
                Original Remaining:{" "}
                <strong className="text-slate-800">
                  {selectedItem.qty - splitQty}
                </strong>
              </span>
              <span>
                New Split Row:{" "}
                <strong className="text-amber-600">{splitQty}</strong>
              </span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
