"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import {
  Card,
  Table,
  Typography,
  Segmented,
  Button,
  Row,
  Col,
  message,
} from "antd";
import { useParams } from "next/navigation";

const { Title, Text } = Typography;

export default function PrintCountPage() {
  const params = useParams();
  const cycleId = params?.cycleId;

  const [products, setProducts] = useState([]);
  const [printType, setPrintType] = useState("blind");
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // FETCH DATA
  // -----------------------------
 const fetchData = async () => {
  if (!cycleId) return;

  try {
    setLoading(true);

    let allData = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("cycle_items")
        .select(`
          id,
          item_id,
          sl_no,
          sys_batch_no,
          sys_expiry_date,
          sys_quantity,
          mrp,
          item_master (item_name)
        `)
        .eq("cycle_id", cycleId)
        .order("sl_no", { ascending: true })
        .range(from, from + step - 1); // 🔥 KEY FIX

      if (error) throw error;

      if (!data || data.length === 0) break;

      allData = [...allData, ...data];

      if (data.length < step) break;

      from += step;
    }

    console.log("✅ Total rows fetched:", allData.length);

    // -----------------------------
    // GROUPING (same)
    // -----------------------------
    const map = new Map();

    allData.forEach((row) => {
      let existing = map.get(row.item_id);

      if (!existing) {
        existing = {
          item_id: row.item_id,
          item_name: row.item_master?.item_name,
          sl_no: row.sl_no,
          units: [],
        };
      }

      existing.units.push(row);
      map.set(row.item_id, existing);
    });

    const finalProducts = Array.from(map.values());

    console.log("📦 Total items after grouping:", finalProducts.length);

    setProducts(finalProducts);
  } catch (err) {
    console.error(err);
    message.error("Error loading data");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (!cycleId) return; // ✅ prevent undefined API call
    fetchData();
  }, [cycleId]);

  // -----------------------------
  // PREPARE PRINT DATA (BATCH WISE)
  // -----------------------------
  const printData = useMemo(() => {
    let rows = [];

    products.forEach((item) => {
      // ✅ filter batches first
      const validUnits = item.units.filter((u) => {
        const sysQty = u.sys_quantity || 0;
        const countedQty = 0; // since it's blank in print

        return !(sysQty === 0 && countedQty === 0);
      });

      // ❗ if all batches removed → skip item completely
      if (validUnits.length === 0) return;

      const batchCount = validUnits.length;

      validUnits.forEach((u, index) => {
        rows.push({
          key: `${item.item_id}-${u.id}`,

          sl_no: item.sl_no,
          item_name: item.item_name,

          batch: u.sys_batch_no || "-",
          expiry: u.sys_expiry_date || "-",
          sys_qty: u.sys_quantity || 0,

          // ✅ rowSpan fix AFTER filtering
          rowSpan: index === 0 ? batchCount : 0,
        });
      });
    });

    return rows;
  }, [products]);

  // -----------------------------
  // COLUMNS
  // -----------------------------
  const columns = [
    {
      title: "Sl No",
      dataIndex: "sl_no",
      width: 70,
      onCell: (record) => ({
        rowSpan: record.rowSpan,
      }),
    },
    {
      title: "Item Name",
      dataIndex: "item_name",
      onCell: (record) => ({
        rowSpan: record.rowSpan,
      }),
    },
    {
      title: "Batch",
      dataIndex: "batch",
      width: 150,
    },
    {
      title: "Expiry",
      dataIndex: "expiry",
      width: 120,
    },

    // ✅ NEW MRP COLUMN (as you requested earlier)
    {
      title: "MRP",
      dataIndex: "mrp",
      width: 90,
      // render: () => "______", // or real value later
    },

    ...(printType === "audit"
      ? [
          {
            title: "System Qty",
            dataIndex: "sys_qty",
            width: 120,
          },
        ]
      : []),

    {
      title: "Count Qty",
      // render: () => "______",
      width: 90,
    },
    {
      title: "Ref No (Page No)",
      // render: () => "______",
      width: 90,
    },

    ...(printType === "audit"
      ? [
          {
            title: "Diff",
            render: () => "__________",
            width: 120,
          },
        ]
      : []),
  ];
  // -----------------------------
  // PRINT
  // -----------------------------
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: 16 }}>
      <Card className="no-print">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4}>Cycle #{cycleId} - Counting Sheet</Title>
          </Col>

          <Col>
            <Segmented
              value={printType}
              onChange={setPrintType}
              options={[
                { label: "Blind Count", value: "blind" },
                { label: "Audit Sheet", value: "audit" },
              ]}
            />
          </Col>

          <Col>
            <Button type="primary" onClick={handlePrint}>
              🖨 Print
            </Button>
          </Col>
        </Row>

        <div style={{ marginTop: 10 }}>
          <Text type="secondary">
            {printType === "blind"
              ? "Blind Count Sheet (No system quantity shown)"
              : "Audit Sheet (Includes system quantity for verification)"}
          </Text>
        </div>
      </Card>

      {/* PRINT TABLE */}
      <div className="print-wrapper">
        <Card style={{ marginTop: 16 }}>
          <Table
            dataSource={printData}
            columns={columns}
            loading={loading}
            pagination={false}
            bordered
            className="print-table"
            size="small"
            rowClassName={(record, index) => (index % 2 === 0 ? "row-light" : "row-dark")}
          />
        </Card>
      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          @media print {
            .print-wrapper {
              padding-bottom: 10mm; /* ✅ forces visible bottom space */
            }
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-table {
            font-size: 10px;
          }

          .ant-table {
            border: 1px solid #000;
          }

          .ant-table-thead > tr > th {
            padding: 4px !important;
            font-size: 10px;
            line-height: 1.2;
          }

          .ant-table-tbody > tr > td {
            padding: 3px 4px !important;
            font-size: 10px;
            line-height: 1.2;
          }

          .ant-card {
            box-shadow: none !important;
            border: none !important;
          }

          .ant-card-body {
            padding: 0 !important; /* ✅ important fix */
          }

          tr {
            page-break-inside: avoid;
          }

          @page {
            size: A4 portrait;
            margin: 5mm 8mm 8mm 8mm;
          }
        }
      `}</style>
    </div>
  );
}
