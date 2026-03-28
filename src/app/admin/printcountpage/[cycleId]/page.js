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

const { Title, Text } = Typography;

export default function PrintCountPage({ params }) {
  const { cycleId } = params;

  const [products, setProducts] = useState([]);
  const [printType, setPrintType] = useState("blind");
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // FETCH DATA
  // -----------------------------
  const fetchData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("cycle_items")
        .select(
          `
          id,
          item_id,
          sl_no,
          sys_batch_no,
          sys_expiry_date,
          sys_quantity,
          item_master (item_name)
        `
        )
        .eq("cycle_id", cycleId)
        .order("sl_no", { ascending: true });

      if (error) throw error;

      // group by item
      const map = new Map();

      (data || []).forEach((row) => {
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

      setProducts(Array.from(map.values()));
    } catch (err) {
      console.error(err);
      message.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [cycleId]);

  // -----------------------------
  // PREPARE PRINT DATA (BATCH WISE)
  // -----------------------------
  const printData = useMemo(() => {
    let rows = [];

    products.forEach((item) => {
      item.units.forEach((u) => {
        rows.push({
          key: `${item.item_id}-${u.id}`,
          item_name: item.item_name,
          sl_no: item.sl_no,
          batch: u.sys_batch_no || "-",
          expiry: u.sys_expiry_date || "-",
          sys_qty: u.sys_quantity || 0,
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
      render: (_, __, index) => index + 1,
      width: 70,
    },
    {
      title: "Item Name",
      dataIndex: "item_name",
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
      render: () => "__________",
      width: 150,
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
            <Title level={4}>
              Cycle #{cycleId} - Counting Sheet
            </Title>
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
      <Card style={{ marginTop: 16 }}>
        <Table
          dataSource={printData}
          columns={columns}
          loading={loading}
          pagination={false}
          bordered
          className="print-table"
        />
      </Card>

      {/* SIGNATURE SECTION */}
      <div style={{ marginTop: 40 }}>
        <Row justify="space-between">
          <Col>
            <div>
              Counter Name: ____________________
              <br />
              Signature: ____________________
            </div>
          </Col>

          <Col>
            <div>
              Supervisor: ____________________
              <br />
              Signature: ____________________
            </div>
          </Col>
        </Row>
      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            padding: 0;
          }

          .print-table {
            font-size: 12px;
          }

          .ant-table {
            border: 1px solid #000;
          }

          .ant-table th,
          .ant-table td {
            border: 1px solid #000 !important;
            padding: 6px !important;
          }

          .ant-card {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}