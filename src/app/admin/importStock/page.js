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

  // 1. STICKY NORMALIZATION (Handles hidden Excel characters)
  const strictNormalize = (val) => {
    if (val === null || val === undefined) return "";
    return String(val)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "") // Keep only alphanumeric and hyphens
      .trim();
  };

  // 📂 Upload Excel
  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      setRawData(jsonData);
      message.success("File uploaded ✅");
      console.log("Data Length:", jsonData.length);
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  // 🔄 Transform Excel → Item Master
  const transformItems = (rows) => {
    const map = new Map();
    rows.forEach((row) => {
      const guid = String(row["GUID"] || "").trim();
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

  // 📡 FETCH ALL FROM DB (Bypassing 1000 limit)
  const fetchAllDBItems = async () => {
    let allItems = [];
    let from = 0;
    const step = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("item_master")
        .select("guid, alter_id, item_name, hsn, tax, vendor, uom")
        .range(from, from + step - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allItems = [...allItems, ...data];
      if (data.length < step) break;
      from += step;
    }
    return allItems;
  };

  // 🔍 Compare with DB
  const handleCompare = async () => {
    try {
      setLoading(true);
      const excelItems = transformItems(rawData);
      
      // Get EVERYTHING from DB
      const dbItems = await fetchAllDBItems();
      
      const dbMap = new Map();
      dbItems.forEach((item) => {
        dbMap.set(strictNormalize(item.guid), item);
      });

      const changes = [];

      excelItems.forEach((item) => {
        const guidKey = strictNormalize(item.guid);
        const dbItem = dbMap.get(guidKey);
        const excelAlter = Number(item.alter_id) || 0;

        if (!dbItem) {
          changes.push({ ...item, type: "NEW" });
        } else {
          const dbAlter = Number(dbItem.alter_id) || 0;
          if (dbAlter !== excelAlter) {
            changes.push({ ...item, type: "UPDATED" });
          }
        }
      });

      console.log(`📊 Report: Excel(${excelItems.length}) vs DB(${dbItems.length})`);
      console.log("✅ Changes Found:", changes);

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
      console.log("Payload length:", payload.length);

      const { error } = await supabase
        .from("item_master")
        .upsert(payload, { onConflict: "guid" });

      if (error) throw error;

      message.success({
        content: `Item Master synced ✅ (${payload.length})`,
        key: "push",
      });
      // Clear changes after success
      setFilteredItems([]);
    } catch (err) {
      console.error(err);
      message.error({ content: "Push failed ❌", key: "push" });
    }
  };

  // (Remaining utility functions parseQuantity, parseRate, etc. stay the same...)
 const fetchItemIdMap = async () => {
  let allItems = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("item_master")
      .select("id, guid")
      .range(from, from + step - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allItems = [...allItems, ...data];

    if (data.length < step) break;
    from += step;
  }

  const map = new Map();
  allItems.forEach((item) => {
    map.set(strictNormalize(item.guid), item.id);
  });

  console.log("📦 Total item_master fetched:", allItems.length); // ✅ DEBUG

  return map;
};

  const parseMRP = (v) => v ? Number(String(v).replace(/,/g, "").replace(/\/.*$/, "").trim()) || 0 : 0;
  const parseRate = (v) => v ? Number(String(v).replace(/,/g, "").replace(/\/.*$/, "").trim()) || 0 : 0;
  const parseQuantity = (v) => v ? Number(String(v).replace(/[^0-9.]/g, "").trim()) || 0 : 0;

  const transformStockUnits = (rows, itemIdMap) => {
    const stock = [];
    rows.forEach((row) => {
      const guid = String(row["GUID"] || "").trim();
      const item_id = itemIdMap.get(guid);
      if (!guid || !item_id) return;

      stock.push({
        item_id,
        batch_serial: row["Batch / Serial"],
        expiry_date: row["Expiry"] ? new Date(row["Expiry"]).toISOString().split("T")[0] : null,
        quantity: parseQuantity(row["Stock"]),
        mrp: parseMRP(row["MRP"]),
        purchase_rate: parseRate(row["Purchase Rate"]),
        status: "available",
      });
    });
    return stock;
  };

  const handlePrepareStock = async () => {
    try {
      setLoading(true);
      const itemIdMap = await fetchItemIdMap();
      const stockData = transformStockUnits(rawData, itemIdMap);
      setStockUnits(stockData);
      message.success(`Stock ready ✅ (${stockData.length})`);
      console.log("Stock Units Length:", stockData.length);
    } catch (err) {
      console.error(err);
      message.error("Stock preparation failed ❌");
    } finally {
      setLoading(false);
    }
  };

 const handlePushStock = async () => {
  try {
    if (stockUnits.length === 0) 
      return message.warning("No stock data ⚠️");

    console.log("🚀 Sending to DB:", stockUnits.length); // ✅ ADD THIS

    message.loading({ content: "Syncing stock...", key: "stock" });

    const { data, error } = await supabase
      .from("stock_units")
      .upsert(stockUnits, { onConflict: "item_id,batch_serial" })
      .select(); // 👈 IMPORTANT to get response count

    if (error) throw error;

    console.log("✅ Inserted/Updated rows:", data?.length); // ✅ ACTUAL RESULT

    message.success({
      content: `Stock synced ✅ (${data?.length || 0})`,
      key: "stock",
    });
  } catch (err) {
    console.error(err);
    message.error({ content: "Stock sync failed ❌", key: "stock" });
  }
};

  const itemColumns = [
    { title: "Type", dataIndex: "type", render: (t) => t === 'NEW' ? <b style={{color: 'green'}}>{t}</b> : <b style={{color: 'orange'}}>{t}</b> },
    { title: "Item Name", dataIndex: "item_name" },
    { title: "GUID", dataIndex: "guid" },
    { title: "AlterID", dataIndex: "alter_id" },
  ];

  const stockColumns = [
    { title: "Item ID", dataIndex: "item_id" },
    { title: "Batch", dataIndex: "batch_serial" },
    { title: "Qty", dataIndex: "quantity" },
    { title: "MRP", dataIndex: "mrp" },
  ];

  return (
    <div className="p-6">
      <Card title="Import & Compare Items" className="shadow-md rounded-xl">
        <Upload beforeUpload={handleUpload} showUploadList={false}>
          <Button icon={<UploadOutlined />}>Upload Excel</Button>
        </Upload>

        <div className="mt-4 flex gap-2">
          <Button type="primary" onClick={handleCompare} disabled={rawData.length === 0} loading={loading}>
            Compare with Database
          </Button>
        </div>

        <h2 className="mt-6 font-bold text-lg">Item Master (New / Updated)</h2>
        <Table
          dataSource={filteredItems}
          columns={itemColumns}
          rowKey="guid"
          scroll={{ x: true, y: 300 }}
          bordered
          pagination={{ pageSize: 10 }}
        />

        <div className="mt-4 flex justify-end">
          <Button type="primary" disabled={filteredItems.length === 0} onClick={handlePushItems}>
            Push Item Master Changes
          </Button>
        </div>

        <h2 className="mt-8 font-bold text-lg">Stock Units</h2>
        <Table
          dataSource={stockUnits}
          columns={stockColumns}
          rowKey={(r) => `${r.item_id}-${r.batch_serial}`}
          scroll={{ x: true, y: 300 }}
          bordered
        />

        <div className="mt-4 flex gap-2">
          <Button type="dashed" onClick={handlePrepareStock} disabled={rawData.length === 0}>
            Prepare Stock Units
          </Button>
          <Button type="dashed" onClick={handlePushStock} disabled={stockUnits.length === 0}>
            Push Stock to DB
          </Button>
        </div>
      </Card>
    </div>
  );
}