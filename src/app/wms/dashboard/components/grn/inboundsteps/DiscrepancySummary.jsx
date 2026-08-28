"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Table,
  Card,
  Tag,
  Spin,
  Button,
  Statistic,
  Alert,
  Badge,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ContainerOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { supabase } from "../../../../../lib/supabase";

// Import the Drawer component from relative path
import SummaryDrawer from "./utils/Summary/SummaryDrawer";

const DiscrepancySummary = forwardRef(function DiscrepancySummary(
  { grnId, grnData, onComplete },
  ref,
) {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [mappedContainers, setMappedContainers] = useState([]);
  const [stats, setStats] = useState({
    totalExpected: 0,
    totalAccepted: 0,
    totalRejected: 0,
    matchedCount: 0,
    shortageCount: 0,
    excessCount: 0,
    containerCount: 0,
  });

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeGrnId = grnId || grnData?.id;

  // Expose step validation handle for parent modal navigation
  useImperativeHandle(ref, () => ({
    validate: async () => {
      // Return true to allow moving to Putaway Bin Allocation step
      return true;
    },
  }));

  // Fetch GRN Items and join with all packed container items
  const fetchDiscrepancyReport = useCallback(async () => {
    if (!activeGrnId) return;

    try {
      setLoading(true);

      // Step 1: Fetch master items expected for this GRN
      const { data: grnItemsData, error: grnError } = await supabase
        .schema("purchase")
        .from("grn_items")
        .select(
          `
          id,
          expected_qty,
          received_qty,
          purchase_order_items!po_item_id (
            id,
            product_id,
            product_name,
            product_code,
            unit
          )
        `,
        )
        .eq("grn_id", activeGrnId);

      if (grnError) throw grnError;

      const grnItemIds = (grnItemsData || []).map((i) => i.id);

      // Step 2: Fetch mapped container items if GRN items exist
      let packedItemsData = [];
      if (grnItemIds.length > 0) {
        const { data: packedData, error: packedError } = await supabase
          .schema("purchase")
          .from("container_items")
          .select(
            `
            id,
            container_id,
            grn_item_id,
            accepted_qty,
            rejected_qty,
            containers!container_id (
              id,
              barcode,
              status
            )
          `,
          )
          .in("grn_item_id", grnItemIds);

        if (packedError) throw packedError;
        packedItemsData = packedData || [];
      }

      // Group container items by grn_item_id & track per-container quantities
      const packedMap = {};
      const containerMap = new Map();

      packedItemsData.forEach((cItem) => {
        const itemId = cItem.grn_item_id;
        const accepted = Number(cItem.accepted_qty || 0);
        const rejected = Number(cItem.rejected_qty || 0);

        if (!packedMap[itemId]) {
          packedMap[itemId] = {
            accepted: 0,
            rejected: 0,
            containers: [],
            containerDetails: [], // Stores breakdown per container
          };
        }

        packedMap[itemId].accepted += accepted;
        packedMap[itemId].rejected += rejected;

        if (cItem.containers) {
          const containerCode = cItem.containers.barcode;
          packedMap[itemId].containers.push(containerCode);

          // Add container breakdown
          packedMap[itemId].containerDetails.push({
            container_id: cItem.container_id,
            code: containerCode,
            accepted,
            rejected,
          });

          containerMap.set(cItem.containers.id, {
            id: cItem.containers.id,
            code: containerCode,
            type: cItem.containers.container_type,
            status: cItem.containers.status,
          });
        }
      });

      // Step 3: Compute totals & flatten rows per container entry for table merging
      let totalExpected = 0;
      let totalAccepted = 0;
      let totalRejected = 0;
      let matchedCount = 0;
      let shortageCount = 0;
      let excessCount = 0;

      const flattenedReport = [];

      (grnItemsData || []).forEach((item) => {
        const poItem = item.purchase_order_items || {};
        const expected = Number(item.received_qty || 0);
        const packed = packedMap[item.id] || {
          accepted: 0,
          rejected: 0,
          containers: [],
          containerDetails: [],
        };

        const totalAcceptedQty = packed.accepted;
        const totalRejectedQty = packed.rejected;
        const discrepancy = totalAcceptedQty - expected;

        totalExpected += expected;
        totalAccepted += totalAcceptedQty;
        totalRejected += totalRejectedQty;

        if (discrepancy === 0) matchedCount++;
        else if (discrepancy < 0) shortageCount++;
        else excessCount++;

        const containerDetails = packed.containerDetails;

        if (containerDetails.length === 0) {
          // If no containers are mapped, push a placeholder row
          flattenedReport.push({
            key: `${item.id}-unassigned`,
            grn_item_id: item.id,
            product_name: poItem.product_name || "Unnamed Item",
            product_code: poItem.product_code || "N/A",
            unit: poItem.unit || "Pcs",
            expected_qty: expected,
            accepted_qty: 0,
            rejected_qty: 0,
            total_accepted_qty: totalAcceptedQty,
            total_rejected_qty: totalRejectedQty,
            discrepancy,
            barcode: null,
            rowSpan: 1,
          });
        } else {
          // Push one row per container mapping
          containerDetails.forEach((detail, index) => {
            flattenedReport.push({
              key: `${item.id}-${detail.container_id}`,
              grn_item_id: item.id,
              product_name: poItem.product_name || "Unnamed Item",
              product_code: poItem.product_code || "N/A",
              unit: poItem.unit || "Pcs",
              expected_qty: expected,
              accepted_qty: detail.accepted,
              rejected_qty: detail.rejected,
              total_accepted_qty: totalAcceptedQty,
              total_rejected_qty: totalRejectedQty,
              discrepancy,
              barcode: detail.barcode,
              // Only set rowSpan on the first container row for this item group for aggregate summary columns
              rowSpan: index === 0 ? containerDetails.length : 0,
            });
          });
        }
      });

      setSummaryData(flattenedReport);
      setMappedContainers(Array.from(containerMap.values()));
      setStats({
        totalExpected,
        totalAccepted,
        totalRejected,
        matchedCount,
        shortageCount,
        excessCount,
        containerCount: containerMap.size,
      });
      console.log("Discrepancy Summary Report:", stats);
    } catch (err) {
      console.error("Error generating discrepancy report:", err);
      message.error(`Failed to load discrepancy summary: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeGrnId]);


  // const fetchDiscrepancyReport = () => {
  //   console.log("GRN Data:", grnId);
  // }




  useEffect(() => {
    fetchDiscrepancyReport();
  }, [fetchDiscrepancyReport]);

  const openDrawer = () => {
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handleDrawerSuccess = () => {
    handleDrawerClose();
    fetchDiscrepancyReport(); // Refresh metrics after handling consignment
  };

  const hasDiscrepancy = stats.shortageCount > 0 || stats.excessCount > 0;

  // Table columns with rowSpan integration and container-specific accepted quantities
const columns = [
  {
    title: "Item Details",
    dataIndex: "product_name",
    key: "product_name",

    render: (text, record) => (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800">
          {text}
        </span>

        <span className="font-mono text-xs text-slate-500">
          Code: {record.product_code}
        </span>
      </div>
    ),

    onCell: (record) => ({
      rowSpan: record.rowSpan,
    }),
  },

  {
    title: "Container",
    dataIndex: "barcode",
    key: "barcode",

    render: (code) =>
      code ? (
        <Tag color="blue" className="font-mono text-xs">
          {code}
        </Tag>
      ) : (
        <Tag color="default">Unassigned</Tag>
      ),
  },

  {
    title: "Accepted Qty",
    dataIndex: "accepted_qty",
    key: "accepted_qty",
    align: "center",
    width: 120,

    render: (qty, record) => (
      <span className="font-mono font-bold text-emerald-700">
        {qty} {record.unit}
      </span>
    ),
  },

  {
    title: "Rejected Qty",
    dataIndex: "rejected_qty",
    key: "rejected_qty",
    align: "center",
    width: 120,

    render: (qty, record) => (
      <span
        className={`font-mono font-bold ${
          qty > 0
            ? "text-rose-600"
            : "text-slate-400"
        }`}
      >
        {qty} {record.unit}
      </span>
    ),
  },

  {
    title: "Expected Qty",
    dataIndex: "expected_qty",
    key: "expected_qty",
    align: "center",
    width: 110,

    render: (qty, record) => (
      <span className="font-mono font-medium text-slate-600">
        {qty} {record.unit}
      </span>
    ),

    onCell: (record) => ({
      rowSpan: record.rowSpan,
    }),
  },

  {
    title: "Discrepancy",
    dataIndex: "discrepancy",
    key: "discrepancy",
    align: "center",
    width: 120,

    render: (diff, record) =>
      diff === 0 ? (
        <span className="font-mono font-semibold text-slate-400">
          0
        </span>
      ) : (
        <span
          className={`font-mono font-bold ${
            diff < 0
              ? "text-rose-600"
              : "text-blue-600"
          }`}
        >
          {diff > 0 ? `+${diff}` : diff} {record.unit}
        </span>
      ),

    onCell: (record) => ({
      rowSpan: record.rowSpan,
    }),
  },

  {
    title: "Status",
    key: "status",
    align: "center",
    width: 130,

    render: (_, record) => {
      const diff = record.discrepancy;

      if (diff === 0) {
        return (
          <Tag
            icon={<CheckCircleOutlined />}
            color="green"
          >
            Matched
          </Tag>
        );
      }

      if (diff < 0) {
        return (
          <Tag
            icon={<WarningOutlined />}
            color="volcano"
          >
            Shortage
          </Tag>
        );
      }

      return (
        <Tag
          icon={<ExclamationCircleOutlined />}
          color="blue"
        >
          Excess
        </Tag>
      );
    },

    onCell: (record) => ({
      rowSpan: record.rowSpan,
    }),
  },
];

  return (
    <div className="space-y-4">
      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          size="small"
          className="border-slate-200/80 shadow-xs bg-slate-50"
        >
          <Statistic
            title={
              <span className="text-xs uppercase font-semibold text-slate-500">
                Expected Total
              </span>
            }
            value={stats.totalExpected}
            styles={{
              content: {
                fontWeight: 700,
                color: "#334155",
              },
            }}
          />
        </Card>

        <Card
          size="small"
          className="border-slate-200/80 shadow-xs bg-emerald-50/50"
        >
          <Statistic
            title={
              <span className="text-xs uppercase font-semibold text-emerald-700">
                Accepted Total
              </span>
            }
            value={stats.totalAccepted}
            styles={{
              content: {
                fontWeight: 700,
                color: "#047857",
              },
            }}
          />
        </Card>

        <Card
          size="small"
          className="border-slate-200/80 shadow-xs bg-rose-50/50"
        >
          <Statistic
            title={
              <span className="text-xs uppercase font-semibold text-rose-700">
                Rejected Total
              </span>
            }
            value={stats.totalRejected}

            styles={{
              content: {
                fontWeight: 700,
                color: "#be123c",
              },
            }}
            
            
          />
        </Card>

        <Card
          size="small"
          className="border-slate-200/80 shadow-xs bg-blue-50/50"
        >
          <Statistic
            title={
              <span className="text-xs uppercase font-semibold text-blue-700">
                Containers Mapped
              </span>
            }
            value={stats.containerCount}
            prefix={<ContainerOutlined className="mr-1 text-blue-600" />}
             styles={{
              content: {
                fontWeight: 700,
                color: "#1d4ed8",
              },
            }}
           
          />
        </Card>
      </div>

      {/* ALERT BANNER */}
      {hasDiscrepancy ? (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          title="Quantity Discrepancy Detected"
          description={
            <span>
              There are <strong>{stats.shortageCount}</strong> shortage items
              and <strong>{stats.excessCount}</strong> excess items. Click{" "}
              <strong>Resolve Container / Discrepancy</strong> button to select a
              item and address any issues.
            </span>
          }
          className="border-amber-300 bg-amber-50"
        />
      ) : (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          title="Quantities Match Perfectly"
          description="All expected items and container packings match the Purchase Order specifications perfectly."
          className="border-emerald-300 bg-emerald-50"
        />
      )}

      {/* DISCREPANCY BREAKDOWN TABLE */}
      <Card
        size="small"
        className="border-slate-200/80 shadow-xs"
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">
                Consignment Breakdown
              </span>
              <Badge
                count={summaryData.length}
                overflowCount={999}
                style={{ backgroundColor: "#64748b" }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                icon={<ToolOutlined />}
                onClick={openDrawer}
                size="small"
                className="bg-indigo-600 hover:bg-indigo-500 font-medium"
              >
                Resolve Container / Discrepancy
              </Button>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={fetchDiscrepancyReport}
                loading={loading}
                size="small"
              >
                Refresh
              </Button>
            </div>
          </div>
        }
      >
        <Spin spinning={loading}>
          <Table
            dataSource={summaryData}
            columns={columns}
            pagination={false}
            size="small"
            bordered
            rowClassName={(record) => {
              if (record.discrepancy < 0) return "bg-rose-50/20";
              if (record.discrepancy > 0) return "bg-blue-50/20";
              return "";
            }}
          />
        </Spin>
      </Card>

      {/* COMPLETION ACTIONS */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onComplete && (
          <Button
            type="primary"
            size="large"
            icon={<SafetyCertificateOutlined />}
            onClick={onComplete}
            className="bg-emerald-600 hover:bg-emerald-500 shadow-md font-semibold"
          >
            Finalize & Submit GRN Summary
          </Button>
        )}
      </div>

      {/* CONSIGNMENT & CONTAINER RESOLUTION DRAWER */}
      <SummaryDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        onSuccess={handleDrawerSuccess}
        grnId={activeGrnId}
        containers={mappedContainers}
        summaryData={summaryData}
      />
    </div>
  );
});

DiscrepancySummary.displayName = "DiscrepancySummary";
export default DiscrepancySummary;
