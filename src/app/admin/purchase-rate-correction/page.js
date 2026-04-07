// "use client";

// import { useEffect, useState } from "react";
// import {
//   Card,
//   Table,
//   InputNumber,
//   Button,
//   message,
//   Select,
//   Typography,
//   Modal,
//   Tag,
//   Input,
// } from "antd";
// import { supabase } from "../../lib/supabase";

// const { Text } = Typography;

// export default function RateUpdatePage() {
//   const [cycleId, setCycleId] = useState(null);
//   const [cycles, setCycles] = useState([]);
//   const [data, setData] = useState([]);
//   const [rateMap, setRateMap] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [searchText, setSearchText] = useState("");

//   // -----------------------------
//   // FETCH CYCLES
//   // -----------------------------
//   const fetchCycles = async () => {
//     const { data } = await supabase
//       .from("count_cycles")
//       .select("id")
//       .order("id", { ascending: false });

//     setCycles(data || []);
//   };

//   // -----------------------------
//   // FETCH ALL ITEMS (IMPORTANT CHANGE)
//   // -----------------------------
// const fetchItems = async (cycleId) => {
//   if (!cycleId) return;

//   try {
//     setLoading(true);

//     // ✅ 1. Fetch cycle_items (NO JOIN)
//     const { data: cycleData, error: cycleError } = await supabase
//       .from("cycle_items")
//       .select(`
//         id,
//         sl_no,
//         item_id,
//         count_batch_no,
//         sys_batch_no,
//         rate,
//         item_master(item_name)
//       `)
//       .eq("cycle_id", cycleId);

//     if (cycleError) throw cycleError;

//     // ✅ 2. Fetch stock_units separately
//     const { data: stockData, error: stockError } = await supabase
//       .from("stock_units")
//       .select("item_id, batch_serial, purchase_rate");

//     if (stockError) throw stockError;

//     // ✅ 3. Create lookup map
//     const stockMap = {};
//     stockData.forEach((s) => {
//       const key = `${s.item_id}_${s.batch_serial}`;
//       stockMap[key] = Number(s.purchase_rate || 0);
//     });

//     // ✅ 4. Merge both
//     const normalized = (cycleData || []).map((row) => {
//       const batch =
//         row.count_batch_no ||
//         row.sys_batch_no ||
//         "NO BATCH";

//       const key = `${row.item_id}_${batch}`;

//       return {
//         ...row,
//         rate: Number(row.rate ?? 0),
//         purchase_rate: Number(stockMap[key] ?? 0),
//         batch,
//       };
//     });

//     processData(normalized);

//   } catch (err) {
//     console.error(err);
//     message.error("Failed to load data ❌");
//   } finally {
//     setLoading(false);
//   }
// };

//   // -----------------------------
//   // MAIN LOGIC (🔥 CORE)
//   // -----------------------------
// const processData = (rows) => {
//   const grouped = {};
//   const newRateMap = {};
//   const finalRows = [];

//   const seen = new Set(); // prevent duplicates
//   const shownConflict = new Set(); // prevent modal spam

//   // -----------------------------
//   // GROUP BY ITEM
//   // -----------------------------
//   rows.forEach((row) => {
//     if (!grouped[row.item_id]) {
//       grouped[row.item_id] = [];
//     }
//     grouped[row.item_id].push(row);
//   });

//   // -----------------------------
//   // PROCESS EACH ITEM
//   // -----------------------------
//   Object.values(grouped).forEach((items) => {
//     // 🔥 PRIORITY: stock_units.purchase_rate > cycle_items.rate
//     const rates = items
//       .map((i) => {
//         const cycleRate = Number(i.rate);
//         const stockRate = Number(i.purchase_rate);

//         return stockRate > 0 ? stockRate : cycleRate;
//       })
//       .filter((r) => r > 0);

//     const uniqueRates = [...new Set(rates)];

//     // -----------------------------
//     // CASE 1: SAME RATE → AUTO FILL
//     // -----------------------------
//     if (rates.length > 0 && uniqueRates.length === 1) {
//       const autoRate = uniqueRates[0];

//       items.forEach((row) => {
//         if (Number(row.rate) <= 0) {
//           const key = `${row.item_id}_${row.batch}`;

