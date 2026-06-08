"use client";

import { useEffect, useState, useRef } from "react";
import { Table, Modal, Button, Progress, Card, Space, Typography } from "antd";
import {
  LeftOutlined,
  EyeOutlined,
  RightOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const { Title, Text } = Typography;

export default function TallyPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupedData, setGroupedData] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const progressRef = useRef(null);

  const printRef = useRef();

  const fetchData = async (date) => {
    setLoading(true);
    setErrorMessage("");
    setProgress(5);

    progressRef.current = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + 1));
    }, 50);

    try {
      const formatted = date.toISOString().split("T")[0];

      const res = await fetch(`/api/tally/sales-orders?date=${formatted}`);
      const json = await res.json();

      if (json.success) {
        const raw = json.data || [];
        setData(raw);
        setGroupedData(groupByVoucher(raw));
      } else {
        setData([]);
        setGroupedData([]);
        setErrorMessage(json.message || "Please open Tally");
      }
    } catch (err) {
      console.error("FRONTEND ERROR:", err);
      setErrorMessage("Unable to connect. Please open Tally.");
    }

    clearInterval(progressRef.current);

    setProgress(100);

    setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 300);
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, []);

  useEffect(() => {
    if (selectedVoucher) {
      console.log("Selected Voucher:", selectedVoucher);
      console.log("GUID:", selectedVoucher.items?.[0]?.guid);
      console.log("ALTERID:", selectedVoucher.items?.[0]?.alterId);
    }
  }, [selectedVoucher]);

  function groupByVoucher(data) {
    const grouped = {};

    data.forEach((row) => {
      if (!grouped[row.voucherNumber]) {
        grouped[row.voucherNumber] = {
          voucherNumber: row.voucherNumber,
          date: row.date,
          party: row.party,
          shippedBy: row.shippedBy,
          items: [],
        };
      }

      grouped[row.voucherNumber].items.push(row);
    });

    return Object.values(grouped);
  }

  const columns = [
    {
      title: "Voucher No",
      dataIndex: "voucherNumber",
    },
    {
      title: "Party",
      dataIndex: "party",
    },
    {
      title: "Shipped By",
      dataIndex: "shippedBy",
    },
    {
      title: "Action",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => setSelectedVoucher(record)}
        >
          View
        </Button>
      ),
    },
  ];

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    fetchData(newDate);
  };

  const handlePrint = () => {
    if (!selectedVoucher) return;

    const printWindow = window.open("", "_blank");

    const totalQty = selectedVoucher.items.reduce((sum, item) => {
      const qty = parseFloat(item.qty) || 0;
      return sum + qty;
    }, 0);

    const rows = selectedVoucher.items
      .map(
        (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.itemName}</td>
        <td>${item.batchName || "-"}</td>
        <td>${item.qty}</td>
        <td>${item.godown || "-"}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
<html>
<head>
<style>
  @page {
    size: 100mm 150mm;
    margin: 0;
  }

  body {
    font-family: Arial;
    margin: 0;
    padding: 0;
  }

  .page {
    padding: 8mm;
  }

  .title {
    text-align: center;
    font-size: 22px;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .divider {
    border-top: 2px dashed black;
    margin: 8px 0;
  }

  .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 12px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 10px;
  }

  th, td {
    border: 1px solid black;
    padding: 4px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: black;
    color: white;
    text-align: center;
  }

  .summary {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    font-weight: bold;
  }

  .footer {
    margin-top: 20px;
    text-align: center;
    font-weight: bold;
  }
</style>
</head>

<body>
  <div class="page">
  <div class="divider"></div>

    <div class="title">★ SALES ORDER ★</div>

    <div class="divider"></div>

    <div class="row">
      <div><b>Sales Order No:</b> ${selectedVoucher.voucherNumber}</div>
      <div><b>Date:</b> ${
        selectedVoucher.date
          ? selectedVoucher.date.replace(/(\d{4})(\d{2})(\d{2})/, "$3-$2-$1")
          : "-"
      }</div>
    </div>

    <div class="row">
      <div><b>Party:</b> ${selectedVoucher.party}</div>
    </div>

    <div class="row">
      <div><b>Shipped By:</b> ${selectedVoucher.shippedBy || "-"}</div>
    </div>

    <div class="divider"></div>

    <table>
      <thead>
        <tr>
          <th>Sl</th>
          <th>Item</th>
          <th>Batch</th>
          <th>Qty</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="summary">
      <span>Total Items: ${selectedVoucher.items.length}</span>
      <span>Total Qty: ${totalQty}</span>
    </div>

    <div class="divider"></div>

    <div class="footer">
      Taken By: Staff 1
    </div>

  </div>
</body>
</html>
`;

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div style={{ padding: 20 }}>
      <Card
        variant={false}
        style={{
          marginBottom: 20,
          borderRadius: 16,
          boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Left */}
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Tally Sales Orders
            </Title>
            <Text type="secondary">
              View and manage daily sales orders easily
            </Text>
          </div>

          {/* Right */}
          <Space size="middle" wrap>
            <Button
              icon={<LeftOutlined />}
              onClick={() => changeDate(-1)}
              style={{
                borderRadius: 8,
              }}
            >
              Prev
            </Button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid #d9d9d9",
                borderRadius: 10,
                padding: "4px 10px",
                background: "#fafafa",
                minWidth: 180,
              }}
            >
              <CalendarOutlined style={{ marginRight: 8, color: "#1677ff" }} />
              <DatePicker
                selected={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  fetchData(date);
                }}
                dateFormat="dd-MM-yyyy"
                customInput={
                  <input
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      width: "100%",
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  />
                }
              />
            </div>

            <Button
              type="primary"
              icon={<RightOutlined />}
              onClick={() => changeDate(1)}
              style={{
                borderRadius: 8,
              }}
            >
              Next
            </Button>
          </Space>
        </div>
      </Card>
      {loading && (
        <div style={{ marginBottom: 10 }}>
          <Progress percent={progress} status="active" showInfo={false} />
        </div>
      )}
      {errorMessage && (
        <div
          style={{
            marginBottom: 15,
            padding: 10,
            background: "#fff1f0",
            color: "#cf1322",
            border: "1px solid #ffa39e",
            borderRadius: 5,
          }}
        >
          {errorMessage}
        </div>
      )}
      <Table
        columns={columns}
        dataSource={groupedData}
        rowKey="voucherNumber"
      />

      <Modal
        open={!!selectedVoucher}
        onCancel={() => setSelectedVoucher(null)}
        footer={null}
        width={850}
      >
        {selectedVoucher && (
          <div
            id="thermal-slip"
            style={{
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg,#1677ff,#4096ff)",
                color: "#fff",
                padding: "20px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24 }}>Sales Order</h2>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 10,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    padding: "6px 12px",
                    borderRadius: 20,
                  }}
                >
                  #{selectedVoucher.voucherNumber}
                </span>

                <span
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    padding: "6px 12px",
                    borderRadius: 20,
                  }}
                >
                  {selectedVoucher.date
                    ? selectedVoucher.date.replace(
                        /(\d{4})(\d{2})(\d{2})/,
                        "$3-$2-$1",
                      )
                    : "-"}
                </span>
              </div>
            </div>

            {/* Party Section */}
            <div
              style={{
                padding: "20px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div>
                <p style={{ marginBottom: 4, color: "#888" }}>Party</p>
                <b style={{ fontSize: 16 }}>{selectedVoucher.party}</b>
              </div>

              <div>
                <p style={{ marginBottom: 4, color: "#888" }}>Shipped By</p>
                <b style={{ fontSize: 16 }}>
                  {selectedVoucher.shippedBy || "-"}
                </b>
              </div>
            </div>

            {/* Table */}
            <div style={{ padding: "20px" }}>
              <Table
                dataSource={selectedVoucher.items.map((item, index) => ({
                  ...item,
                  slNo: index + 1,
                }))}
                pagination={false}
                bordered
                size="middle"
                columns={[
                  {
                    title: "Sl No",
                    dataIndex: "slNo",
                    width: 70,
                  },
                  {
                    title: "Item Name",
                    dataIndex: "itemName",
                  },
                  {
                    title: "Batch",
                    dataIndex: "batchName",
                  },
                  {
                    title: "Qty",
                    dataIndex: "qty",
                    width: 80,
                  },
                  {
                    title: "Location",
                    dataIndex: "godown",
                  },
                ]}
                rowKey="slNo"
              />
            </div>

            {/* Footer */}
            <div
              style={{
                borderTop: "1px solid #f0f0f0",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fafafa",
              }}
            >
              <span style={{ fontWeight: 600 }}>Taken By: Staff 1</span>

              <Button type="primary" size="large" onClick={handlePrint}>
                Print
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
