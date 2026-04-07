"use client";

import { useState } from "react";
import { Upload, Button, Table, Card, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";

export default function SalesImportPage() {
  const [rawData, setRawData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 📂 Upload Excel
  const handleUpload = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      setRawData(jsonData);
      message.success(`File loaded ✅ (${jsonData.length} rows)`);
    };

    reader.readAsArrayBuffer(file);
    return false;
  };

  // 🧠 Helpers
  const parseDate = (v) => {
    if (!v) return null;

    const parts = String(v).split("-");
    if (parts.length === 3) {
      const [day, mon, year] = parts;

      const months = {
        jan: 1,
        feb: 2,
        mar: 3,
        apr: 4,
        may: 5,
        jun: 6,
        jul: 7,
        aug: 8,
        sep: 9,
        oct: 10,
        nov: 11,
        dec: 12,
      };

      const fullYear = Number(year) < 50 ? "20" + year : "19" + year;

      const month = months[mon.toLowerCase()];

      // ✅ Return directly (NO Date object, NO timezone issue)
      return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    return null;
  };
  const parseQty = (v) => {
    if (!v) return 0;

    return (
      Number(
        String(v)
          .replace(/[^\d.]/g, "") // keep only numbers
          .trim(),
      ) || 0
    );
  };

  const parseRate = (v) => {
    if (!v) return 0;

    return (
      Number(
        String(v)
          .split("/")[0] // remove "/nos"
          .replace(/,/g, "") // remove comma
          .trim(),
      ) || 0
    );
  };

  const parseAmount = (v) => {
    if (!v) return 0;

    return Number(String(v).replace(/,/g, "").trim()) || 0;
  };

//   const parseNumber = (v) => {
//     return Number(String(v || "").replace(/,/g, "")) || 0;
//   };

  // 🔄 Transform + Filter
  const handlePrepare = () => {
    const filtered = rawData
      .filter(
        (row) =>
          String(row["Vch Type"] || "")
            .trim()
            .toUpperCase() === "SALES B2B",
      )
      .map((row, index) => ({
        _id: `${row["Vch No"]}-${row["Item Name"]}-${index}`,
        date: parseDate(row["Date"]),
        vch_no: String(row["Vch No"] || "").trim(),
        party_name: row["Party Name"],
        item_name: row["Item Name"],
        qty: parseQty(row["Qty"]),
        rate: parseRate(row["Rate"]),
        amount: parseAmount(row["Amount"]),
      }));

    setSalesData(filtered);

    message.success(`Filtered SALES B2B ✅ (${filtered.length})`);
    console.log("Prepared Sales:", filtered);
  };

  // 🚀 Push with batching (1000 limit safe)
  const handlePush = async () => {
    try {
      if (salesData.length === 0) {
        return message.warning("No data to push ⚠️");
      }

      setLoading(true);
      message.loading({ content: "Uploading...", key: "push" });

      const batchSize = 1000;
      let totalInserted = 0;

      for (let i = 0; i < salesData.length; i += batchSize) {
        const batch = salesData
          .slice(i, i + batchSize)
          .map(({ _id, ...rest }) => rest);

        const { data, error } = await supabase
          .from("sales_data")
          .insert(batch)
          .select();

        if (error) throw error;

        totalInserted += data.length;
        console.log(`Batch ${i / batchSize + 1} inserted:`, data.length);
      }

      message.success({
        content: `✅ Total inserted: ${totalInserted}`,
        key: "push",
      });
    } catch (err) {
      console.error(err);
      message.error({ content: "Push failed ❌", key: "push" });
    } finally {
      setLoading(false);
    }
  };

  // 📊 Table Columns
  const columns = [
    { title: "Date", dataIndex: "date" },
    { title: "Vch No", dataIndex: "vch_no" },
    { title: "Party", dataIndex: "party_name" },
    { title: "Item", dataIndex: "item_name" },
    { title: "Qty", dataIndex: "qty" },
    { title: "Rate", dataIndex: "rate" },
    { title: "Amount", dataIndex: "amount" },
  ];

  return (
    <div className="p-6">
      <Card
        title="Sales Import (Excel → Supabase)"
        className="rounded-xl shadow"
      >
        {/* Upload */}
        <Upload beforeUpload={handleUpload} showUploadList={false}>
          <Button icon={<UploadOutlined />}>Select Excel File</Button>
        </Upload>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button
            type="dashed"
            onClick={handlePrepare}
            disabled={rawData.length === 0}
          >
            Prepare SALES B2B Data
          </Button>

          <Button
            type="primary"
            onClick={handlePush}
            disabled={salesData.length === 0}
            loading={loading}
          >
            Push to Database
          </Button>
        </div>

        {/* Table */}
        <h2 className="mt-6 font-bold text-lg">Preview Data</h2>

        <Table
          dataSource={salesData}
          columns={columns}
          rowKey="_id"
          scroll={{ x: true, y: 400 }}
          bordered
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
