"use client";

import React, { useState, useEffect } from "react";
import {
  Drawer,
  Select,
  Table,
  Tag,
  Space,
  Button,
  Card,
  Statistic,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  BugOutlined,
  PlusOutlined,
  ContainerOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { supabase } from "../../../../../../../lib/supabase";
import SplitDrawer from "./splitpanel/split";

const SummaryDrawer = ({ open, onClose, onSuccess, grnId }) => {
  const [grnItems, setGrnItems] = useState([]);
  const [selectedGrnItemId, setSelectedGrnItemId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [containerItems, setContainerItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [isSplitOpen,setIsSplitOpen]=useState(false);

  useEffect(() => {
    if (open) {
      setSelectedGrnItemId(null);
      setSelectedItem(null);
      setContainerItems([]);
      fetchGrnItems();
    }
  }, [open, grnId]);

  // Fetch container items whenever selected item changes
  useEffect(() => {
    if (selectedGrnItemId) {
      const item = grnItems.find((i) => i.id === selectedGrnItemId);
      setSelectedItem(item || null);
      fetchContainerItems(selectedGrnItemId);
    } else {
      setSelectedItem(null);
      setContainerItems([]);
    }
  }, [selectedGrnItemId, grnItems]);

  // 1. Fetch GRN Items and join item master
  const fetchGrnItems = async () => {
    if (!grnId) {
      setGrnItems([]);
      return;
    }

    setLoadingItems(true);

    try {
      const { data: grnItemsData, error: grnItemsError } = await supabase
        .schema("purchase")
        .from("grn_items")
        .select(`id, grn_id, po_item_id, received_qty, expected_qty, item_id, created_at`)
        .eq("grn_id", grnId);

      if (grnItemsError) throw grnItemsError;
      if (!grnItemsData || grnItemsData.length === 0) {
        setGrnItems([]);
        return;
      }

      const itemIds = [
        ...new Set(grnItemsData.map((item) => item.item_id).filter(Boolean)),
      ];

      const { data: itemMasterData, error: itemMasterError } = await supabase
        .from("item_master")
        .select("id, item_name")
        .in("id", itemIds);

      if (itemMasterError) throw itemMasterError;

      const itemMap = new Map(
        (itemMasterData || []).map((item) => [item.id, item.item_name])
      );

      const formattedItems = grnItemsData.map((item) => ({
        ...item,
        item_name: itemMap.get(item.item_id) || "Unknown Item",
        grn_expected_qty: Number(item.expected_qty ?? item.received_qty ?? 0),
      }));

      setGrnItems(formattedItems);
    } catch (error) {
      console.error("Error fetching GRN items:", error);
      setGrnItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // 2. Fetch Container Items breakdown joined with container_item_details
  const fetchContainerItems = async (grnItemId) => {
    setLoadingContainers(true);
    try {
      const { data, error } = await supabase
        .schema("purchase")
        .from("container_items")
        .select(`
          id,
          container_id,
          grn_item_id,
          accepted_qty,
          rejected_qty,
          reject_reason,
          remarks,
          containers (
            id,
            barcode
          ),
          container_item_details (
            id,
            batch_number,
            serial_number,
            expiry_date,
            mrp,
            qty
          )
        `)
        .eq("grn_item_id", grnItemId);

      if (error) throw error;

      // Process and extract distinct batches, serials, and dates per container item
      const formattedContainerItems = (data || []).map((ci) => {
        const details = ci.container_item_details || [];
        
        const batches = [
          ...new Set(details.map((d) => d.batch_number).filter(Boolean)),
        ];
        const serials = [
          ...new Set(details.map((d) => d.serial_number).filter(Boolean)),
        ];
        const expiryDates = [
          ...new Set(details.map((d) => d.expiry_date).filter(Boolean)),
        ];

        return {
          ...ci,
          batches,
          serials,
          expiryDates,
          detailsCount: details.length,
        };
      });

      setContainerItems(formattedContainerItems);
    } catch (error) {
      console.error("Error fetching container items and details:", error);
      setContainerItems([]);
    } finally {
      setLoadingContainers(false);
    }
  };

  // Calculate totals across containers
  const totalAcceptedQty = containerItems.reduce(
    (sum, item) => sum + Number(item.accepted_qty || 0),
    0
  );
  const totalRejectedQty = containerItems.reduce(
    (sum, item) => sum + Number(item.rejected_qty || 0),
    0
  );
  const expectedQty = selectedItem?.received_qty || 0;
  const qtyDifference = totalAcceptedQty - expectedQty;

  // Container table schema
  const containerColumns = [
    {
      title: "Container",
      key: "container",
      render: (_, record) => (
        <Space>
          <ContainerOutlined className="text-slate-400" />
          <span className="font-medium">
            {record.containers?.barcode || `Container #${record.container_id.slice(0, 8)}`}
          </span>
        </Space>
      ),
    },
    {
      title: "Batches",
      key: "batches",
      render: (_, record) => (
        <span className="text-xs text-slate-700">
          {record.batches?.length > 0 ? (
            record.batches.map((batch) => (
              <Tag key={batch} color="blue" className="mr-1 mb-1">
                {batch}
              </Tag>
            ))
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </span>
      ),
    },
    {
      title: "Serial Numbers",
      key: "serials",
      render: (_, record) => {
        if (!record.serials || record.serials.length === 0) {
          return <span className="text-xs text-slate-400">-</span>;
        }

        if (record.serials.length <= 2) {
          return (
            <span className="text-xs text-slate-700">
              {record.serials.join(", ")}
            </span>
          );
        }

        return (
          <Tooltip title={record.serials.join(", ")}>
            <Tag color="purple" className="cursor-pointer">
              {record.serials.length} Serials <InfoCircleOutlined />
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Accepted Qty (Received)",
      dataIndex: "accepted_qty",
      key: "accepted_qty",
      align: "right",
      render: (val) => <span className="font-semibold text-emerald-600">{Number(val || 0)}</span>,
    },
    {
      title: "Rejected Qty",
      dataIndex: "rejected_qty",
      key: "rejected_qty",
      align: "right",
      render: (val) => (
        <span className={Number(val) > 0 ? "font-semibold text-rose-600" : "text-slate-400"}>
          {Number(val || 0)}
        </span>
      ),
    },
    {
      title: "Remarks / Reason",
      key: "remarks",
      render: (_, record) => (
        <span className="text-xs text-slate-500">
          {record.reject_reason || record.remarks || "-"}
        </span>
      ),
    },
  ];

  const handleTest=()=>{
    console.log("SelectedItem:",selectedItem);
  }

 

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2 text-slate-700">
          <BugOutlined className="text-blue-600" />
          <span className="font-semibold text-sm">Inbound Discrepancy Engine</span>
        </div>
      }
      size={800}
      open={open}
      onClose={onClose}
      destroyOnHidden
      className="text-slate-800"
    >
      <div className="space-y-4">
        {/* Step 1: Dropdown Selection */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
          <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
            1. Select an item from dropdown
          </label>
          <Select
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            loading={loadingItems}
            className="w-full"
            placeholder="Choose an item"
            value={selectedGrnItemId}
            onChange={(value) => setSelectedGrnItemId(value)}
            options={grnItems.map((item) => ({
              value: item.id,
              label: item.item_name,
            }))}
          />
        </div>

        {/* Step 2: Item Summary Cards & Container Breakdown Table */}
        {selectedItem && (
          <div className="space-y-4">
            {/* Aggregate Metrics Bar */}
            <Row gutter={12}>
              <Col span={6}>
                <Card size="small" className="bg-slate-50 border-slate-200">
                  <Statistic
                    title={<span className="text-xs font-medium text-slate-500">Expected (GRN)</span>}
                    value={expectedQty}
                    valueStyle={{ fontSize: "16px", fontWeight: 600 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" className="bg-emerald-50/50 border-emerald-200">
                  <Statistic
                    title={<span className="text-xs font-medium text-emerald-700">Total Received</span>}
                    value={totalAcceptedQty}
                    valueStyle={{ fontSize: "16px", fontWeight: 600, color: "#059669" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" className="bg-rose-50/50 border-rose-200">
                  <Statistic
                    title={<span className="text-xs font-medium text-rose-700">Total Rejected</span>}
                    value={totalRejectedQty}
                    valueStyle={{ fontSize: "16px", fontWeight: 600, color: "#dc2626" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" className="bg-slate-50 border-slate-200">
                  <div className="text-xs font-medium text-slate-500 mb-1">Difference</div>
                  <Tag
                    color={qtyDifference < 0 ? "volcano" : qtyDifference > 0 ? "green" : "blue"}
                    className="font-bold text-sm px-2 py-0.5"
                  >
                    {qtyDifference > 0 ? `+${qtyDifference}` : qtyDifference}
                  </Tag>
                </Card>
              </Col>
            </Row>

            {/* Container Breakdown Table */}
            <div className="p-4 bg-white border border-slate-200 rounded-md space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Container Breakdown: {selectedItem.item_name}
                </span>
                <Button type="primary" size="small" icon={<PlusOutlined />}
                 onClick={() => setIsSplitOpen(prev => !prev)}
                >
                  Open Discrepancy Panel
                </Button>
                <Button onClick={handleTest}>Test</Button>
              </div>

              <Table
                dataSource={containerItems}
                columns={containerColumns}
                rowKey="id"
                loading={loadingContainers}
                pagination={false}
                bordered
                size="small"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="bg-slate-50 font-semibold">
                      <Table.Summary.Cell index={0} colSpan={3}>
                        Total (All Containers)
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right" className="text-emerald-600">
                        {totalAcceptedQty}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right" className="text-rose-600">
                        {totalRejectedQty}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} />
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>
          </div>
        )}
      </div>
      <SplitDrawer
        open={isSplitOpen}
        onClose={() => setIsSplitOpen(false)}
        activeItem={selectedItem}
        // onSuccess={handleSplitSuccess}
        containers = {containerItems}
        grnId={grnId}
        grnItemId={selectedGrnItemId}
        selectedItem={selectedItem}
        supabase={supabase}
        itemID={selectedGrnItemId}
      />
    </Drawer>
  );
};

export default SummaryDrawer;