//           if (seen.has(key)) return;
//           seen.add(key);

//           newRateMap[key] = autoRate;

//           finalRows.push({
//             ...row,
//             suggestedRate: autoRate,
//             status: "auto",
//           });
//         }
//       });
//     }

//     // -----------------------------
//     // CASE 2: MULTIPLE RATES → CONFLICT
//     // -----------------------------
//     else if (uniqueRates.length > 1) {
//       const itemId = items[0]?.item_id;

//       // 🔥 show modal only once per item
//       if (!shownConflict.has(itemId)) {
//         shownConflict.add(itemId);

//         Modal.confirm({
//           title: "Multiple Rates Found",
//           content: `${items[0]?.item_master?.item_name} has different batch rates (${uniqueRates.join(
//             ", "
//           )}). Please choose manually.`,
//         });
//       }

//       items.forEach((row) => {
//         if (Number(row.rate) <= 0) {
//           const key = `${row.item_id}_${row.batch}`;

//           if (seen.has(key)) return;
//           seen.add(key);

//           finalRows.push({
//             ...row,
//             suggestedRate: null,
//             status: "conflict",
//             rateOptions: uniqueRates,
//           });
//         }
//       });
//     }

//     // -----------------------------
//     // CASE 3: NO RATE → MANUAL
//     // -----------------------------
//     else {
//       items.forEach((row) => {
//         if (Number(row.rate) <= 0) {
//           const key = `${row.item_id}_${row.batch}`;

//           if (seen.has(key)) return;
//           seen.add(key);

//           finalRows.push({
//             ...row,
//             suggestedRate: null,
//             status: "manual",
//           });
//         }
//       });
//     }
//   });

//   // -----------------------------
//   // UPDATE STATE
//   // -----------------------------
//   setRateMap(newRateMap);
//   setData(finalRows);
// };

//   useEffect(() => {
//     fetchCycles();
//   }, []);

//   useEffect(() => {
//     if (cycleId) {
//       fetchItems(cycleId);
//     }
//   }, [cycleId]);

//   // -----------------------------
//   // HANDLE INPUT CHANGE
//   // -----------------------------
//   const handleRateChange = (record, value) => {
//     const key = `${record.item_id}_${record.batch}`;
//     setRateMap((prev) => ({
//       ...prev,
//       [key]: value,
//     }));
//   };

//   // -----------------------------
//   // SAVE SINGLE
//   // -----------------------------
//   const handleSave = async (record) => {
//     try {
//       const key = `${record.item_id}_${record.batch}`;
//       const rate = rateMap[key];

//       if (!rate || rate <= 0) {
//         message.warning("Enter valid rate");
//         return;
//       }

//       const { error } = await supabase.rpc("update_purchase_rate_full", {
//         p_item_id: record.item_id,
//         p_batch: record.batch,
//         p_rate: rate,
//       });

//       if (error) throw error;

//       message.success("Rate updated ✅");

//       setData((prev) =>
//         prev.filter(
//           (r) => !(r.item_id === record.item_id && r.batch === record.batch),
//         ),
//       );
//     } catch (err) {
//       console.error(err);
//       message.error("Update failed ❌");
//     }
//   };

//   // -----------------------------
//   // BULK SAVE
//   // -----------------------------
//   const handleBulkSave = async () => {
//     try {
//       const entries = Object.entries(rateMap);

//       if (entries.length === 0) {
//         message.warning("No rates entered");
//         return;
//       }

//       message.loading({ content: "Updating...", key: "bulk" });

//       for (const [key, rate] of entries) {
//         const [item_id, batch] = key.split("_");

//         await supabase.rpc("update_purchase_rate_full", {
//           p_item_id: Number(item_id),
//           p_batch: batch,
//           p_rate: rate,
//         });
//       }

//       message.success({ content: "All rates updated ✅", key: "bulk" });

//       setRateMap({});
//       fetchItems(cycleId);
//     } catch (err) {
//       console.error(err);
//       message.error({ content: "Bulk update failed ❌", key: "bulk" });
//     }
//   };

