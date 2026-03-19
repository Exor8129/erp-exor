"use client";

import { useState } from "react";
import { Upload, Button, Table, Card, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";

export default function ImportPage() {
  const [rawData, setRawData] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stockUnits, setStockUnits] = useState([]);

  // 📂 Upload Excel
  const handleUpload = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      setRawData(jsonData);
      message.success("File uploaded ✅");
    };

    reader.readAsBinaryString(file);
    return false;
  };

  // 🔄 Transform Excel → Item Master
  const transformItems = (rows) => {
    const map = new Map();

    rows.forEach((row) => {
      const guid = String(row["GUID"]).trim();
      if (!guid) return;

      if (!map.has(guid)) {
        map.set(guid, {
          item_name: row["Item Name"],
          hsn: row["HSN/SAC"],
          tax: row["Tax %"] ? String(row["Tax %"]) : null,
          guid,
          alter_id: Number(row["AlterID"]) || 0,
          vendor: row["Vendor"],
          uom: row["UOM"],
        });
      }
    });

    return Array.from(map.values());
  };

  // 🔍 Compare with DB
  const handleCompare = async () => {
    try {
      setLoading(true);

      const excelItems = transformItems(rawData);

      const { data: dbItems, error } = await supabase
        .from("item_master")
        .select("guid, alter_id");

      if (error) throw error;

      const dbMap = new Map();
      dbItems.forEach((item) => {
        dbMap.set(String(item.guid).trim(), item.alter_id);
      });

      const changes = [];

      excelItems.forEach((item) => {
        const existingAlter = dbMap.get(item.guid);

        if (!existingAlter) {
          changes.push({ ...item, type: "NEW" });
        } else if (existingAlter !== item.alter_id) {
          changes.push({ ...item, type: "UPDATED" });
        }
      });

      setFilteredItems(changes);
      message.success(`Found ${changes.length} changes ✅`);
    } catch (err) {
      console.error(err);
      message.error("Comparison failed ❌");
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Push Item Master
  const handlePushItems = async () => {
    try {
      if (filteredItems.length === 0) {
        message.warning("No data to push ⚠️");
        return;
      }

      message.loading({ content: "Pushing data...", key: "push" });

      const payload = filteredItems.map(({ type, ...rest }) => ({
        ...rest,
        updated_at: new Date(),
        status: true,
      }));

      const { error } = await supabase
        .from("item_master")
        .upsert(payload, { onConflict: "guid" });

      if (error) throw error;

      message.success({
        content: `Item Master synced ✅ (${payload.length})`,
        key: "push",
      });
    } catch (err) {
      console.error(err);
      message.error({
        content: "Push failed ❌",
        key: "push",
      });
    }
  };

  // 🔗 Fetch GUID → item_id map
  const fetchItemIdMap = async () => {
    const { data, error } = await supabase
      .from("item_master")
      .select("id, guid");

    if (error) throw error;

    const map = new Map();
    data.forEach((item) => {
      map.set(String(item.guid).trim(), item.id);
    });

    console.log("Item Map:", map);

    return map;
  };

  const parseMRP = (value) => {
    if (!value) return 0;

    return (
      Number(
        String(value)
          .replace(/,/g, "") // remove commas
          .replace(/\/.*$/, "") // remove "/nos"
          .trim(),
      ) || 0
    );
  };

  const parseQuantity = (value) => {
    if (!value) return 0;

    return (
      Number(
        String(value)
          .replace(/[^0-9.]/g, "") // keep only numbers
          .trim(),
      ) || 0
    );
  };

  // 🔄 Transform Stock Units
  const transformStockUnits = (rows, itemIdMap) => {
    const stock = [];

    rows.forEach((row) => {
      const guid = String(row["GUID"]).trim();
      const item_id = itemIdMap.get(guid);

      if (!guid || !item_id) {
        console.warn("Skipping row:", guid);
        return;
      }

      stock.push({
        item_id,
        batch_serial: row["Batch / Serial"],
        expiry_date: row["Expiry"]
          ? new Date(row["Expiry"]).toISOString().split("T")[0]
          : null,
        quantity: parseQuantity(row["Stock"]),
        mrp: parseMRP(row["MRP"]),
        status: "available",
      });
    });

    console.log("Final Stock:", stock);

    return stock;
  };

  // 📦 Prepare Stock Units
  const handlePrepareStock = async () => {
    try {
      setLoading(true);

      const itemIdMap = await fetchItemIdMap();
      const stockData = transformStockUnits(rawData, itemIdMap);

      setStockUnits(stockData);

      message.success(`Stock ready ✅ (${stockData.length})`);
    } catch (err) {
      console.error(err);
      message.error("Stock preparation failed ❌");
    } finally {
      setLoading(false);
    }
  };

  // 📊 Columns
  const itemColumns = [
    { title: "Type", dataIndex: "type" },
    { title: "Item Name", dataIndex: "item_name" },
    { title: "HSN", dataIndex: "hsn" },
    { title: "Tax", dataIndex: "tax" },
    { title: "Vendor", dataIndex: "vendor" },
    { title: "UOM", dataIndex: "uom" },
    { title: "GUID", dataIndex: "guid" },
    { title: "AlterID", dataIndex: "alter_id" },
  ];

  const stockColumns = [
    { title: "Item ID", dataIndex: "item_id" },
    { title: "Batch", dataIndex: "batch_serial" },
    { title: "Expiry", dataIndex: "expiry_date" },
    { title: "Qty", dataIndex: "quantity" },
    { title: "MRP", dataIndex: "mrp" },
  ];

  const handlePushStock = async () => {
  try {
    if (stockUnits.length === 0) {
      message.warning("No stock data ⚠️");
      return;
    }

    message.loading({ content: "Syncing stock...", key: "stock" });

    const { error } = await supabase
      .from("stock_units")
      .upsert(stockUnits, {
        onConflict: "item_id,batch_serial",
      });

    if (error) throw error;

    message.success({
      content: `Stock synced ✅ (${stockUnits.length})`,
      key: "stock",
    });
  } catch (err) {
    console.error(err);
    message.error({
      content: "Stock sync failed ❌",
      key: "stock",
    });
  }
};

  return (
    <div className="p-6">
      <Card title="Import & Compare Items" className="shadow-md rounded-xl">
        {/* Upload */}
        <Upload beforeUpload={handleUpload} showUploadList={false}>
          <Button icon={<UploadOutlined />}>Upload Excel</Button>
        </Upload>

        {/* Compare */}
        <div className="mt-4">
          <Button
            type="primary"
            onClick={handleCompare}
            disabled={rawData.length === 0}
            loading={loading}
          >
            Compare with Database
          </Button>
        </div>

        {/* ITEM MASTER */}
        <h2 className="mt-6 font-bold text-lg">Item Master (New / Updated)</h2>

        <Table
          style={{ marginTop: 10 }}
          dataSource={filteredItems}
          columns={itemColumns}
          rowKey="guid"
          scroll={{ x: true, y: 300 }}
          bordered
          pagination={false}
        />

        <div className="mt-4 flex justify-end">
          <Button
            type="primary"
            disabled={filteredItems.length === 0}
            onClick={handlePushItems}
          >
            Push Item Master
          </Button>
        </div>

        {/* STOCK UNITS */}
        <h2 className="mt-8 font-bold text-lg">Stock Units</h2>

        <Table
          style={{ marginTop: 10 }}
          dataSource={stockUnits}
          columns={stockColumns}
          rowKey={(r, i) => i}
          scroll={{ x: true, y: 300 }}
          bordered
          pagination={false}
        />

        <div className="mt-4">
          <Button
            type="dashed"
            onClick={handlePrepareStock}
            disabled={rawData.length === 0}
          >
            Prepare Stock Units
          </Button>
        </div>

        <div className="mt-4">
          <Button
            type="dashed"
            onClick={handlePushStock}
            
          >
            Push To DB
          </Button>
        </div>
      </Card>
    </div>
  );
}
