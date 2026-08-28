"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Drawer,
  Tabs,
  Table,
  Progress,
  Button,
  Tag,
  Input,
  InputNumber,
  Space,
  Modal,
  message,
  Popconfirm,
  Badge,
  Card,
  Divider,
} from "antd";
import {
  SyncOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  ScissorOutlined,
  PrinterOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  BarcodeOutlined,
  ScanOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { supabase } from "../../../../../../../lib/supabase";
import BarcodeLabelModal from "../../../../../../../components/BarcodeLabelModal";

export default function PackingControlDrawer({
  isDrawerOpen,
  setIsDrawerOpen,
  totalPendingCount = 0,
  pendingSummaryList = [],
  savedContainers = [],
  loadingContainers = false,
  fetchSavedContainersAndTotals,
  activeContainer,
  setActiveContainer,
  fetchContainerItems,
}) {
  // --- Split Tab Core State ---
  const [selectedSourceContainer, setSelectedSourceContainer] = useState(null);
  const [sourceItems, setSourceItems] = useState([]);
  const [loadingSourceItems, setLoadingSourceItems] = useState(false);

  // Split Staging States
  const [draftQtys, setDraftQtys] = useState({}); // { [container_item_id]: qtyToMove }
  const [isStaged, setIsStaged] = useState(false);
  const [targetBarcode, setTargetBarcode] = useState("");
  const [splitting, setSplitting] = useState(false);

  // Barcode / Label Modal State
  const [bulkCount, setBulkCount] = useState(1);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState(null);

  // Fetch items inside selected container
  const loadSourceContainerItems = useCallback(async (containerId) => {
    if (!containerId) return;
    try {
      setLoadingSourceItems(true);
      const { data, error } = await supabase
        .schema("purchase")
        .from("container_items")
        .select(
          `
          id,
          grn_item_id,
          accepted_qty,
          rejected_qty,
          grn_items (
            id,
            purchase_order_items (
              product_name,
              product_code
            )
          )
        `
        )
        .eq("container_id", containerId);

      if (error) throw error;

      const formatted = (data || []).map((row) => ({
        container_item_id: row.id,
        grn_item_id: row.grn_item_id,
        item_name:
          row.grn_items?.purchase_order_items?.product_name || "Unknown Item",
        item_code: row.grn_items?.purchase_order_items?.product_code || "N/A",
        available_qty: Number(row.accepted_qty || 0),
      }));

      setSourceItems(formatted);
      setDraftQtys({});
      setIsStaged(false);
      setTargetBarcode("");
    } catch (err) {
      console.error("Error fetching source container items:", err);
      message.error("Failed to load container items.");
    } finally {
      setLoadingSourceItems(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSourceContainer?.id) {
      loadSourceContainerItems(selectedSourceContainer.id);
    } else {
      setSourceItems([]);
      setDraftQtys({});
      setIsStaged(false);
    }
  }, [selectedSourceContainer, loadSourceContainerItems]);

  // Handle stage split calculation
  const handleStageSplit = () => {
    const hasItemsToMove = Object.values(draftQtys).some((q) => q > 0);
    if (!hasItemsToMove) {
      message.warning("Please specify at least one quantity to split.");
      return;
    }
    setIsStaged(true);
  };

  // Reset staging back to editing quantities
  const handleUnstage = () => {
    setIsStaged(false);
  };

  // Assign to Target Container and execute DB operation
  const handleAssignAndExecuteSplit = async () => {
    const cleanCode = targetBarcode.trim().toUpperCase();
    if (!cleanCode) {
      message.warning("Please enter or scan a target container code.");
      return;
    }

    try {
      setSplitting(true);

      // Check if target container exists
      let { data: destContainer, error: destError } = await supabase
        .schema("purchase")
        .from("containers")
        .select("id, barcode")
        .eq("barcode", cleanCode)
        .maybeSingle();

      if (destError) throw destError;

      // If container exists, check if it already has items inside
      if (destContainer) {
        const { data: destItems, error: itemsErr } = await supabase
          .schema("purchase")
          .from("container_items")
          .select("id, accepted_qty")
          .eq("container_id", destContainer.id);

        if (itemsErr) throw itemsErr;

        if (destItems && destItems.length > 0) {
          const totalExistingQty = destItems.reduce(
            (acc, curr) => acc + Number(curr.accepted_qty || 0),
            0
          );

          // Prompt confirmation if destination is not empty
          let confirmed = false;
          await new Promise((resolve) => {
            Modal.confirm({
              title: "Existing Container Detected",
              icon: <ExclamationCircleOutlined className="text-amber-500" />,
              content: `Container "${cleanCode}" already contains ${destItems.length} item type(s) (${totalExistingQty} total units). Do you want to merge these staged items into this container?`,
              okText: "Yes, Merge Items",
              cancelText: "Cancel",
              onOk: () => {
                confirmed = true;
                resolve();
              },
              onCancel: () => {
                confirmed = false;
                resolve();
              },
            });
          });

          if (!confirmed) {
            setSplitting(false);
            return;
          }
        }
      } else {
        // Create new container if it doesn't exist
        const { data: createdContainer, error: createErr } = await supabase
          .schema("purchase")
          .from("containers")
          .insert({
            barcode: cleanCode,
            grn_id: selectedSourceContainer.grn_id,
            status: "ACTIVE",
          })
          .select("id, barcode")
          .single();

        if (createErr) throw createErr;
        destContainer = createdContainer;
      }

      // Perform Item Quantities Transfer
      const itemsToMove = sourceItems.filter(
        (item) => (draftQtys[item.container_item_id] || 0) > 0
      );

      for (const item of itemsToMove) {
        const qtyToMove = draftQtys[item.container_item_id];
        const remainingQty = item.available_qty - qtyToMove;

        // Deduct/Delete from Source
        if (remainingQty <= 0) {
          await supabase
            .schema("purchase")
            .from("container_items")
            .delete()
            .eq("id", item.container_item_id);
        } else {
          await supabase
            .schema("purchase")
            .from("container_items")
            .update({ accepted_qty: remainingQty })
            .eq("id", item.container_item_id);
        }

        // Add to Destination Container
        const { data: existingDestItem } = await supabase
          .schema("purchase")
          .from("container_items")
          .select("id, accepted_qty")
          .eq("container_id", destContainer.id)
          .eq("grn_item_id", item.grn_item_id)
          .maybeSingle();

        if (existingDestItem) {
          await supabase
            .schema("purchase")
            .from("container_items")
            .update({
              accepted_qty: Number(existingDestItem.accepted_qty) + qtyToMove,
            })
            .eq("id", existingDestItem.id);
        } else {
          await supabase.schema("purchase").from("container_items").insert({
            container_id: destContainer.id,
            grn_item_id: item.grn_item_id,
            accepted_qty: qtyToMove,
            rejected_qty: 0,
          });
        }
      }

      message.success(`Successfully mapped items to "${cleanCode}"!`);

      // Refresh drawer state and containers list
      await fetchSavedContainersAndTotals();

      // Check if Master Container was emptied out
      const { data: remainingMasterItems } = await supabase
        .schema("purchase")
        .from("container_items")
        .select("id")
        .eq("container_id", selectedSourceContainer.id);

      if (!remainingMasterItems || remainingMasterItems.length === 0) {
        message.info(
          `Master container ${selectedSourceContainer.barcode} is now empty. Auto-removing record.`
        );
        await supabase
          .schema("purchase")
          .from("containers")
          .delete()
          .eq("id", selectedSourceContainer.id);

        setSelectedSourceContainer(null);
        await fetchSavedContainersAndTotals();
      } else {
        // Reload items for next potential split round
        await loadSourceContainerItems(selectedSourceContainer.id);
      }
    } catch (err) {
      console.error("Error executing split mapping:", err);
      message.error(`Split failed: ${err.message}`);
    } finally {
      setSplitting(false);
    }
  };

  // Open barcode generator modal
  const handleOpenBarcodeModal = () => {
    if (!selectedSourceContainer) {
      message.warning("Please select a master container first.");
      return;
    }

    const grnNo =
      selectedSourceContainer.grn_number ||
      selectedSourceContainer.barcode?.split("-")[1] ||
      "GRN-2026-001";

    setSelectedGrn({
      id: selectedSourceContainer.grn_id || selectedSourceContainer.id,
      grn_no: grnNo,
    });
    setIsModalVisible(true);
  };

  // Trash Empty Source Container
  const handleTrashContainer = async (containerId) => {
    try {
      const { error } = await supabase
        .schema("purchase")
        .from("containers")
        .delete()
        .eq("id", containerId);

      if (error) throw error;

      message.success("Container removed.");
      setSelectedSourceContainer(null);
      await fetchSavedContainersAndTotals();
    } catch (err) {
      console.error("Error deleting container:", err);
      message.error("Failed to delete container.");
    }
  };

  // Finish Split Flow
  const handleFinishSplit = () => {
    setSelectedSourceContainer(null);
    setDraftQtys({});
    setIsStaged(false);
    setTargetBarcode("");
    message.success("Container split session completed.");
  };

  const handleCheck=()=>{
    console.log("Fetched container Items:",pendingSummaryList);
  }

  return (
    <Drawer
      title="GRN Packing Control Panel"
      placement="right"
      size={560}
      onClose={() => setIsDrawerOpen(false)}
      open={isDrawerOpen}
    >
      <Tabs
        defaultActiveKey="pending"
        items={[
          {
            key: "pending",
            label: `Pending Items (${totalPendingCount})`,
            children: (
              <div>
              <Table
                dataSource={pendingSummaryList}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: "Item Name",
                    dataIndex: "item_name",
                    render: (text, r) => (
                      <div>
                        <div className="font-semibold text-slate-800 text-xs">
                          {text}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.item_code}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "Expected",
                    dataIndex: "expected_qty",
                    width: 75,
                    align: "center",
                    render: (v) => (
                      <span className="font-mono text-xs">{v}</span>
                    ),
                  },
                  {
                    title: "Received",
                    dataIndex: "packed_qty",
                    width: 75,
                    align: "center",
                    render: (v) => (
                      <span className="font-mono text-xs text-emerald-600 font-semibold">
                        {v}
                      </span>
                    ),
                  },
                  {
                    title: "Pending",
                    dataIndex: "pending_qty",
                    width: 75,
                    align: "center",
                    render: (v) => (
                      <span
                        className={`font-mono text-xs font-bold ${
                          v > 0 ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {v}
                      </span>
                    ),
                  },
                  {
                    title: "Status",
                    key: "status",
                    width: 90,
                    render: (_, r) => (
                      <Progress
                        percent={r.percent}
                        size="small"
                        status={r.percent === 100 ? "success" : "active"}
                      />
                    ),
                  },
                ]}
              />
              <button 
              onClick={handleCheck}
              >Check</button>
              </div>
            ),
          },
          {
            key: "saved_containers",
            label: `Saved Containers (${savedContainers.length})`,
            children: (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Click a container below to switch to it:</span>
                  <Button
                    type="text"
                    icon={<SyncOutlined spin={loadingContainers} />}
                    size="small"
                    onClick={fetchSavedContainersAndTotals}
                  >
                    Refresh
                  </Button>
                </div>

                {savedContainers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <FolderOpenOutlined className="text-3xl mb-1" />
                    <p className="text-xs">
                      No saved containers yet. Scan a container, add items, and
                      click <b>Save Container Items</b> to reveal it here.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-1">
                    {savedContainers.map((container) => {
                      const isActive = activeContainer?.id === container.id;
                      return (
                        <Tag.CheckableTag
                          key={container.id}
                          checked={isActive}
                          onChange={() => {
                            setActiveContainer(container);
                            fetchContainerItems(container.id);
                            setIsDrawerOpen(false);
                          }}
                          className={`px-3 py-1.5 text-xs font-mono rounded-md border cursor-pointer transition-all ${
                            isActive
                              ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs"
                              : "bg-white text-slate-700 border-slate-300 hover:border-emerald-400 hover:text-emerald-700"
                          }`}
                        >
                          {isActive && (
                            <CheckCircleOutlined className="mr-1" />
                          )}
                          {container.barcode}
                        </Tag.CheckableTag>
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "split_container",
            label: (
              <span>
                <ScissorOutlined className="mr-1" />
                Split Container
              </span>
            ),
            children: (
              <div className="space-y-4 text-xs">
                {/* STEP 1: SELECT CONTAINER */}
                <div>
                  <div className="font-semibold text-slate-700 mb-1 flex justify-between items-center">
                    <span>1. Select Master Container to Split From:</span>
                    {selectedSourceContainer && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        className="bg-emerald-600 hover:bg-emerald-500 text-[11px]"
                        onClick={handleFinishSplit}
                      >
                        Finish Split Session
                      </Button>
                    )}
                  </div>
                  {savedContainers.length === 0 ? (
                    <div className="text-slate-400 italic">
                      No saved containers available.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {savedContainers.map((c) => {
                        const isSelected = selectedSourceContainer?.id === c.id;
                        return (
                          <Tag.CheckableTag
                            key={c.id}
                            checked={isSelected}
                            onChange={() => setSelectedSourceContainer(c)}
                            className={`px-3 py-1 text-xs font-mono rounded border cursor-pointer ${
                              isSelected
                                ? "bg-amber-500 text-white border-amber-500 font-bold"
                                : "bg-slate-50 text-slate-700 border-slate-300"
                            }`}
                          >
                            {c.barcode}
                          </Tag.CheckableTag>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedSourceContainer && (
                  <div className="space-y-4">
                    {/* STEP 2: QUANTITY ADJUSTMENT VIEW */}
                    {!isStaged ? (
                      <Card
                        size="small"
                        className="bg-white border-slate-200"
                        title={
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700">
                              2. Specify Quantities to Split Out:
                            </span>
                            {sourceItems.length === 0 &&
                              !loadingSourceItems && (
                                <Popconfirm
                                  title="Delete Empty Master Container?"
                                  onConfirm={() =>
                                    handleTrashContainer(
                                      selectedSourceContainer.id
                                    )
                                  }
                                >
                                  <Button
                                    danger
                                    type="text"
                                    size="small"
                                    icon={<DeleteOutlined />}
                                  >
                                    Trash Master
                                  </Button>
                                </Popconfirm>
                              )}
                          </div>
                        }
                      >
                        <Table
                          dataSource={sourceItems}
                          rowKey="container_item_id"
                          loading={loadingSourceItems}
                          pagination={false}
                          size="small"
                          columns={[
                            {
                              title: "Item Name",
                              dataIndex: "item_name",
                              render: (text, r) => (
                                <div>
                                  <div className="font-medium text-slate-800">
                                    {text}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {r.item_code} | Available: {r.available_qty}
                                  </div>
                                </div>
                              ),
                            },
                            {
                              title: "Split Qty",
                              key: "split_qty",
                              width: 110,
                              render: (_, r) => (
                                <InputNumber
                                  min={0}
                                  max={r.available_qty}
                                  value={draftQtys[r.container_item_id] || 0}
                                  onChange={(val) => {
                                    const sanitized = Math.min(
                                      Math.max(0, Number(val) || 0),
                                      r.available_qty
                                    );
                                    setDraftQtys((prev) => ({
                                      ...prev,
                                      [r.container_item_id]: sanitized,
                                    }));
                                  }}
                                  size="small"
                                  className="w-full font-mono"
                                />
                              ),
                            },
                          ]}
                        />

                        <div className="mt-3 flex justify-end">
                          <Button
                            type="primary"
                            icon={<ScissorOutlined />}
                            onClick={handleStageSplit}
                            className="bg-amber-600 hover:bg-amber-500 border-none"
                            disabled={
                              !Object.values(draftQtys).some((q) => q > 0)
                            }
                          >
                            Stage Items for Split
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      /* STEP 3: STAGED REVIEWS & CONTAINER ASSIGNMENT */
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-700">
                            3. Review Staged Split & Assign Container
                          </span>
                          <Button
                            size="small"
                            type="default"
                            icon={<RedoOutlined />}
                            onClick={handleUnstage}
                          >
                            Re-adjust Qtys
                          </Button>
                        </div>

                        {/* STAGED SPLIT CARDS / TABLES */}
                        <div className="grid grid-cols-1 gap-3">
                          {/* CARD A: STAGED SPLIT ITEMS */}
                          <Card
                            size="small"
                            className="border-amber-300 bg-amber-50/40"
                            title={
                              <span className="text-amber-800 font-semibold text-xs flex items-center gap-1">
                                <ScissorOutlined /> Staged Items (To New
                                Container)
                              </span>
                            }
                          >
                            <Table
                              dataSource={sourceItems.filter(
                                (i) => draftQtys[i.container_item_id] > 0
                              )}
                              rowKey="container_item_id"
                              pagination={false}
                              size="small"
                              columns={[
                                {
                                  title: "Item",
                                  dataIndex: "item_name",
                                  render: (t, r) => (
                                    <span className="font-medium text-slate-800">
                                      {t}
                                    </span>
                                  ),
                                },
                                {
                                  title: "Split Qty",
                                  key: "qty",
                                  width: 90,
                                  align: "center",
                                  render: (_, r) => (
                                    <Badge
                                      count={draftQtys[r.container_item_id]}
                                      style={{ backgroundColor: "#d97706" }}
                                    />
                                  ),
                                },
                              ]}
                            />
                          </Card>

                          {/* CARD B: REMAINING IN MASTER */}
                          <Card
                            size="small"
                            className="border-slate-200 bg-slate-50"
                            title={
                              <span className="text-slate-700 font-semibold text-xs">
                                Remaining in Master (
                                {selectedSourceContainer.barcode})
                              </span>
                            }
                          >
                            <Table
                              dataSource={sourceItems
                                .map((i) => ({
                                  ...i,
                                  remQty:
                                    i.available_qty -
                                    (draftQtys[i.container_item_id] || 0),
                                }))
                                .filter((i) => i.remQty > 0)}
                              rowKey="container_item_id"
                              pagination={false}
                              size="small"
                              columns={[
                                {
                                  title: "Item",
                                  dataIndex: "item_name",
                                  render: (t) => (
                                    <span className="text-slate-600">{t}</span>
                                  ),
                                },
                                {
                                  title: "Remaining Qty",
                                  dataIndex: "remQty",
                                  width: 100,
                                  align: "center",
                                  render: (v) => (
                                    <span className="font-mono text-emerald-600 font-semibold">
                                      {v}
                                    </span>
                                  ),
                                },
                              ]}
                            />
                          </Card>
                        </div>

                        {/* STEP 4: SCAN OR ASSIGN TARGET CONTAINER CODE */}
                        <Card
                          size="small"
                          className="bg-emerald-50/50 border-emerald-200"
                          title={
                            <span className="font-semibold text-slate-700 flex items-center gap-1 text-xs">
                              <ScanOutlined className="text-emerald-600" />
                              4. Scan/Enter Target Container Barcode:
                            </span>
                          }
                        >
                          <div className="space-y-2">
                            <Space.Compact style={{ width: "100%" }}>
                              <Input
                                placeholder="Scan or type Container Tag..."
                                value={targetBarcode}
                                onChange={(e) =>
                                  setTargetBarcode(e.target.value)
                                }
                                onPressEnter={handleAssignAndExecuteSplit}
                                className="font-mono"
                                autoFocus
                              />
                              <Button
                                type="primary"
                                icon={<ArrowRightOutlined />}
                                loading={splitting}
                                onClick={handleAssignAndExecuteSplit}
                                className="bg-emerald-600 hover:bg-emerald-500 border-none"
                                disabled={!targetBarcode.trim()}
                              >
                                Assign & Move
                              </Button>
                            </Space.Compact>

                            <div className="flex justify-between items-center pt-1 text-[11px] text-slate-500">
                              <span>Don't have a container tag?</span>
                              <Button
                                type="link"
                                size="small"
                                icon={<BarcodeOutlined />}
                                className="p-0 text-amber-600 font-semibold"
                                onClick={handleOpenBarcodeModal}
                              >
                                Create & Print New Split Tag
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* BARCODE GENERATOR MODAL */}
      <BarcodeLabelModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        grnId={selectedGrn?.id}
        labelType={"split"}
        boxCount={bulkCount}
      />
    </Drawer>
  );
}