//   const filteredData = data.filter((row) => {
//     const itemName = row.item_master?.item_name?.toLowerCase() || "";
//     const slNo = String(row.sl_no || "");

//     return (
//       itemName.includes(searchText.toLowerCase()) || slNo.includes(searchText)
//     );
//   });

//   // -----------------------------
//   // TABLE COLUMNS
//   // -----------------------------
//   const columns = [
//     {
//       title: "SL No",
//       dataIndex: "sl_no",
//       width: 80,
//     },
//     {
//       title: "Item Name",
//       render: (_, r) => r.item_master?.item_name || "-",
//     },
//     {
//       title: "Batch",
//       dataIndex: "batch",
//     },
//     {
//       title: "Current Rate",
//       render: (_, r) => {
//         const current = r.rate || r.purchase_rate || 0;

//         return (
//           <div>
//             <Text type="danger">{current}</Text>
//             {!r.rate && r.purchase_rate > 0 && (
//               <div style={{ fontSize: 11, color: "#888" }}>(from stock)</div>
//             )}
//           </div>
//         );
//       },
//     },
//     {
//       title: "Suggested",
//       render: (_, r) => {
//         if (r.status === "auto") {
//           return <Tag color="green">{r.suggestedRate}</Tag>;
//         }
//         if (r.status === "conflict") {
//           return (
//             <Select
//               placeholder="Select"
//               style={{ width: 100 }}
//               onChange={(val) => handleRateChange(r, val)}
//               options={(r.rateOptions || []).map((v) => ({
//                 label: v,
//                 value: v,
//               }))}
//             />
//           );
//         }
//         return <Text type="warning">Manual</Text>;
//       },
//     },
//     {
//       title: "Enter Rate",
//       render: (_, record) => (
//         <InputNumber
//           min={0}
//           style={{ width: "100%" }}
//           placeholder="Enter rate"
//           value={rateMap[`${record.item_id}_${record.batch}`]}
//           onChange={(val) => handleRateChange(record, val)}
//         />
//       ),
//     },
//     {
//       title: "Action",
//       render: (_, record) => (
//         <Button type="primary" onClick={() => handleSave(record)}>
//           Save
//         </Button>
//       ),
//     },
//   ];

//   return (
//     <div style={{ padding: 16 }}>
//       <Card title="Update Purchase Rates (Smart System)">
//         <Select
//           style={{ width: "100%", marginBottom: 12 }}
//           placeholder="Select Cycle"
//           value={cycleId}
//           onChange={(val) => setCycleId(val)}
//           options={cycles.map((c) => ({
//             value: c.id,
//             label: `Cycle #${c.id}`,
//           }))}
//         />

//         <div style={{ marginBottom: 10, textAlign: "right" }}>
//           <Button type="primary" onClick={handleBulkSave}>
//             💾 Save All
//           </Button>
//         </div>

//         <Input.Search
//           placeholder="Search by Item / SL No"
//           allowClear
//           enterButton
//           style={{ width: 350, marginBottom: 10 }}
//           onChange={(e) => setSearchText(e.target.value)}
//         />

//         <Table
//           dataSource={filteredData}
//           columns={columns}
//           rowKey={(r) => `${r.item_id}_${r.batch}`}
//           loading={loading}
//           pagination={{ pageSize: 10 }}
//         />
//       </Card>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Table,
  InputNumber,
  Button,
  message,
  Typography,
  Space,
  Tag,
} from "antd";
import { supabase } from "../../lib/supabase";

const { Text } = Typography;

export default function RateFixPage() {
  const [data, setData] = useState([]);
  const [rateMap, setRateMap] = useState({});
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // FETCH STOCK WITH ZERO RATE
  // -----------------------------
  const fetchData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("stock_units")
        .select(
          `
        id,
        item_id,
        batch_serial,
        purchase_rate,
        sl_no,
        item_master!stock_units_item_id_fkey(item_name)
        `,
        )
        .or("purchase_rate.is.null,purchase_rate.eq.0");

      if (error) throw error;

      const rows = data || [];

      // -----------------------------------
      // ✅ STEP 1: UNIQUE BATCH COUNT PER ITEM
      // -----------------------------------
      const itemBatchMap = {};

      rows.forEach((row) => {
        const itemKey = row.item_id;
        const batch = row.batch_serial || "NO BATCH";

        if (!itemBatchMap[itemKey]) {
          itemBatchMap[itemKey] = new Set();
        }

        itemBatchMap[itemKey].add(batch); // ✅ unique batch
      });

      // -----------------------------------
      // ✅ STEP 2: ATTACH COUNT TO ROW
      // -----------------------------------
      const finalData = rows.map((row) => {
        const itemKey = row.item_id;

        return {
          ...row,
          recordCount: itemBatchMap[itemKey]?.size || 1, // ✅ FIXED
        };
      });

      setData(finalData);
    } catch (err) {
      console.error(err);
      message.error("Failed to load data ❌");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  // -----------------------------
  // HANDLE RATE CHANGE
  // -----------------------------
  const handleChange = (id, value) => {
    setRateMap((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // -----------------------------
  // SAVE SINGLE
  // -----------------------------
  const handleSave = async (record) => {
    try {
      const rate = rateMap[record.id];

      if (!rate || rate <= 0) {
        message.warning("Enter valid rate");
        return;
      }

      const { error } = await supabase
        .from("stock_units")
        .update({ purchase_rate: rate })
        .eq("id", record.id);

      if (error) throw error;

      message.success("Updated ✅");

      setData((prev) => prev.filter((r) => r.id !== record.id));
    } catch (err) {
      console.error(err);
      message.error("Update failed ❌");
    }
  };

  // -----------------------------
  // BULK SAVE
  // -----------------------------
  const handleBulkSave = async () => {
    try {
      const entries = Object.entries(rateMap);

      if (entries.length === 0) {
        message.warning("No data to save");
        return;
      }

      message.loading({ content: "Updating...", key: "bulk" });

      for (const [id, rate] of entries) {
        if (!rate || rate <= 0) continue;

        await supabase
          .from("stock_units")
          .update({ purchase_rate: rate })
          .eq("id", id);
      }

      message.success({ content: "All updated ✅", key: "bulk" });

      setRateMap({});
      fetchData();
    } catch (err) {
      console.error(err);
      message.error({ content: "Bulk update failed ❌", key: "bulk" });
    }
  };

  // -----------------------------
  // SYNC TO CYCLE
  // -----------------------------
  const handleSync = async () => {
    try {
      message.loading({ content: "Syncing...", key: "sync" });

      const { error } = await supabase.rpc("sync_cycle_rates");

      if (error) throw error;

      message.success({ content: "Cycle updated ✅", key: "sync" });
    } catch (err) {
      console.error(err);
      message.error({ content: "Sync failed ❌", key: "sync" });
    }
  };

  // -----------------------------
  // TABLE
  // -----------------------------
  const columns = [
    {
      title: "SL No",
      dataIndex: "sl_no",
      width: 80,
    },
    {
      title: "Item Name",
      render: (_, r) => r.item_master?.item_name || "-",
    },
    {
      title: "Records",
      dataIndex: "recordCount",
      render: (val, r) => (
        <Tag
          color="blue"
          onClick={() => openModal(r.item_id)}
          style={{ cursor: "pointer" }}
        >
          {val}
        </Tag>
      ),
    },
    {
      title: "Batch",
      dataIndex: "batch_serial",
    },
    {
      title: "Current Rate",
      render: (_, r) => <Text type="danger">{r.purchase_rate || 0}</Text>,
    },
    {
      title: "Enter Rate",
      render: (_, r) => (
        <InputNumber
          min={0}
          style={{ width: "100%" }}
          placeholder="Enter rate"
          value={rateMap[r.id]}
          onChange={(val) => handleChange(r.id, val)}
        />
      ),
    },
    {
      title: "Action",
      render: (_, r) => (
        <Button type="primary" onClick={() => handleSave(r)}>
          Save
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card title="Fix Purchase Rates (Inventory Master)">
        <Space style={{ marginBottom: 12 }}>
          <Button type="primary" onClick={handleBulkSave}>
            💾 Save All
          </Button>

          <Button type="default" onClick={handleSync}>
            🔄 Sync to Cycle
          </Button>
        </Space>

        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
