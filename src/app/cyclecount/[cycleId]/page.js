// "use client";

// import { useState, useEffect, useMemo } from "react";
// import { supabase } from "../../lib/supabase";
// import { useParams } from "next/navigation";
// import {
//   Card,
//   Row,
//   Col,
//   Divider,
//   message,
//   Tabs,
//   Typography,
//   Table,
//   Tag,
//   InputNumber,
//   DatePicker,
//   Input,
//   Button,
//   AutoComplete,
//   Select,
//   Badge,
// } from "antd";
// import {
//   PlusOutlined,
//   DeleteOutlined,
//   SaveOutlined,
//   PrinterOutlined,
//   CheckCircleOutlined,
//   CheckOutlined,
// } from "@ant-design/icons";
// import dayjs from "dayjs";
// import { useSearchParams } from "next/navigation";

// const { Text, Title } = Typography;
// // const { TabPane } = Tabs;

// const thermalStyles = `
// @media print {
//   body * { visibility: hidden; }
//   .thermal-slip, .thermal-slip * { visibility: visible; }
//   .thermal-slip {
//     position: absolute;
//     left: 0;
//     top: 0;
//     width: 80mm;
//     padding: 2mm;
//     background: #fff;
//   }
//   .no-print { display: none !important; }

//   .thermal-slip .ant-input,
//   .thermal-slip .ant-picker,
//   .thermal-slip .ant-input-number,
//   .thermal-slip .ant-input-number-input-wrap,
//   .thermal-slip .ant-select-selector {
//     border: none !important;
//     box-shadow: none !important;
//     background: transparent !important;
//     padding: 0 !important;
//   }

//   .thermal-slip .ant-input-number-handler-wrap {
//     display: none !important;
//   }

//   .thermal-slip .ant-input-disabled,
//   .thermal-slip .ant-picker-disabled,
//   .thermal-slip .ant-input-number-disabled,
//   .thermal-slip .ant-input-number-input {
//     color: #000 !important;
//     -webkit-text-fill-color: #000 !important;
//     opacity: 1 !important;
//   }

//   @page { margin: 0; size: auto; }
// }
// `;

// export default function YearEndPage() {
//   const params = useParams();
//   const cycleId = params?.cycleId;
//   const searchParams = useSearchParams();
//   const teamId = searchParams.get("teamId");

//   const [mounted, setMounted] = useState(false);
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [team, setTeam] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [session, setSession] = useState(null);

//   const [products, setProducts] = useState([]);
//   const [selectedProduct, setSelectedProduct] = useState(null);
//   const [countingUnits, setCountingUnits] = useState([]);
//   const [activeTab, setActiveTab] = useState("all");
//   const [selectedWarehouse, setSelectedWarehouse] = useState(null);
//   const [warehouseBatches, setWarehouseBatches] = useState([]);
//   const [allocationTab, setAllocationTab] = useState("pending");
//   const [selectedBatch, setSelectedBatch] = useState(null);
//   const [allocations, setAllocations] = useState([]);
//   const [searchText, setSearchText] = useState("");
//   const [assistants, setAssistants] = useState([]);
//   const [lastStopTime, setLastStopTime] = useState(null);

//   const tabLabel = (text, count) => (
//     <div style={{ display: "flex", gap: 6 }}>
//       <span>{text}</span>
//       <span style={{ fontWeight: 500 }}>{count}</span>
//     </div>
//   );

//   const [allocationForm, setAllocationForm] = useState({
//     rack: null,
//     compartment: null,
//     qty: null,
//   });

//   const currentBatch = warehouseBatches.find(
//     (b) => b.batch_no === selectedBatch?.batch_no,
//   );

//   const fetchLoggedInTeam = async () => {
//     try {
//       if (!teamId) {
//         message.error("Invalid access");
//         window.location.href = "/";
//         return;
//       }

//       const { data, error } = await supabase
//         .from("counting_sessions")
//         .select(`
//         id,
//         sessions_start,
//         sessions_stop,
//         last_activity,
//         team_id,
//         teams (
//           id,
//           username,
//           team_leader,
//           assistants
//         )
//       `)
//         .eq("cycle_id", Number(cycleId))
//         .eq("team_id", Number(teamId))
//         .is("sessions_stop", null)
//         .maybeSingle();

//       if (error) throw error;

//       if (!data) {
//         message.error("Please login first");
//         window.location.href = "/";
//         return;
//       }

//       const row = data;

//       console.log("TEAM DATA:", row.teams);

//       setTeam(row.teams);
//       setSession(row);
//       setIsLoggedIn(true);

//       const { data: lastSession } = await supabase
//         .from("counting_sessions")
//         .select("sessions_stop")
//         .eq("cycle_id", Number(cycleId))
//         .eq("team_id", Number(teamId))
//         .not("sessions_stop", "is", null)
//         .order("id", { ascending: false })
//         .limit(1)
//         .maybeSingle();

//       setLastStopTime(lastSession?.sessions_stop || null);

//       // ✅ NEW: Parse assistants safely
//       try {
//         const parsedAssistants = JSON.parse(
//           row.teams?.assisatants || "[]"
//         );
//         setAssistants(row.teams?.assistants || []);
//       } catch (e) {
//         console.error("Assistant parse error:", e);
//         setAssistants([]);
//       }

//     } catch (err) {
//       console.log("ERROR:", err);
//       console.log("❌ MESSAGE:", err?.message);
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       if (!session?.id) {
//         message.error("No active session");
//         return;
//       }

//       const { error } = await supabase
//         .from("counting_sessions")
//         .update({
//           sessions_stop: new Date(),
//         })
//         .eq("id", session.id);

//       if (error) throw error;

//       message.success("Logged out successfully");

//       setIsLoggedIn(false);
//       window.location.href = "/cyclecount";
//     } catch (err) {
//       console.error("Logout error:", err);
//       message.error("Logout failed");
//     }
//   };

//   useEffect(() => {
//     setMounted(true);
//     fetchLoggedInTeam(); // ✅ ALWAYS check session from DB
//   }, [cycleId]);

//   useEffect(() => {
//     setSelectedWarehouse(null);
//   }, [selectedProduct]);

//   useEffect(() => {
//     if (isLoggedIn && cycleId) {
//       fetchInventory();
//     }
//   }, [isLoggedIn, cycleId]);

//   useEffect(() => {
//     if (!selectedProduct) return;

//     const relevantUnits = (selectedProduct.systemUnits || []).filter(
//       (u) =>
//         Number(u.sys_quantity || 0) > 0 &&
//         (u.status !== "submitted" || Number(u.count_quantity || 0) > 0)
//     );

//     const pendingUnits = relevantUnits.filter(
//       (u) => u.status === "pending" || u.status === "editable" || u.status === "recount"
//     );

//     if (pendingUnits.length === 0) {
//       setCountingUnits([]);
//       return;
//     }

//     setCountingUnits(
//       pendingUnits.map((unit, index) => ({
//         tempId: `system-${index}`,
//         id: unit.id,
//         batch_no: unit.count_batch_no || unit.sys_batch_no || "",
//         expiry_date:
//           unit.count_expiry_date || unit.sys_expiry_date || null,

//         quantity:
//           activeTab === "editable"
//             ? Number(unit.count_quantity ?? 0)
//             : null,

//         mrp: unit.mrp || null,

//         isSystem: true,
//         status: unit.status,
//       }))
//     );

//   }, [selectedProduct, activeTab]); // ✅ ALWAYS SAME LENGTH

//   const totals = useMemo(() => {
//     if (!selectedProduct) return { history: 0, pending: 0, total: 0 };
//     const history = selectedProduct.systemUnits
//       .filter((u) => u.status === "submitted")
//       .reduce((s, u) => s + (Number(u.count_quantity) || 0), 0);
//     const pending = countingUnits.reduce(
//       (s, u) => s + (Number(u.quantity) || 0),
//       0,
//     );
//     return { history, pending, total: history + pending };
//   }, [selectedProduct, countingUnits]);

//   const fetchInventory = async () => {
//     setLoading(true);

//     try {
//       let allData = [];
//       let from = 0;
//       const limit = 1000;

//       while (true) {
//         const { data, error } = await supabase
//           .from("cycle_items")
//           .select(
//             `
//           id,
//           cycle_id,
//           item_id,
//           status,
//           sys_batch_no,
//           sys_expiry_date,
//           sys_quantity,
//           count_batch_no,
//           count_expiry_date,
//           count_quantity,
//           counted_at,
//           sl_no,
//           mrp,
//           item_master (
//             id,
//             item_name

//           )
//         `,
//           ).eq("cycle_id", Number(cycleId))
//           .range(from, from + limit - 1);

//         if (error) throw error;

//         allData = [...allData, ...data];

//         // ✅ stop when last page reached
//         if (data.length < limit) break;

//         from += limit;
//       }

//       console.log("✅ Total fetched rows:", allData.length);

//       // ✅ GROUPING LOGIC (same as your existing)
//       const grouped = allData.reduce((acc, curr) => {
//         const itemId = curr.item_id;

//         if (!acc[itemId]) {
//           acc[itemId] = {
//             ...curr.item_master,
//             sl_no: curr.sl_no,
//             cycle_id: curr.cycle_id,
//             status: curr.status,
//             systemUnits: [],
//           };
//         }

//         acc[itemId].systemUnits.push(curr);

//         if (curr.status === "pending") {
//           acc[itemId].status = "pending";
//         } else if (curr.status === "editable") {
//           acc[itemId].status = "editable";
//         }

//         return acc;
//       }, {});

//       const finalData = Object.values(grouped);

//       console.log("✅ Unique items:", finalData.length);

//       setProducts(finalData);

//       return finalData; // important for reselect after submit
//     } catch (err) {
//       console.error(err);
//       message.error("Database Error");
//       return [];
//     } finally {
//       setLoading(false);
//     }
//   };

//   const updateField = (id, f, v) =>
//     setCountingUnits((prev) =>
//       prev.map((u) => (u.tempId === id ? { ...u, [f]: v } : u)),
//     );

//   // Restore Tabs logic

//   const handleSubmit = async () => {
//     setLoading(true);

//     try {
//       const processedUnits = countingUnits.map((u) => {
//         if (u.isSystem) {
//           const original = selectedProduct.systemUnits.find(
//             (s) => s.id === u.id
//           );

//           const sysQty = Number(original?.sys_quantity || 0);

//           if (u.quantity === null && sysQty === 0) {
//             return {
//               ...u,
//               quantity: 0,
//             };
//           }
//         }

//         return u;
//       });

//       console.log("FINAL UNITS:", processedUnits);

//       for (const unit of processedUnits) {
//         if (unit.quantity === null && !unit.isSystem) continue;

//         const payload = {
//           count_quantity: unit.quantity ?? 0,
//           count_batch_no: unit.batch_no || null,
//           count_expiry_date: unit.expiry_date
//             ? dayjs(unit.expiry_date).format("YYYY-MM-DD")
//             : null,
//           status: "submitted",
//           counted_at: new Date(),

//           // ✅ FIX ADDED
//           team_id: Number(teamId),
//           sl_no: selectedProduct.sl_no,
//           mrp: unit.mrp ?? null,
//         };

//         console.log("📦 PAYLOAD:", payload);

//         if (unit.isSystem) {
//           await supabase
//             .from("cycle_items")
//             .update(payload)
//             .eq("id", unit.id);
//         } else {
//           await supabase.from("cycle_items").insert([
//             {
//               ...payload,

//               // required for new rows
//               cycle_id: selectedProduct.cycle_id,
//               item_id: selectedProduct.id,
//             },
//           ]);
//         }
//       }

//       // 🔥 ZERO SYSTEM BATCH FIX ALSO NEEDS TEAM + SL
//       const zeroSystemBatches = selectedProduct.systemUnits.filter(
//         (u) =>
//           Number(u.sys_quantity || 0) === 0 &&
//           u.status !== "submitted"
//       );

//       console.log("ZERO BATCHES:", zeroSystemBatches);

//       for (const u of zeroSystemBatches) {
//         await supabase
//           .from("cycle_items")
//           .update({
//             count_quantity: 0,
//             count_batch_no: u.sys_batch_no,
//             count_expiry_date: u.sys_expiry_date || null,
//             status: "submitted",
//             counted_at: new Date(),

//             // ✅ IMPORTANT FIX
//             team_id: Number(teamId),
//             sl_no: selectedProduct.sl_no,
//           })
//           .eq("id", u.id);
//       }

//       message.success("Logs Saved");

//       const selectedId = selectedProduct.id;

//       const updatedProducts = await fetchInventory();
//       const updated = updatedProducts.find((p) => p.id === selectedId);

//       setSelectedProduct(updated || null);
//     } catch (e) {
//       console.error(e);
//       message.error("Error Saving");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const tabCounts = useMemo(() => {
//     return {
//       all: products.length,

//       pending: products.filter((p) =>
//         p.systemUnits.some((u) => u.status === "pending")
//       ).length,

//       submitted: products.filter((p) =>
//         p.systemUnits.every((u) => u.status === "submitted")
//       ).length,

//       editable: products.filter((p) =>
//         p.systemUnits.some((u) => u.status === "editable")
//       ).length,

//       recount: products.filter((p) =>
//         p.systemUnits.some(
//           (u) =>
//             u.status === "recount" &&
//             Number(u.count_quantity || 0) !== Number(u.sys_quantity || 0)
//         )
//       ).length,
//     };
//   }, [products]);

//   const filteredItems = useMemo(() => {
//     let data;

//     if (activeTab === "all") {
//       data = products;
//     }
//     else if (activeTab === "pending") {
//       data = products.filter((p) =>
//         p.systemUnits.some((u) => u.status === "pending")
//       );
//     }
//     else if (activeTab === "submitted") {
//       data = products.filter((p) =>
//         p.systemUnits.every((u) => u.status === "submitted")
//       );
//     }
//     else if (activeTab === "editable") {
//       data = products.filter((p) =>
//         p.systemUnits.some((u) => u.status === "editable")
//       );
//     }
//     else if (activeTab === "recount") {
//       data = products.filter((p) =>
//         p.systemUnits.some(
//           (u) =>
//             u.status === "recount" &&
//             Number(u.count_quantity || 0) !== Number(u.sys_quantity || 0)
//         )
//       );
//     }
//     else {
//       data = [];
//     }

//     if (!searchText) return data;

//     return data.filter((p) =>
//       p.item_name?.toLowerCase().includes(searchText.toLowerCase())
//     );
//   }, [products, activeTab, searchText]);

//   const getOptions = (value) => {
//     if (!selectedProduct) return [];

//     const unique = new Map();

//     selectedProduct.systemUnits.forEach((u) => {
//       const batch = u.sys_batch_no || u.count_batch_no;
//       const expiry = u.sys_expiry_date || u.count_expiry_date;

//       if (!batch) return;

//       if (!unique.has(batch)) {
//         unique.set(batch, expiry);
//       }
//     });

//     return Array.from(unique.entries())
//       .filter(([batch]) =>
//         !value || batch.toLowerCase().includes(value.toLowerCase())
//       )
//       .map(([batch, expiry]) => ({
//         value: batch,
//         label: (
//           <div style={{ display: "flex", justifyContent: "space-between" }}>
//             <span>{batch}</span>
//             <span style={{ fontSize: 11, color: "#888" }}>
//               {expiry ? dayjs(expiry).format("DD-MM-YY") : ""}
//             </span>
//           </div>
//         ),
//         expiry,
//       }));
//   };

//   const loadWarehouseBatches = async (warehouseId) => {
//     // You should fetch this from DB later
//     // For now simulate from submitted counts
//     console.log("🔥 loadWarehouseBatches called", warehouseId);

//     const grouped = {};

//     selectedProduct.systemUnits
//       .filter((u) => u.status === "submitted")
//       .forEach((u) => {
//         const qty = Number(u.count_quantity) || 0;
//         if (qty === 0) return; // 🚀 skip zero qty

//         const batch = u.count_batch_no || "N/A";

//         if (!grouped[batch]) grouped[batch] = 0;
//         grouped[batch] += qty;
//       });

//     const formatted = Object.entries(grouped).map(([batch, qty]) => ({
//       batch_no: batch,
//       available_qty: qty,
//       allocations: [{ rack: "", compartment: "", qty: null }],
//     }))
//       .filter((b) => b.available_qty > 0); // 🚀 EXTRA SAFETY

//     console.log("Grouped batches:", grouped);
//     console.log("Formatted batches:", formatted);

//     setWarehouseBatches(formatted);
//   };

//   const compartments = ["C1", "C2", "C3", "C4", "C5", "C6"];

//   const finishedBatches = warehouseBatches.filter((b) => b.finished);

//   const getRemainingQty = (batchNo) => {
//     const batch = warehouseBatches.find((b) => b.batch_no === batchNo);
//     if (!batch) return 0;

//     const allocated = (batch.allocations || []).reduce(
//       (sum, a) => sum + Number(a.qty || 0),
//       0,
//     );

//     return Number(batch.available_qty || 0) - allocated;
//   };
//   const confirmAllocation = () => {
//     if (!selectedBatch) return;

//     const remaining = getRemainingQty(selectedBatch.batch_no);

//     // Double-check qty before proceeding
//     if (allocationForm.qty > remaining) {
//       message.error("Quantity exceeds remaining stock!");
//       return;
//     }

//     const { rack, compartment, qty } = allocationForm;

//     if (!rack || !compartment || !qty) {
//       message.error("Rack, Compartment and Qty required");
//       return;
//     }

//     if (qty > remaining) {
//       message.error(`Only ${remaining} available`);
//       return;
//     }

//     const newAllocation = {
//       id: crypto.randomUUID(),
//       batch_no: selectedBatch.batch_no,
//       rack,
//       compartment,
//       qty,
//     };

//     setWarehouseBatches((prev) =>
//       prev.map((b) => {
//         if (b.batch_no !== selectedBatch.batch_no) return b;
//         return {
//           ...b,
//           allocations: [...(b.allocations || []), newAllocation],
//           // Mark as finished if remaining will be 0
//           finished:
//             Number(b.available_qty) -
//             ((b.allocations?.reduce((s, a) => s + a.qty, 0) || 0) + qty) ===
//             0,
//         };
//       }),
//     );

//     setAllocationForm({ rack: null, compartment: null, qty: null });
//     message.success("Allocated successfully");
//   };

//   const allAllocations = useMemo(() => {
//     return warehouseBatches.flatMap((b) => b.allocations || []);
//   }, [warehouseBatches]);

//   const filteredAllocations = (allAllocations || []).filter(
//     // (a) => a && a.batch_no && a.qty,
//     (a) => a && a.batch_no && a.qty && Number(a.qty) > 0
//   );
//   const allFinished = useMemo(() => {
//     return (
//       warehouseBatches.length > 0 &&
//       warehouseBatches.every((b) => getRemainingQty(b.batch_no) === 0)
//     );
//   }, [warehouseBatches]);

//   const remaining = getRemainingQty(selectedBatch?.batch_no);

//   const qtyError = allocationForm.qty && allocationForm.qty > remaining;

//   const modernStyles = `
// .modern-row:hover {
//   background: #f0f5ff !important;
//   cursor: pointer;
// }

// .selected-row {
//   background: #e6f4ff !important;
// }
// `;

//   if (!mounted || !isLoggedIn) {
//     return null;
//   }

//   return (
//     <div
//       style={{
//         padding: 16,
//         background: "#f5f7fa",
//         minHeight: "100vh",
//       }}
//     >
//       <style>{thermalStyles}</style>
//       <style>{modernStyles}</style>
//       {isLoggedIn && (
//         <Card

//           variant={false}
//           style={{
//             borderRadius: 12,
//             boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
//           }}
//         >
//           <Row justify="space-between" align="middle" style={{ marginBottom: 10 }}>

//             {/* LEFT SIDE */}
//             <div>
//               <Title level={5} style={{ margin: 0 }}>
//                 Cycle Counting
//               </Title>
//               <Text type="secondary" style={{ fontSize: 12 }}>
//                 Cycle ID: {cycleId}
//               </Text>
//             </div>

//             {/* RIGHT SIDE (🔥 THIS IS WHAT YOU WANT) */}
//             {team && session && (
//               <div style={{ textAlign: "right" }}>

//                 <div>
//                   <Tag color="blue">
//                     👤 {team.username}
//                   </Tag>

//                   <div>

//                   </div>

//                   {/* ✅ Assistants */}
//                   {assistants.length > 0 && (
//                     <div style={{ marginTop: 4 }}>
//                       {assistants.map((a) => (
//                         <Tag key={a.id} color="green">
//                           🧑 {a.name}
//                         </Tag>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 <div style={{ fontSize: 11, marginTop: 4 }}>
//                   <Text type="secondary">
//                     🟢 Started: {dayjs(session.sessions_start).format("DD-MM-YY hh:mm")}
//                   </Text>
//                 </div>

//                 {/* <div style={{ fontSize: 11 }}>
//                   <Text type="secondary">
//                     ⏱ Last Stop:{" "}
//                     {lastStopTime
//                       ? dayjs(lastStopTime).format("DD-MM-YY hh:mm")
//                       : "No previous session"}
//                   </Text>
//                 </div> */}

//                 <Button
//                   danger
//                   size="small"
//                   style={{ marginTop: 6 }}
//                   onClick={handleLogout}
//                 >
//                   Logout
//                 </Button>
//               </div>
//             )}
//           </Row>
//           <Row gutter={24}>
//             <Col span={10} className="no-print">
//               <Input
//                 placeholder="Search item..."
//                 allowClear
//                 value={searchText}
//                 onChange={(e) => setSearchText(e.target.value)}
//                 style={{ marginBottom: 10 }}
//               />

//               {/* RESTORED TABS */}
//               <Tabs
//                 activeKey={activeTab}
//                 onChange={(key) => {
//                   setActiveTab(key);
//                   setSelectedProduct(null); // 👈 Reset selection when tab changes
//                 }}

//                 items={[
//                   {
//                     key: "all",
//                     label: (
//                       <span> All{" "}
//                         <Badge count={tabCounts.all} color="blue" overflowCount={999999}>
//                         </Badge>
//                       </span>
//                     ),
//                   },
//                   {
//                     key: "pending",
//                     label: (
//                       <span> Pending{" "}
//                         <Badge count={tabCounts.pending} color="orange" overflowCount={999999}>
//                         </Badge>
//                       </span>
//                     ),
//                   },
//                   {
//                     key: "submitted",
//                     label: (
//                       <span> Submitted{" "}
//                         <Badge count={tabCounts.submitted} color="green" overflowCount={999999}>
//                         </Badge>
//                       </span>
//                     ),
//                   },
//                   {
//                     key: "recount",
//                     label: (
//                       <span> Recount{" "}
//                         <Badge count={tabCounts.recount} color="purple" overflowCount={999999}>
//                         </Badge>
//                       </span>
//                     ),
//                   },
//                   {
//                     key: "editable",
//                     label: (
//                       <span> Editable{" "}
//                         <Badge count={tabCounts.editable} color="yellow" overflowCount={999999}>
//                         </Badge>
//                       </span>
//                     ),
//                   },
//                 ]}
//               />
//               <Table
//                 dataSource={filteredItems}
//                 // columns={[{ title: "Item Name", dataIndex: "item_name" }]}
//                 rowKey="id"
//                 rowClassName={() => "modern-row"}
//                 onRow={(r) => ({ onClick: () => setSelectedProduct(r) })}
//                 pagination={false}
//                 size="small"
//                 scroll={{ y: "60vh" }}
//                 style={{ background: "#fff", borderRadius: 8 }}
//                 columns={[
//                   {
//                     title: "SL",
//                     dataIndex: "sl_no",
//                     width: 60,
//                     render: (val) => <Text style={{ fontSize: 12 }}>{val}</Text>,
//                   },
//                   {
//                     title: "Item",
//                     dataIndex: "item_name",
//                     render: (text, record) => (
//                       <div>
//                         <div style={{ fontWeight: 500 }}>{text}</div>
//                         <div style={{ fontSize: 11, color: "#888" }}>
//                           {record.systemUnits.length} records
//                         </div>
//                       </div>
//                     ),
//                   },
//                 ]}
//               />
//             </Col>

//             <Col span={14} className="thermal-slip">
//               {selectedProduct ? (
//                 <div>
//                   <div
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                       marginBottom: 16,
//                     }}
//                   >
//                     <div style={{ marginBottom: 10 }}>
//                       <Title level={5} style={{ margin: 0 }}>
//                         {selectedProduct.sl_no} - {selectedProduct.item_name}
//                       </Title>
//                       <Text type="secondary" style={{ fontSize: 12 }}>
//                         Cycle ID: {selectedProduct.cycle_id}
//                       </Text>
//                     </div>

//                     <div className="no-print">
//                       <Button
//                         icon={<PrinterOutlined />}
//                         onClick={() => window.print()}
//                         style={{ marginRight: 8 }}
//                       >
//                         Print Slip
//                       </Button>
//                       <Button
//                         icon={<PlusOutlined />}
//                         onClick={() =>
//                           setCountingUnits([
//                             ...countingUnits,
//                             {
//                               tempId: Date.now(),
//                               batch_no: "",
//                               quantity: null,
//                               isSystem: false,
//                             },
//                           ])
//                         }
//                       >
//                         Add Row
//                       </Button>
//                     </div>
//                   </div>

//                   <Row
//                     gutter={8}
//                     style={{
//                       marginBottom: 8,
//                       borderBottom: "1px solid #f0f0f0",
//                       paddingBottom: 4,
//                       textAlign: "center",
//                     }}
//                   >
//                     <Col span={8}>
//                       <Text strong style={{ fontSize: 11 }}>
//                         BATCH/SERIAL
//                       </Text>
//                     </Col>
//                     <Col span={5}>
//                       <Text strong style={{ fontSize: 11 }}>
//                         EXPIRY
//                       </Text>
//                     </Col>
//                     <Col span={4}>
//                       <Text strong style={{ fontSize: 11 }}>
//                         QTY
//                       </Text>
//                     </Col>
//                     <Col span={5}>
//                       <Text strong style={{ fontSize: 11 }}>
//                         STATUS
//                       </Text>
//                     </Col>
//                   </Row>

//                   {Object.values(
//                     (selectedProduct?.systemUnits || [])
//                       .filter((u) => {
//                         const isSubmitted = u.status === "submitted";
//                         const hasQty = Number(u.count_quantity) > 0; // Use > 0 to strictly hide 0 and NULL
//                         return isSubmitted && hasQty;
//                       })
//                       .reduce((acc, u) => {
//                         const batch = u.count_batch_no || u.count_serial_no || "N/A";
//                         const qty = Number(u.count_quantity) || 0;

//                         if (!acc[batch]) {
//                           acc[batch] = {
//                             batch,
//                             qty: 0,
//                             expiry: u.count_expiry_date,
//                             lastDate: u.counted_at,
//                           };
//                         }

//                         acc[batch].qty += qty;
//                         return acc;
//                       }, {})
//                   )
//                     // .filter((b) => b.qty > 0) // ✅ ONLY batches with total > 0
//                     .map((b, i) => (
//                       <Row
//                         key={`hist-${i}`}
//                         gutter={8}
//                         style={{
//                           marginBottom: 4,
//                           borderBottom: "1px solid #f0f0f0",
//                           paddingBottom: 4,
//                         }}
//                       >
//                         <Col span={8} style={{ textAlign: "center" }}>
//                           <Text style={{ fontSize: 13 }}>{b.batch}</Text>
//                         </Col>

//                         <Col span={5} style={{ textAlign: "center" }}>
//                           <Text style={{ fontSize: 12 }}>
//                             {b.expiry
//                               ? dayjs(b.expiry).format("DD-MM-YYYY")
//                               : "N/A"}
//                           </Text>
//                         </Col>

//                         <Col span={4} style={{ textAlign: "center" }}>
//                           <Text style={{ fontSize: 13 }}>{b.qty}</Text>
//                         </Col>

//                         <Col span={5} style={{ textAlign: "center" }} className="no-print">
//                           <Text type="secondary" style={{ fontSize: 11 }}>
//                             {dayjs(b.lastDate).format("DD/MM HH:mm")}
//                           </Text>
//                         </Col>
//                       </Row>
//                     ))}

//                   <Divider titlePlacement="left" plain>
//                     <Text type="secondary" style={{ fontSize: 10 }}>
//                       NEW ENTRIES
//                     </Text>
//                   </Divider>

//                   {/* HEADER FOR NEW ENTRIES */}
//                   <Row
//                     gutter={5}
//                     style={{
//                       marginBottom: 5,
//                       borderBottom: "1px solid #f0f0f0",
//                     }}
//                   >
//                     <Col span={8}>
//                       <Text strong style={{ fontSize: 10 }}>
//                         Batch/Serial
//                       </Text>
//                     </Col>
//                     <Col span={6}>
//                       <Text strong style={{ fontSize: 10 }}>
//                         Expiry Date
//                       </Text>
//                     </Col>
//                     <Col span={3}>
//                       <Text strong style={{ fontSize: 10 }}>MRP</Text>
//                     </Col>
//                     <Col span={3}>
//                       <Text strong style={{ fontSize: 10 }}>
//                         Count Qty
//                       </Text>
//                     </Col>
//                     <Col span={2}></Col>
//                   </Row>

//                   {countingUnits
//                     .filter((u) => {
//                       // 1. Convert to Number to handle any string issues from the DB
//                       const isZero = Number(u.count_quantity) === 0;

//                       // 2. Check the status (ensure it matches your 'submitted' string exactly)
//                       const isSubmitted = u.status === 'submitted';

//                       // 3. Return FALSE only if BOTH are true (this "disables/hides" the row)
//                       return !(isZero && isSubmitted);
//                     })
//                     .map((u) => (

//                       <Row key={u.tempId} gutter={5} style={{ marginBottom: 10 }}>
//                         <Col span={8}>
//                           <AutoComplete
//                             style={{ width: "100%" }}
//                             options={getOptions(u.batch_no)}
//                             value={u.batch_no}
//                             onSelect={(val, option) => {
//                               updateField(u.tempId, "batch_no", val);

//                               // ✅ auto-fill expiry
//                               if (option?.expiry) {
//                                 updateField(u.tempId, "expiry_date", dayjs(option.expiry));
//                               }
//                             }}
//                             onChange={(val) => updateField(u.tempId, "batch_no", val)}
//                             disabled={u.isSystem}
//                           >
//                             <Input placeholder="Select Batch..." />
//                           </AutoComplete>
//                         </Col>

//                         <Col span={6}>
//                           <DatePicker
//                             style={{ width: "100%" }}
//                             format="DD-MM-YYYY"
//                             suffixIcon={u.isSystem ? null : undefined}
//                             value={u.expiry_date ? dayjs(u.expiry_date) : null}
//                             onChange={(date) =>
//                               updateField(u.tempId, "expiry_date", date)
//                             }
//                             disabled={u.isSystem}
//                           />
//                         </Col>
//                         <Col span={3}>
//                           <InputNumber
//                             placeholder="MRP"
//                             style={{ width: "100%" }}
//                             value={u.mrp}
//                             onChange={(v) => updateField(u.tempId, "mrp", v)}

//                           />
//                         </Col>
//                         <Col span={3}>
//                           <InputNumber
//                             placeholder=""
//                             style={{ width: "100%" }}
//                             controls={false}
//                             value={
//                               u.quantity === 0 || u.quantity === null
//                                 ? null
//                                 : u.quantity
//                             }
//                             onChange={(v) => updateField(u.tempId, "quantity", v)}
//                           />
//                         </Col>
//                         <Col span={2}>
//                           {!u.isSystem && (
//                             <Button
//                               danger
//                               type="text"
//                               icon={<DeleteOutlined />}
//                               onClick={() =>
//                                 setCountingUnits(
//                                   countingUnits.filter(
//                                     (x) => x.tempId !== u.tempId,
//                                   ),
//                                 )
//                               }
//                             />
//                           )}
//                         </Col>
//                       </Row>
//                     ))}

//                   <Card
//                     size="small"
//                     style={{
//                       marginTop: 20,
//                       borderRadius: 10,
//                       background: "#fafafa",
//                     }}
//                   >
//                     <Row gutter={16}>
//                       {[
//                         { label: "History", value: totals.history },
//                         { label: "New", value: totals.pending },
//                         { label: "Total", value: totals.total },
//                       ].map((item) => (
//                         <Col
//                           span={8}
//                           key={item.label}
//                           style={{ textAlign: "center" }}
//                         >
//                           <Text type="secondary" style={{ fontSize: 11 }}>
//                             {item.label.toUpperCase()}
//                           </Text>
//                           <div style={{ fontSize: 20, fontWeight: 600 }}>
//                             {item.value}
//                           </div>
//                         </Col>
//                       ))}
//                     </Row>
//                   </Card>
//                   <div className="no-print" style={{ marginTop: 15 }}>
//                     <Button
//                       type="primary"
//                       block
//                       onClick={handleSubmit}
//                       loading={loading}
//                       size="large"
//                       style={{
//                         height: 48,
//                         borderRadius: 10,
//                         fontWeight: 600,
//                       }}
//                     >
//                       CONFIRM & SUBMIT
//                     </Button>
//                   </div>
//                 </div>
//               ) : (
//                 <div
//                   style={{
//                     textAlign: "center",
//                     padding: 100,
//                     border: "1px dashed #d9d9d9",
//                   }}
//                 >
//                   <Text type="secondary">Select an item to begin counting</Text>
//                 </div>
//               )}
//             </Col>
//           </Row>
//           {activeTab === "submitted" && selectedProduct && (
//             <div className="no-print">
//               <>
//                 <Divider />

//                 <div style={{ marginBottom: 16 }}>
//                   <Text strong style={{ fontSize: 12 }}>
//                     SELECT WAREHOUSE
//                   </Text>

//                   <Select
//                     style={{ width: "100%", marginTop: 8 }}
//                     placeholder="Select Warehouse"
//                     value={selectedWarehouse}
//                     onChange={(value) => {
//                       setSelectedWarehouse(value);
//                       loadWarehouseBatches(value);
//                     }}
//                     options={[
//                       { value: "main", label: "Main Warehouse" },
//                       { value: "godown-1", label: "Godown 1" },
//                       { value: "godown-2", label: "Godown 2" },
//                     ]}
//                   />
//                 </div>

//               </>
//             </div>
//           )}
//           {activeTab === "submitted" &&
//             selectedProduct &&
//             selectedWarehouse &&
//             warehouseBatches.length > 0 && (
//               //------- Batch Allocations Section --------- //
//               <>
//                 <Divider />

//                 <Tabs
//                   activeKey={allocationTab}
//                   onChange={(k) => {
//                     setAllocationTab(k);
//                     setSelectedBatch(null);
//                   }}
//                   items={[
//                     {
//                       key: "pending",
//                       label: "Pending",
//                       children: (
//                         <>
//                           {/* Batch Cards */}
//                           <div className="grid grid-cols-5 gap-3">
//                             {warehouseBatches
//                               .filter((batch) => batch.available_qty && Number(batch.available_qty) > 0)
//                               .map((batch) => {
//                                 const isFinished =
//                                   getRemainingQty(batch.batch_no) === 0;

//                                 return (
//                                   <Badge.Ribbon
//                                     key={batch.batch_no}
//                                     text="Finished"
//                                     color="green"
//                                     style={{
//                                       display: isFinished ? "block" : "none",
//                                     }}
//                                   >
//                                     <Card
//                                       hoverable={!isFinished}
//                                       onClick={() => {
//                                         if (isFinished) return; // Prevent selection if finished
//                                         setSelectedBatch(batch);
//                                         setAllocationForm((p) => ({
//                                           ...p,
//                                           batch_no: batch.batch_no,
//                                         }));
//                                       }}
//                                       style={{
//                                         transition: "all 0.3s",
//                                         opacity: isFinished ? 0.6 : 1,
//                                         backgroundColor: isFinished
//                                           ? "#f5f5f5"
//                                           : "#fff",
//                                         cursor: isFinished
//                                           ? "not-allowed"
//                                           : "pointer",
//                                         border:
//                                           selectedBatch?.batch_no ===
//                                             batch.batch_no
//                                             ? "2px solid #1677ff"
//                                             : "1px solid #e5e7eb",
//                                       }}
//                                     >
//                                       <div
//                                         style={{
//                                           fontWeight: 600,
//                                           textDecoration: isFinished
//                                             ? "line-through"
//                                             : "none",
//                                           color: isFinished
//                                             ? "#8c8c8c"
//                                             : "inherit",
//                                         }}
//                                       >
//                                         {batch.batch_no}
//                                       </div>

//                                       <div
//                                         style={{
//                                           fontSize: 12,
//                                           color: isFinished ? "#b7b7b7" : "#666",
//                                         }}
//                                       >
//                                         {isFinished ? (
//                                           <span>Fully Allocated</span>
//                                         ) : (
//                                           <>
//                                             Remaining:{" "}
//                                             <b>
//                                               {getRemainingQty(batch.batch_no)}
//                                             </b>
//                                           </>
//                                         )}
//                                       </div>
//                                     </Card>
//                                   </Badge.Ribbon>
//                                 );
//                               })}
//                           </div>

//                           {/* Allocation Editor */}
//                           {selectedBatch && (
//                             <Card
//                               title={`Allocate Batch : ${selectedBatch.batch_no}`}
//                               style={{ marginTop: 15 }}
//                             >
//                               <Row gutter={10}>
//                                 <Col span={6}>
//                                   <Select
//                                     placeholder="Rack"
//                                     value={allocationForm.rack}
//                                     style={{ width: "100%" }}
//                                     onChange={(v) =>
//                                       setAllocationForm((p) => ({
//                                         ...p,
//                                         rack: v,
//                                       }))
//                                     }
//                                     options={[
//                                       { label: "R1", value: "R1" },
//                                       { label: "R2", value: "R2" },
//                                       { label: "R3", value: "R3" },
//                                     ]}
//                                   />
//                                 </Col>

//                                 <Col span={6}>
//                                   <Select
//                                     placeholder="Compartment"
//                                     value={allocationForm.compartment}
//                                     style={{ width: "100%" }}
//                                     onChange={(v) =>
//                                       setAllocationForm((p) => ({
//                                         ...p,
//                                         compartment: v,
//                                       }))
//                                     }
//                                     options={compartments.map((c) => ({
//                                       label: c,
//                                       value: c,
//                                     }))}
//                                   />
//                                 </Col>

//                                 <Col span={5}>
//                                   {/* <InputNumber
//                                     placeholder="Qty"
//                                     style={{ width: "100%" }}
//                                     value={allocationForm.qty}
//                                     min={1}
//                                     max={getRemainingQty(
//                                       selectedBatch?.batch_no,
//                                     )}
//                                     onChange={(value) => handleQtyChange(value)}
//                                   /> */}

//                                   <input
//                                     type="number"
//                                     style={{
//                                       width: "100%",
//                                       padding: "4px 8px",
//                                       border: "1px solid #d9d9d9",
//                                       borderRadius: 6,
//                                     }}
//                                     value={allocationForm.qty || ""}
//                                     onChange={(e) => {
//                                       const val = Number(e.target.value);

//                                       setAllocationForm((p) => ({
//                                         ...p,
//                                         qty: val || null,
//                                       }));
//                                     }}
//                                   />
//                                   {qtyError && (
//                                     <div
//                                       style={{
//                                         color: "red",
//                                         fontSize: 12,
//                                         marginTop: 4,
//                                       }}
//                                     >
//                                       Quantity exceeds available stock.
//                                       Remaining: {remaining}
//                                     </div>
//                                   )}

//                                   {/* Immediate Visual Error Message */}
//                                   {allocationForm.qty >
//                                     getRemainingQty(
//                                       selectedBatch?.batch_no,
//                                     ) && (
//                                       <div
//                                         style={{
//                                           color: "#ff4d4f",
//                                           fontSize: "11px",
//                                           marginTop: "4px",
//                                         }}
//                                       >
//                                         Max:{" "}
//                                         {getRemainingQty(selectedBatch?.batch_no)}
//                                       </div>
//                                     )}
//                                 </Col>

//                                 <Col span={3}>
//                                   <Button
//                                     type="primary"
//                                     onClick={confirmAllocation}
//                                     icon={<CheckOutlined />}
//                                     disabled={
//                                       !allocationForm.qty ||
//                                       allocationForm.qty >
//                                       getRemainingQty(selectedBatch?.batch_no)
//                                     }
//                                   ></Button>
//                                 </Col>

//                                 <Col span={4}>
//                                   <div style={{ fontSize: 12 }}>
//                                     Remaining :
//                                     <b style={{ marginLeft: 5 }}>
//                                       {getRemainingQty(selectedBatch.batch_no)}
//                                     </b>
//                                   </div>
//                                 </Col>
//                               </Row>
//                             </Card>
//                           )}

//                           {/* Unified Allocation Table */}
//                           <Table
//                             style={{ marginTop: 20 }}
//                             dataSource={filteredAllocations} // <--- Changed from 'allocations'
//                             rowKey="id"
//                             pagination={false}
//                             size="small"
//                             columns={[
//                               { title: "Batch", dataIndex: "batch_no" },
//                               { title: "Rack", dataIndex: "rack" },
//                               {
//                                 title: "Compartment",
//                                 dataIndex: "compartment",
//                               },
//                               { title: "Qty", dataIndex: "qty" },
//                               {
//                                 title: "",
//                                 render: (_, r) => (
//                                   <Button
//                                     danger
//                                     type="text"
//                                     icon={<DeleteOutlined />}
//                                     onClick={() => {
//                                       setWarehouseBatches((prev) =>
//                                         prev.map((b) => ({
//                                           ...b,
//                                           allocations:
//                                             b.allocations?.filter(
//                                               (a) => a.id !== r.id,
//                                             ) || [],
//                                         })),
//                                       );
//                                     }}
//                                   />
//                                 ),
//                               },
//                             ]}
//                           />
//                         </>
//                       ),
//                     },

//                     {
//                       key: "finished",
//                       label: "Finished",
//                       children: (
//                         <Table
//                           dataSource={finishedBatches}
//                           rowKey="batch_no"
//                           pagination={false}
//                           columns={[
//                             {
//                               title: "Batch",
//                               dataIndex: "batch_no",
//                             },
//                             {
//                               title: "Allocated Qty",
//                               render: (b) =>
//                                 allocations
//                                   .filter((a) => a.batch_no === b.batch_no)
//                                   .reduce((s, a) => s + Number(a.qty || 0), 0),
//                             },
//                           ]}
//                         />
//                       ),
//                     },
//                   ]}
//                 />

//                 {/* Final Submit */}
//                 <Button
//                   type="primary"
//                   block
//                   disabled={!allFinished}
//                   style={{ marginTop: 20 }}
//                 >
//                   Final Submit
//                 </Button>
//               </>
//             )}
//         </Card>
//       )}
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { useParams } from "next/navigation";
import {
  Card,
  Row,
  Col,
  Divider,
  message,
  Tabs,
  Typography,
  Table,
  Tag,
  InputNumber,
  DatePicker,
  Input,
  Button,
  AutoComplete,
  Select,
  Badge,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useSearchParams } from "next/navigation";

const { Text, Title } = Typography;
// const { TabPane } = Tabs;

const thermalStyles = `
@media print {
  body * { visibility: hidden; }

  @page { 
    size: 100mm 150mm; 
    margin: 0; 
  }

  .thermal-slip, .thermal-slip * { 
    visibility: visible; 
  }

  .thermal-slip {
    position: absolute;
    left: 0;
    top: 0;
    width: 100mm !important; 
    height: 150mm;
    box-sizing: border-box;
    padding: 4mm; /* Giving a little edge room */
    background: #fff;
    display: block !important;
  }

  /* --- THE FIX: FORCE GRID & TABLE TO SPREAD --- */
  
  /* 1. Reset Ant Design Rows and Columns */
  .thermal-slip .ant-row {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important; /* Prevents columns from jumping to next line */
    width: 100% !important;
    margin: 0 !important;
  }

  .thermal-slip .ant-col {
    flex: 1 1 auto !important; /* Forces columns to grow to fill space */
    padding: 0 2px !important;
    max-width: none !important;
  }

  /* 2. Reset Tables to use the full 100mm */
  .thermal-slip table, 
  .thermal-slip .ant-table,
  .thermal-slip .ant-table-container,
  .thermal-slip .ant-table-content table {
    width: 100% !important;
    min-width: 100% !important;
    table-layout: fixed !important; /* This is mandatory to prevent squashing */
  }

  /* 3. Force headers and cells to stay on one line or wrap neatly */
  .thermal-slip th, 
  .thermal-slip td {
    padding: 2px !important;
    font-size: 9pt !important; /* Slightly smaller to fit "Batch/Serial" */
    word-break: break-word !important;
    overflow: hidden;
  }

  /* 4. Fix Inputs that are shrinking */
  .thermal-slip .ant-input, 
  .thermal-slip .ant-input-number,
  .thermal-slip .ant-select-selector {
    width: 100% !important;
    min-width: 0 !important; /* Allows them to shrink if the column is tight */
    display: block !important;
  }

  .no-print { display: none !important; }
}
`;




export default function YearEndPage() {
  const params = useParams();
  const cycleId = params?.cycleId;
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");

  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [countingUnits, setCountingUnits] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouseBatches, setWarehouseBatches] = useState([]);
  const [allocationTab, setAllocationTab] = useState("pending");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [assistants, setAssistants] = useState([]);
  const [lastStopTime, setLastStopTime] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [racks, setRacks] = useState([]);
  const [finalSubmitted, setFinalSubmitted] = useState(false);
  const [savedAllocations, setSavedAllocations] = useState([]);

  const tabLabel = (text, count) => (
    <div style={{ display: "flex", gap: 6 }}>
      <span>{text}</span>
      <span style={{ fontWeight: 500 }}>{count}</span>
    </div>
  );

  const unlockProduct = async (product) => {
    if (!product) return;

    await supabase
      .from("cycle_items")
      .update({
        locked_by: null,
        locked_at: null,
      })
      .eq("item_id", product.id);
  };

  const [allocationForm, setAllocationForm] = useState({
    rack: null,
    compartment: null,
    qty: null,
  });

  const currentBatch = warehouseBatches.find(
    (b) => b.batch_no === selectedBatch?.batch_no,
  );

  const fetchLoggedInTeam = async () => {
    try {
      if (!teamId) {
        message.error("Invalid access");
        window.location.href = "/";
        return;
      }

      const { data, error } = await supabase
        .from("counting_sessions")
        .select(
          `
        id,
        sessions_start,
        sessions_stop,
        last_activity,
        team_id,
        teams (
          id,
          username,
          team_leader,
          assistants  
        )
      `,
        )
        .eq("cycle_id", Number(cycleId))
        .eq("team_id", Number(teamId))
        .is("sessions_stop", null)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        message.error("Please login first");
        window.location.href = "/";
        return;
      }

      const row = data;

      console.log("TEAM DATA:", row.teams);

      setTeam(row.teams);
      setSession(row);
      setIsLoggedIn(true);

      const { data: lastSession } = await supabase
        .from("counting_sessions")
        .select("sessions_stop")
        .eq("cycle_id", Number(cycleId))
        .eq("team_id", Number(teamId))
        .not("sessions_stop", "is", null)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLastStopTime(lastSession?.sessions_stop || null);

      // ✅ NEW: Parse assistants safely
      try {
        const parsedAssistants = JSON.parse(row.teams?.assisatants || "[]");
        setAssistants(row.teams?.assistants || []);
      } catch (e) {
        console.error("Assistant parse error:", e);
        setAssistants([]);
      }
    } catch (err) {
      console.log("ERROR:", err);
      console.log("❌ MESSAGE:", err?.message);
    }
  };

  const handleLogout = async () => {
    try {
      if (!session?.id) {
        message.error("No active session");
        return;
      }

      // ✅ ADD THIS BLOCK HERE (VERY IMPORTANT)
      if (selectedProduct) {
        await unlockProduct(selectedProduct);
      }

      const { error } = await supabase
        .from("counting_sessions")
        .update({
          sessions_stop: new Date(),
        })
        .eq("id", session.id);

      if (error) throw error;

      message.success("Logged out successfully");

      setIsLoggedIn(false);
      window.location.href = "/cyclecount";
    } catch (err) {
      console.error("Logout error:", err);
      message.error("Logout failed");
    }
  };

  // useEffect(() => {
  //   if (!isLoggedIn || !cycleId) return;

  //   const interval = setInterval(() => {
  //     fetchInventory(); // 🔥 refresh data
  //   }, 5000); // every 5 seconds

  //   return () => clearInterval(interval);
  // }, [isLoggedIn, cycleId]);

  useEffect(() => {
    if (!isLoggedIn || !cycleId) return;

    const channel = supabase
      .channel("cycle-items-realtime")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "cycle_items",
          filter: `cycle_id=eq.${cycleId}`, // 🎯 IMPORTANT (only this cycle)
        },
        (payload) => {
          console.log("🔄 Realtime change:", payload);

          // 🔥 IMPORTANT: Avoid interrupting user input
          const isUserEditing = !!selectedProduct;

          if (isUserEditing) {
            console.log("⏸ Skipped refresh (user editing)");
            return;
          }

          // ✅ Soft refresh
          fetchInventory();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, cycleId, selectedProduct]);

  useEffect(() => {
    setMounted(true);
    fetchLoggedInTeam(); // ✅ ALWAYS check session from DB
  }, [cycleId]);

  useEffect(() => {
    const handleUnload = () => {
      if (selectedProduct) {
        unlockProduct(selectedProduct);
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [selectedProduct]);

  useEffect(() => {
    setSelectedWarehouse(null);
  }, [selectedProduct]);

  useEffect(() => {
    if (isLoggedIn && cycleId) {
      fetchInventory();
      fetchWarehouses();
    }
  }, [isLoggedIn, cycleId]);

  useEffect(() => {
    if (!selectedProduct) return;

    const relevantUnits = (selectedProduct.systemUnits || []).filter(
      (u) =>
        Number(u.sys_quantity || 0) > 0 &&
        (u.status !== "submitted" || Number(u.count_quantity || 0) > 0),
    );

    const pendingUnits = relevantUnits.filter(
      (u) =>
        u.status === "pending" ||
        u.status === "editable" ||
        u.status === "recount",
    );

    if (pendingUnits.length === 0) {
      setCountingUnits([]);
      return;
    }

    setCountingUnits(
      pendingUnits.map((unit, index) => ({
        tempId: `system-${index}`,
        id: unit.id,
        batch_no: unit.count_batch_no || unit.sys_batch_no || "",
        expiry_date: unit.count_expiry_date || unit.sys_expiry_date || null,

        quantity:
          activeTab === "editable" ? Number(unit.count_quantity ?? 0) : null,

        mrp: unit.mrp || null,

        isSystem: true,
        status: unit.status,
      })),
    );
  }, [selectedProduct, activeTab]); // ✅ ALWAYS SAME LENGTH

  const totals = useMemo(() => {
    if (!selectedProduct) return { history: 0, pending: 0, total: 0 };
    const history = selectedProduct.systemUnits
      .filter((u) => u.status === "submitted")
      .reduce((s, u) => s + (Number(u.count_quantity) || 0), 0);
    const pending = countingUnits.reduce(
      (s, u) => s + (Number(u.quantity) || 0),
      0,
    );
    return { history, pending, total: history + pending };
  }, [selectedProduct, countingUnits]);

  const fetchInventory = async () => {
    setLoading(true);

    try {
      let allData = [];
      let from = 0;
      const limit = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("cycle_items")
          .select(
            `
          id,
          cycle_id,
          item_id,
          status,
          sys_batch_no,
          sys_expiry_date,
          sys_quantity,
          count_batch_no,
          count_expiry_date,
          count_quantity,
          counted_at,
          sl_no,
          mrp,
          item_master (
            id,
            item_name
            
          )
        `,
          )
          .eq("cycle_id", Number(cycleId))
          .range(from, from + limit - 1);

        if (error) throw error;

        allData = [...allData, ...data];

        // ✅ stop when last page reached
        if (data.length < limit) break;

        from += limit;
      }

      console.log("✅ Total fetched rows:", allData.length);

      // ✅ GROUPING LOGIC (same as your existing)
      const grouped = allData.reduce((acc, curr) => {
        const itemId = curr.item_id;

        if (!acc[itemId]) {
          acc[itemId] = {
            ...curr.item_master,
            sl_no: curr.sl_no,
            cycle_id: curr.cycle_id,
            status: curr.status,
            systemUnits: [],
          };
        }

        acc[itemId].systemUnits.push(curr);

        if (curr.status === "pending") {
          acc[itemId].status = "pending";
        } else if (curr.status === "editable") {
          acc[itemId].status = "editable";
        }

        return acc;
      }, {});

      const finalData = Object.values(grouped);

      console.log("✅ Unique items:", finalData.length);

      setProducts(finalData);

      return finalData; // important for reselect after submit
    } catch (err) {
      console.error(err);
      message.error("Database Error");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateField = (id, f, v) =>
    setCountingUnits((prev) =>
      prev.map((u) => (u.tempId === id ? { ...u, [f]: v } : u)),
    );

  // Restore Tabs logic

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const processedUnits = countingUnits.map((u) => {
        if (u.isSystem) {
          const original = selectedProduct.systemUnits.find(
            (s) => s.id === u.id,
          );

          const sysQty = Number(original?.sys_quantity || 0);

          if (u.quantity === null && sysQty === 0) {
            return {
              ...u,
              quantity: 0,
            };
          }
        }

        return u;
      });

      console.log("FINAL UNITS:", processedUnits);

      for (const unit of processedUnits) {
        if (unit.quantity === null && !unit.isSystem) continue;

        const payload = {
          count_quantity: unit.quantity ?? 0,
          count_batch_no: unit.batch_no || null,
          count_expiry_date: unit.expiry_date
            ? dayjs(unit.expiry_date).format("YYYY-MM-DD")
            : null,
          status: "submitted",
          counted_at: new Date(),

          // ✅ FIX ADDED
          team_id: Number(teamId),
          sl_no: selectedProduct.sl_no,
          mrp: unit.mrp ?? null,
        };

        console.log("📦 PAYLOAD:", payload);

        if (unit.isSystem) {
          await supabase.from("cycle_items").update(payload).eq("id", unit.id);
        } else {
          await supabase.from("cycle_items").insert([
            {
              ...payload,

              // required for new rows
              cycle_id: selectedProduct.cycle_id,
              item_id: selectedProduct.id,
            },
          ]);
        }
      }

      // 🔥 ZERO SYSTEM BATCH FIX ALSO NEEDS TEAM + SL
      const zeroSystemBatches = selectedProduct.systemUnits.filter(
        (u) => Number(u.sys_quantity || 0) === 0 && u.status !== "submitted",
      );

      console.log("ZERO BATCHES:", zeroSystemBatches);

      for (const u of zeroSystemBatches) {
        await supabase
          .from("cycle_items")
          .update({
            count_quantity: 0,
            count_batch_no: u.sys_batch_no,
            count_expiry_date: u.sys_expiry_date || null,
            status: "submitted",
            counted_at: new Date(),

            // ✅ IMPORTANT FIX
            team_id: Number(teamId),
            sl_no: selectedProduct.sl_no,
          })
          .eq("id", u.id);
      }

      message.success("Logs Saved");

      const selectedId = selectedProduct.id;

      const updatedProducts = await fetchInventory();
      const updated = updatedProducts.find((p) => p.id === selectedId);

      setSelectedProduct(updated || null);
    } catch (e) {
      console.error(e);
      message.error("Error Saving");
    } finally {
      setLoading(false);
    }
  };

  const tabCounts = useMemo(() => {
    return {
      all: products.length,

      pending: products.filter((p) =>
        p.systemUnits.some((u) => u.status === "pending"),
      ).length,

      submitted: products.filter((p) =>
        p.systemUnits.every((u) => u.status === "submitted"),
      ).length,

      editable: products.filter((p) =>
        p.systemUnits.some((u) => u.status === "editable"),
      ).length,

      recount: products.filter((p) =>
        p.systemUnits.some(
          (u) =>
            u.status === "recount" &&
            Number(u.count_quantity || 0) !== Number(u.sys_quantity || 0),
        ),
      ).length,
    };
  }, [products]);

  const filteredItems = useMemo(() => {
    let data;

    if (activeTab === "all") {
      data = products;
    } else if (activeTab === "pending") {
      data = products.filter((p) =>
        p.systemUnits.some((u) => u.status === "pending"),
      );
    } else if (activeTab === "submitted") {
      data = products.filter((p) =>
        p.systemUnits.every((u) => u.status === "submitted"),
      );
    } else if (activeTab === "editable") {
      data = products.filter((p) =>
        p.systemUnits.some((u) => u.status === "editable"),
      );
    } else if (activeTab === "recount") {
      data = products.filter((p) =>
        p.systemUnits.some(
          (u) =>
            u.status === "recount" &&
            Number(u.count_quantity || 0) !== Number(u.sys_quantity || 0),
        ),
      );
    } else {
      data = [];
    }

    if (!searchText) return data;

    return data.filter((p) => {
      const search = searchText.toLowerCase();

      return (
        p.item_name?.toLowerCase().includes(search) ||
        String(p.sl_no || "").includes(search)
      );
    });
  }, [products, activeTab, searchText]);

  const getOptions = (value) => {
    if (!selectedProduct) return [];

    const unique = new Map();

    selectedProduct.systemUnits.forEach((u) => {
      const batch = u.sys_batch_no || u.count_batch_no;
      const expiry = u.sys_expiry_date || u.count_expiry_date;

      if (!batch) return;

      if (!unique.has(batch)) {
        unique.set(batch, expiry);
      }
    });

    return Array.from(unique.entries())
      .filter(
        ([batch]) =>
          !value || batch.toLowerCase().includes(value.toLowerCase()),
      )
      .map(([batch, expiry]) => ({
        value: batch,
        label: (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{batch}</span>
            <span style={{ fontSize: 11, color: "#888" }}>
              {expiry ? dayjs(expiry).format("DD-MM-YY") : ""}
            </span>
          </div>
        ),
        expiry,
      }));
  };

  // const loadWarehouseBatches = async (warehouseId) => {
  //   // You should fetch this from DB later
  //   // For now simulate from submitted counts
  //   console.log("🔥 loadWarehouseBatches called", warehouseId);

  //   const grouped = {};

  //   selectedProduct.systemUnits
  //     .filter((u) => u.status === "submitted")
  //     .forEach((u) => {
  //       const qty = Number(u.count_quantity) || 0;
  //       if (qty === 0) return; // 🚀 skip zero qty

  //       const batch = u.count_batch_no || "N/A";

  //       if (!grouped[batch]) grouped[batch] = 0;
  //       grouped[batch] += qty;
  //     });

  //   const formatted = Object.entries(grouped)
  //     .map(([batch, qty]) => ({
  //       batch_no: batch,
  //       available_qty: qty,
  //       allocations: [{ rack: "", compartment: "", qty: null }],
  //     }))
  //     .filter((b) => b.available_qty > 0); // 🚀 EXTRA SAFETY

  //   console.log("Grouped batches:", grouped);
  //   console.log("Formatted batches:", formatted);

  //   setWarehouseBatches(formatted);
  // };

  const compartments = ["C1", "C2", "C3", "C4", "C5", "C6"];

  const finishedBatches = warehouseBatches.filter((b) => b.finished);

  const getRemainingQty = (batchNo) => {
    const batch = warehouseBatches.find((b) => b.batch_no === batchNo);
    if (!batch) return 0;

    const allocated = (batch.allocations || []).reduce(
      (sum, a) => sum + Number(a.qty || 0),
      0,
    );

    return Number(batch.available_qty || 0) - allocated;
  };
  const confirmAllocation = () => {
    if (!selectedBatch) return;

    const remaining = getRemainingQty(selectedBatch.batch_no);

    // Double-check qty before proceeding
    if (allocationForm.qty > remaining) {
      message.error("Quantity exceeds remaining stock!");
      return;
    }

    const { rack, compartment, qty } = allocationForm;

    if (!rack || !qty) {
      message.error("Rack and Qty required");
      return;
    }

    if (qty > remaining) {
      message.error(`Only ${remaining} available`);
      return;
    }

    const newAllocation = {
      id: crypto.randomUUID(),
      batch_no: selectedBatch.batch_no,
      rack,
      compartment,
      qty,
    };

    setWarehouseBatches((prev) =>
      prev.map((b) => {
        if (b.batch_no !== selectedBatch.batch_no) return b;
        return {
          ...b,
          allocations: [...(b.allocations || []), newAllocation],
          // Mark as finished if remaining will be 0
          finished:
            Number(b.available_qty) -
              ((b.allocations?.reduce((s, a) => s + a.qty, 0) || 0) + qty) ===
            0,
        };
      }),
    );

    setAllocationForm({ rack: null, compartment: null, qty: null });
    message.success("Allocated successfully");
  };

  const allAllocations = useMemo(() => {
    return warehouseBatches.flatMap((b) => b.allocations || []);
  }, [warehouseBatches]);

  const filteredAllocations = (allAllocations || []).filter(
    // (a) => a && a.batch_no && a.qty,
    (a) => a && a.batch_no && a.qty && Number(a.qty) > 0,
  );
  const allFinished = useMemo(() => {
    return (
      warehouseBatches.length > 0 &&
      warehouseBatches.every((b) => getRemainingQty(b.batch_no) === 0)
    );
  }, [warehouseBatches]);

  const remaining = getRemainingQty(selectedBatch?.batch_no);

  const qtyError = allocationForm.qty && allocationForm.qty > remaining;

  const modernStyles = `
.modern-row:hover {
  background: #f0f5ff !important;
  cursor: pointer;
}

.selected-row {
  background: #e6f4ff !important;
}

/* ✅ ADD THIS */
.locked-row {
  background: #fff1f0 !important;
  cursor: not-allowed;
  opacity: 0.6;
}
`;

  if (!mounted || !isLoggedIn) {
    return null;
  }

  ////////////////////////////////////////////////////////////
  ////////////NEW CODES AFTER DEPLOYMENT (STARTS) ////////////
  ////////////////////////////////////////////////////////////

  const fetchWarehouses = async () => {
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .order("name");

    if (!error) {
      setWarehouses(data || []);
    }
  };

  const fetchRacks = async (warehouseId) => {
    if (!warehouseId) return;

    const { data, error } = await supabase
      .from("temp_racks_names")
      .select("id, racks")
      .eq("warehouse_id", warehouseId)
      .order("racks");

    if (!error) setRacks(data || []);
  };

const handleFinalSubmit = async () => {
  if (finalSubmitted) return;
  setFinalSubmitted(true);

  try {
    if (!allFinished) {
      message.error("All batches must be fully allocated");
      setFinalSubmitted(false);
      return;
    }

    const inserts = [];

    warehouseBatches.forEach((batch) => {
      batch.allocations?.forEach((a) => {
        inserts.push({
          batch_no: batch.batch_no,
          rack: a.rack,
          qty: a.qty,
          item_id: selectedProduct.id,
          cycle_id: selectedProduct.cycle_id,
        });
      });
    });

    if (inserts.length === 0) {
      message.warning("No allocations to save");
      setFinalSubmitted(false);
      return;
    }

    const { error } = await supabase
      .from("cycle_allocations")
      .insert(inserts);

    if (error) throw error;

    message.success("Final Allocation Saved ✅");

    // ✅🔥 THIS IS WHAT YOU MISSED
    await fetchSavedAllocations(selectedProduct);

    // ✅ refresh pending
    await loadWarehouseBatches(selectedWarehouse);

    setFinalSubmitted(false);

  } catch (err) {
    console.error(err);
    message.error("Error saving allocation");
    setFinalSubmitted(false);
  }
};





 const loadWarehouseBatches = async (warehouseId) => {
  console.log("🔥 loadWarehouseBatches called", warehouseId);

  try {
    if (!selectedProduct) return;

    // ✅ FETCH allocations using item_id + cycle_id
    const { data: allocations, error } = await supabase
      .from("cycle_allocations")
      .select("id, batch_no, qty")
      .eq("item_id", selectedProduct.id)
      .eq("cycle_id", selectedProduct.cycle_id);

    if (error) {
      console.error(error);
      message.error("Failed to load allocations");
      return;
    }

    // ✅ Build allocated map
    const allocatedMap = {};
    allocations.forEach((a) => {
      const batch = a.batch_no || "N/A";
      if (!allocatedMap[batch]) allocatedMap[batch] = 0;
      allocatedMap[batch] += Number(a.qty || 0);
    });

    // ✅ Build grouped counts
    const grouped = {};
    selectedProduct.systemUnits
      .filter((u) => u.status === "submitted")
      .forEach((u) => {
        const qty = Number(u.count_quantity) || 0;
        if (!qty) return;

        const batch = u.count_batch_no || "N/A";

        if (!grouped[batch]) grouped[batch] = 0;
        grouped[batch] += qty;
      });

    // ✅ Final batches
    const formatted = Object.entries(grouped)
      .map(([batch, totalQty]) => {
        const allocatedQty = allocatedMap[batch] || 0;

        return {
          batch_no: batch,
          available_qty: totalQty - allocatedQty,
          allocations: [],
        };
      })
      .filter((b) => b.available_qty > 0);

    setWarehouseBatches(formatted);
  } catch (err) {
    console.error(err);
    message.error("Error loading warehouse batches");
  }
};

const fetchSavedAllocations = async (product) => {
  if (!product) return;

  const { data, error } = await supabase
    .from("cycle_allocations")
    .select("*")
    .eq("item_id", product.id)
    .eq("cycle_id", product.cycle_id);

  if (error) {
    console.error(error);
    message.error("Failed to load allocations");
    return;
  }

  setSavedAllocations(data || []);
};

/////////////////////////////////////////////////////////////
///////////////CODE FOR PRINTING SLIP (STARTS) //////////////
/////////////////////////////////////////////////////////////

const handlePrint = () => {
  
  if (!selectedProduct || countingUnits.length === 0) {
    message.warning("No data to print");
    return;
  }

  console.log("PRINT DATA:", selectedProduct, countingUnits);

  const printWindow = window.open("", "_blank");

const rows = countingUnits
  .map((u, i) => {
    const batch = u.batch_no || "-";
    const expiry = u.expiry_date
      ? dayjs(u.expiry_date).format("DD-MM-YYYY")
      : "-";
    const mrp = u.mrp ?? "-";
    const qty = u.quantity ?? "-";

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${batch}</td>
        <td>${expiry}</td>
        <td>${mrp}</td>
        <td>${qty}</td>
      </tr>
    `;
  })
  .join("");

 const html = `
<html>
<head>
<style>
  @page { size: A6; margin: 0; }

  body {
    font-family: Arial;
    margin: 0;
  }

  .page {
    padding: 5mm;
  }

  .header {
    margin-bottom: 6px;
    font-size: 11pt;
  }

  .table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }

  .table th,
  .table td {
    border: .1px solid #808080;
    padding: 3px;
    text-align: left;
  }

  .table th {
    background: #f0f0f0;
  }

</style>
</head>

<body>
  <div class="page">

    <div class="header">
      <div><b>SL No:</b> ${selectedProduct.sl_no}</div>
      <div><b>Item:</b> ${selectedProduct.item_name}</div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Batch</th>
          <th>Expiry</th>
          <th>MRP</th>
          <th>Qty</th>
        </tr>
      </thead>

      <tbody>
        ${rows}
      </tbody>
    </table>

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




/////////////////////////////////////////////////////////////
///////////////CODE FOR PRINTING SLIP (ENDS) ////////////////
/////////////////////////////////////////////////////////////




  ////////////////////////////////////////////////////////////
  ////////////NEW CODES AFTER DEPLOYMENT (ENDS) ////////////
  ////////////////////////////////////////////////////////////




  return (
    <div
      style={{
        padding: 16,
        background: "#f5f7fa",
        minHeight: "100vh",
      }}
    >
      <style>{thermalStyles}</style>
      <style>{modernStyles}</style>
      {isLoggedIn && (
        <Card
          variant={false}
          style={{
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: 10 }}
          >
            {/* LEFT SIDE */}
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Cycle Counting
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Cycle ID: {cycleId}
              </Text>
            </div>

            {/* RIGHT SIDE (🔥 THIS IS WHAT YOU WANT) */}
            {team && session && (
              <div style={{ textAlign: "right" }}>
                <div>
                  <Tag color="blue">⭐ {team.username}</Tag>

                  <div>
                    {team.team_leader && (
                      <div style={{ marginBottom: 4 }}>
                        <Tag color="gold">👤 Leader: {team.team_leader}</Tag>
                      </div>
                    )}
                  </div>

                  {/* ✅ Assistants */}
                  {assistants.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {assistants.map((a) => (
                        <Tag key={a.id} color="green">
                          🧑 {a.name}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 11, marginTop: 4 }}>
                  <Text type="secondary">
                    🟢 Started:{" "}
                    {dayjs(session.sessions_start).format("DD-MM-YY hh:mm")}
                  </Text>
                </div>

                {/* <div style={{ fontSize: 11 }}>
                  <Text type="secondary">
                    ⏱ Last Stop:{" "}
                    {lastStopTime
                      ? dayjs(lastStopTime).format("DD-MM-YY hh:mm")
                      : "No previous session"}
                  </Text>
                </div> */}

                <Button
                  danger
                  size="small"
                  style={{ marginTop: 6 }}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            )}
          </Row>
          <Row gutter={24}>
            <Col span={10} className="no-print">
              <Input
                placeholder="Search item..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ marginBottom: 10 }}
              />

              {/* RESTORED TABS */}
              <Tabs
                activeKey={activeTab}
                onChange={(key) => {
                  setActiveTab(key);
                  setSelectedProduct(null); // 👈 Reset selection when tab changes
                }}
                items={[
                  {
                    key: "all",
                    label: (
                      <span>
                        {" "}
                        All{" "}
                        <Badge
                          count={tabCounts.all}
                          color="blue"
                          overflowCount={999999}
                        ></Badge>
                      </span>
                    ),
                  },
                  {
                    key: "pending",
                    label: (
                      <span>
                        {" "}
                        Pending{" "}
                        <Badge
                          count={tabCounts.pending}
                          color="orange"
                          overflowCount={999999}
                        ></Badge>
                      </span>
                    ),
                  },
                  {
                    key: "submitted",
                    label: (
                      <span>
                        {" "}
                        Submitted{" "}
                        <Badge
                          count={tabCounts.submitted}
                          color="green"
                          overflowCount={999999}
                        ></Badge>
                      </span>
                    ),
                  },
                  {
                    key: "recount",
                    label: (
                      <span>
                        {" "}
                        Recount{" "}
                        <Badge
                          count={tabCounts.recount}
                          color="purple"
                          overflowCount={999999}
                        ></Badge>
                      </span>
                    ),
                  },
                  {
                    key: "editable",
                    label: (
                      <span>
                        {" "}
                        Editable{" "}
                        <Badge
                          count={tabCounts.editable}
                          color="yellow"
                          overflowCount={999999}
                        ></Badge>
                      </span>
                    ),
                  },
                ]}
              />
              <Table
                dataSource={filteredItems}
                // columns={[{ title: "Item Name", dataIndex: "item_name" }]}
                rowKey="id"
                rowClassName={(record) => {
                  const lockedBy = record.systemUnits?.[0]?.locked_by;

                  if (lockedBy && lockedBy !== Number(teamId)) {
                    return "locked-row";
                  }

                  return "modern-row";
                }}
                onRow={(r) => ({
                  onClick: async () => {
                    try {
                      if (selectedProduct?.id) {
                        await unlockProduct(selectedProduct);
                      }

                      const lockedBy = r.systemUnits?.[0]?.locked_by;
                      const lockedAt = r.systemUnits?.[0]?.locked_at;

                      const isLocked =
                        lockedBy &&
                        lockedBy !== Number(teamId) &&
                        dayjs().diff(dayjs(lockedAt), "minute") < 10;

                      if (isLocked) {
                        message.warning(
                          "⚠️ This item is being used by another user",
                        );
                        return;
                      }

                      await supabase
                        .from("cycle_items")
                        .update({
                          locked_by: Number(teamId),
                          locked_at: new Date(),
                        })
                        .eq("item_id", r.id);

                      // ✅ SELECT PRODUCT
                      setSelectedProduct(r);

                      // ✅ FETCH SAVED ALLOCATIONS
                      await fetchSavedAllocations(r);
                    } catch (err) {
                      console.error(err);
                      message.error("Error locking item");
                    }
                  },
                })}
                pagination={false}
                size="small"
                scroll={{ y: "60vh" }}
                style={{ background: "#fff", borderRadius: 8 }}
                columns={[
                  {
                    title: "SL",
                    dataIndex: "sl_no",
                    width: 60,
                    render: (val) => (
                      <Text style={{ fontSize: 12 }}>{val}</Text>
                    ),
                  },
                  {
                    title: "Item",
                    dataIndex: "item_name",
                    render: (text, record) => (
                      <div>
                        <div style={{ fontWeight: 500 }}>{text}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>
                          {record.systemUnits.length} records
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Col>

            <Col span={14} className="thermal-slip">
              {selectedProduct ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ marginBottom: 10 }}>
                      <Title level={5} style={{ margin: 0 }}>
                        {selectedProduct.sl_no} - {selectedProduct.item_name}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Cycle ID: {selectedProduct.cycle_id}
                      </Text>
                    </div>

                    <div className="no-print">
                      <Button
                        icon={<PrinterOutlined />}
                        onClick={handlePrint}
                        style={{ marginRight: 8 }}
                      >
                        Print Slip
                      </Button>
                      <Button
                        icon={<PlusOutlined />}
                        onClick={() =>
                          setCountingUnits([
                            ...countingUnits,
                            {
                              tempId: Date.now(),
                              batch_no: "",
                              quantity: null,
                              isSystem: false,
                            },
                          ])
                        }
                      >
                        Add Row
                      </Button>
                    </div>
                  </div>

                  <Row
                    gutter={8}
                    style={{
                      marginBottom: 8,
                      borderBottom: "1px solid #f0f0f0",
                      paddingBottom: 4,
                      textAlign: "center",
                    }}
                  >
                    <Col span={8}>
                      <Text strong style={{ fontSize: 11 }}>
                        BATCH/SERIAL
                      </Text>
                    </Col>
                    <Col span={5}>
                      <Text strong style={{ fontSize: 11 }}>
                        EXPIRY
                      </Text>
                    </Col>
                    <Col span={4}>
                      <Text strong style={{ fontSize: 11 }}>
                        QTY
                      </Text>
                    </Col>
                    <Col span={5}>
                      <Text strong style={{ fontSize: 11 }}>
                        STATUS
                      </Text>
                    </Col>
                  </Row>

                  {Object.values(
                    (selectedProduct?.systemUnits || [])
                      .filter((u) => {
                        const isSubmitted = u.status === "submitted";
                        const hasQty = Number(u.count_quantity) > 0; // Use > 0 to strictly hide 0 and NULL
                        return isSubmitted && hasQty;
                      })
                      .reduce((acc, u) => {
                        const batch =
                          u.count_batch_no || u.count_serial_no || "N/A";
                        const qty = Number(u.count_quantity) || 0;

                        if (!acc[batch]) {
                          acc[batch] = {
                            batch,
                            qty: 0,
                            expiry: u.count_expiry_date,
                            lastDate: u.counted_at,
                          };
                        }

                        acc[batch].qty += qty;
                        return acc;
                      }, {}),
                  )
                    // .filter((b) => b.qty > 0) // ✅ ONLY batches with total > 0
                    .map((b, i) => (
                      <Row
                        key={`hist-${i}`}
                        gutter={8}
                        style={{
                          marginBottom: 4,
                          borderBottom: "1px solid #f0f0f0",
                          paddingBottom: 4,
                        }}
                      >
                        <Col span={8} style={{ textAlign: "center" }}>
                          <Text style={{ fontSize: 13 }}>{b.batch}</Text>
                        </Col>

                        <Col span={5} style={{ textAlign: "center" }}>
                          <Text style={{ fontSize: 12 }}>
                            {b.expiry
                              ? dayjs(b.expiry).format("DD-MM-YYYY")
                              : "N/A"}
                          </Text>
                        </Col>

                        <Col span={4} style={{ textAlign: "center" }}>
                          <Text style={{ fontSize: 13 }}>{b.qty}</Text>
                        </Col>

                        <Col
                          span={5}
                          style={{ textAlign: "center" }}
                          className="no-print"
                        >
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {dayjs(b.lastDate).format("DD/MM HH:mm")}
                          </Text>
                        </Col>
                      </Row>
                    ))}

                  <Divider titlePlacement="left" plain>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      NEW ENTRIES
                    </Text>
                  </Divider>

                  {/* HEADER FOR NEW ENTRIES */}
                  <Row
                    gutter={0}
                    style={{
                      marginBottom: 5,
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <Col span={9}>
                      <Text strong style={{ fontSize: 10 }}>
                        Batch/Serial
                      </Text>
                    </Col>
                    <Col span={7}>
                      <Text strong style={{ fontSize: 10 }}>
                        Expiry Date
                      </Text>
                    </Col>
                    <Col span={4}>
                      <Text strong style={{ fontSize: 10 }}>
                        MRP
                      </Text>
                    </Col>
                    <Col span={4}>
                      <Text strong style={{ fontSize: 10 }}>
                        Count Qty
                      </Text>
                    </Col>
                    <Col span={2}></Col>
                  </Row>

                  {countingUnits
                    .filter((u) => {
                      // 1. Convert to Number to handle any string issues from the DB
                      const isZero = Number(u.count_quantity) === 0;

                      // 2. Check the status (ensure it matches your 'submitted' string exactly)
                      const isSubmitted = u.status === "submitted";

                      // 3. Return FALSE only if BOTH are true (this "disables/hides" the row)
                      return !(isZero && isSubmitted);
                    })
                    .map((u) => (
                      <Row
                        key={u.tempId}
                        gutter={5}
                        style={{ marginBottom: 10 }}
                      >
                        <Col span={8}>
                          <AutoComplete
                            style={{ width: "100%" }}
                            options={getOptions(u.batch_no)}
                            value={u.batch_no}
                            onSelect={(val, option) => {
                              updateField(u.tempId, "batch_no", val);

                              // ✅ auto-fill expiry
                              if (option?.expiry) {
                                updateField(
                                  u.tempId,
                                  "expiry_date",
                                  dayjs(option.expiry),
                                );
                              }
                            }}
                            onChange={(val) =>
                              updateField(u.tempId, "batch_no", val)
                            }
                            disabled={u.isSystem}
                          >
                            <Input placeholder="Select Batch..." />
                          </AutoComplete>
                        </Col>

                        <Col span={6}>
                          <DatePicker
                            style={{ width: "100%" }}
                            format="DD-MM-YYYY"
                            suffixIcon={u.isSystem ? null : undefined}
                            value={u.expiry_date ? dayjs(u.expiry_date) : null}
                            onChange={(date) =>
                              updateField(u.tempId, "expiry_date", date)
                            }
                            disabled={u.isSystem}
                          />
                        </Col>
                        <Col span={3}>
                          <InputNumber
                            placeholder="MRP"
                            style={{ width: "100%" }}
                            value={u.mrp}
                            onChange={(v) => updateField(u.tempId, "mrp", v)}
                          />
                        </Col>
                        <Col span={3}>
                          <InputNumber
                            placeholder=""
                            style={{ width: "100%" }}
                            controls={false}
                            value={
                              u.quantity === 0 || u.quantity === null
                                ? null
                                : u.quantity
                            }
                            onChange={(v) =>
                              updateField(u.tempId, "quantity", v)
                            }
                          />
                        </Col>
                        <Col span={2}>
                          {!u.isSystem && (
                            <Button
                              danger
                              type="text"
                              icon={<DeleteOutlined />}
                              onClick={() =>
                                setCountingUnits(
                                  countingUnits.filter(
                                    (x) => x.tempId !== u.tempId,
                                  ),
                                )
                              }
                            />
                          )}
                        </Col>
                      </Row>
                    ))}

                  <Card className="no-print"
                    size="small"
                    style={{
                      marginTop: 20,
                      borderRadius: 10,
                      background: "#fafafa",
                    }}
                  >
                    <Row gutter={16}>
                      {[
                        { label: "History", value: totals.history },
                        { label: "New", value: totals.pending },
                        { label: "Total", value: totals.total },
                      ].map((item) => (
                        <Col
                          span={8}
                          key={item.label}
                          style={{ textAlign: "center" }}
                        >
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {item.label.toUpperCase()}
                          </Text>
                          <div style={{ fontSize: 20, fontWeight: 600 }}>
                            {item.value}
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                  <div className="no-print" style={{ marginTop: 15 }}>
                    <Button
                      type="primary"
                      block
                      onClick={handleSubmit}
                      loading={loading}
                      size="large"
                      style={{
                        height: 48,
                        borderRadius: 10,
                        fontWeight: 600,
                      }}
                    >
                      CONFIRM & SUBMIT
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: 100,
                    border: "1px dashed #d9d9d9",
                  }}
                >
                  <Text type="secondary">Select an item to begin counting</Text>
                </div>
              )}
            </Col>
          </Row>
          {activeTab === "submitted" && selectedProduct && (
            <div className="no-print">
              <>
                <Divider />

                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 12 }}>
                    SELECT WAREHOUSE
                  </Text>

                  <Select
                    style={{ width: "100%", marginTop: 8 }}
                    placeholder="Select Warehouse"
                    value={selectedWarehouse}
                    onChange={(value) => {
                      setSelectedWarehouse(value);

                      // reset rack when warehouse changes
                      setAllocationForm((p) => ({
                        ...p,
                        rack: null,
                      }));

                      loadWarehouseBatches(value);
                      fetchRacks(value);
                    }}
                    options={warehouses.map((w) => ({
                      label: w.name, // Terrace / Basement / Main
                      value: w.id, // T / B / M  👈 IMPORTANT
                    }))}
                  />
                </div>
              </>
            </div>
          )}
          {activeTab === "submitted" &&
            selectedProduct &&
            selectedWarehouse &&
            (warehouseBatches.length > 0 || savedAllocations.length > 0) &&(
              //------- Batch Allocations Section --------- //
              <>
                <Divider />

                <Tabs
                  activeKey={allocationTab}
                  onChange={(k) => {
                    setAllocationTab(k);
                    setSelectedBatch(null);
                  }}
                  items={[
                    {
                      key: "pending",
                      label: "Pending",
                      children: (
                        <>
                          {/* Batch Cards */}
                          <div className="grid grid-cols-5 gap-3">
                            {warehouseBatches
                              .filter(
                                (batch) =>
                                  batch.available_qty &&
                                  Number(batch.available_qty) > 0,
                              )
                              .map((batch) => {
                                const isFinished =
                                  getRemainingQty(batch.batch_no) === 0;

                                return (
                                  <Badge.Ribbon
                                    key={batch.batch_no}
                                    text="Finished"
                                    color="green"
                                    style={{
                                      display: isFinished ? "block" : "none",
                                    }}
                                  >
                                    <Card
                                      hoverable={!isFinished}
                                      onClick={() => {
                                        if (isFinished) return; // Prevent selection if finished
                                        setSelectedBatch(batch);
                                        setAllocationForm((p) => ({
                                          ...p,
                                          batch_no: batch.batch_no,
                                        }));
                                      }}
                                      style={{
                                        transition: "all 0.3s",
                                        opacity: isFinished ? 0.6 : 1,
                                        backgroundColor: isFinished
                                          ? "#f5f5f5"
                                          : "#fff",
                                        cursor: isFinished
                                          ? "not-allowed"
                                          : "pointer",
                                        border:
                                          selectedBatch?.batch_no ===
                                          batch.batch_no
                                            ? "2px solid #1677ff"
                                            : "1px solid #e5e7eb",
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontWeight: 600,
                                          textDecoration: isFinished
                                            ? "line-through"
                                            : "none",
                                          color: isFinished
                                            ? "#8c8c8c"
                                            : "inherit",
                                        }}
                                      >
                                        {batch.batch_no}
                                      </div>

                                      <div
                                        style={{
                                          fontSize: 12,
                                          color: isFinished
                                            ? "#b7b7b7"
                                            : "#666",
                                        }}
                                      >
                                        {isFinished ? (
                                          <span>Fully Allocated</span>
                                        ) : (
                                          <>
                                            Remaining:{" "}
                                            <b>
                                              {getRemainingQty(batch.batch_no)}
                                            </b>
                                          </>
                                        )}
                                      </div>
                                    </Card>
                                  </Badge.Ribbon>
                                );
                              })}
                          </div>

                          {/* Allocation Editor */}
                          {selectedBatch && (
                            <Card
                              title={`Allocate Batch : ${selectedBatch.batch_no}`}
                              style={{ marginTop: 15 }}
                            >
                              <Row gutter={10}>
                                <Col span={6}>
                                  <Select
                                    placeholder="Rack"
                                    value={allocationForm.rack}
                                    style={{ width: "100%" }}
                                    onChange={(v) =>
                                      setAllocationForm((p) => ({
                                        ...p,
                                        rack: v,
                                      }))
                                    }
                                    options={racks.map((r) => ({
                                      label: r.racks,
                                      value: r.racks,
                                    }))}
                                    disabled={!selectedWarehouse}
                                    showSearch
                                    optionFilterProp="label"
                                  />
                                </Col>

                                <Col span={6}>
                                  <Select
                                    placeholder="Compartment"
                                    value={allocationForm.compartment}
                                    style={{ width: "100%" }}
                                    disabled
                                    onChange={(v) =>
                                      setAllocationForm((p) => ({
                                        ...p,
                                        compartment: v,
                                      }))
                                    }
                                    options={compartments.map((c) => ({
                                      label: c,
                                      value: c,
                                    }))}
                                  />
                                </Col>

                                <Col span={5}>
                                  {/* <InputNumber
                                    placeholder="Qty"
                                    style={{ width: "100%" }}
                                    value={allocationForm.qty}
                                    min={1}
                                    max={getRemainingQty(
                                      selectedBatch?.batch_no,
                                    )}
                                    onChange={(value) => handleQtyChange(value)}
                                  /> */}

                                  <input
                                    type="number"
                                    style={{
                                      width: "100%",
                                      padding: "4px 8px",
                                      border: "1px solid #d9d9d9",
                                      borderRadius: 6,
                                    }}
                                    value={allocationForm.qty || ""}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);

                                      setAllocationForm((p) => ({
                                        ...p,
                                        qty: val || null,
                                      }));
                                    }}
                                  />
                                  {qtyError && (
                                    <div
                                      style={{
                                        color: "red",
                                        fontSize: 12,
                                        marginTop: 4,
                                      }}
                                    >
                                      Quantity exceeds available stock.
                                      Remaining: {remaining}
                                    </div>
                                  )}

                                  {/* Immediate Visual Error Message */}
                                  {allocationForm.qty >
                                    getRemainingQty(
                                      selectedBatch?.batch_no,
                                    ) && (
                                    <div
                                      style={{
                                        color: "#ff4d4f",
                                        fontSize: "11px",
                                        marginTop: "4px",
                                      }}
                                    >
                                      Max:{" "}
                                      {getRemainingQty(selectedBatch?.batch_no)}
                                    </div>
                                  )}
                                </Col>

                                <Col span={3}>
                                  <Button
                                    type="primary"
                                    onClick={confirmAllocation}
                                    icon={<CheckOutlined />}
                                    disabled={
                                      !allocationForm.qty ||
                                      allocationForm.qty >
                                        getRemainingQty(selectedBatch?.batch_no)
                                    }
                                  ></Button>
                                </Col>

                                <Col span={4}>
                                  <div style={{ fontSize: 12 }}>
                                    Remaining :
                                    <b style={{ marginLeft: 5 }}>
                                      {getRemainingQty(selectedBatch.batch_no)}
                                    </b>
                                  </div>
                                </Col>
                              </Row>
                            </Card>
                          )}

                          {/* Unified Allocation Table */}
                          <Table
                            style={{ marginTop: 20 }}
                            dataSource={filteredAllocations} // <--- Changed from 'allocations'
                            rowKey="id"
                            pagination={false}
                            size="small"
                            columns={[
                              { title: "Batch", dataIndex: "batch_no" },
                              { title: "Rack", dataIndex: "rack" },
                              {
                                title: "Compartment",
                                dataIndex: "compartment",
                              },
                              { title: "Qty", dataIndex: "qty" },
                              {
                                title: "",
                                render: (_, r) => (
                                  <Button
                                    danger
                                    type="text"
                                    icon={<DeleteOutlined />}
                                    onClick={() => {
                                      setWarehouseBatches((prev) =>
                                        prev.map((b) => ({
                                          ...b,
                                          allocations:
                                            b.allocations?.filter(
                                              (a) => a.id !== r.id,
                                            ) || [],
                                        })),
                                      );
                                    }}
                                  />
                                ),
                              },
                            ]}
                          />
                        </>
                      ),
                    },

                    {
                      key: "finished",
                      label: "Finished",
                      children: (
                        <Table
                          dataSource={savedAllocations}
                          rowKey="id"
                          pagination={false}
                          columns={[
                            { title: "Batch", dataIndex: "batch_no" },
                            { title: "Rack", dataIndex: "rack" },
                            { title: "Qty", dataIndex: "qty" },
                            {
                              title: "Action",
                              render: (_, record) => (
                                <Button
                                  danger
                                  type="text"
                                  icon={<DeleteOutlined />}
                                  onClick={async () => {
                                    await supabase
                                      .from("cycle_allocations")
                                      .delete()
                                      .eq("id", record.id);

                                    message.success("Deleted");

                                    // 🔥 refresh both
                                    await fetchSavedAllocations(selectedProduct);
                                    await loadWarehouseBatches(
                                      selectedWarehouse,
                                    );
                                  }}
                                />
                              ),
                            },
                          ]}
                        />
                      ),
                    },
                  ]}
                />

                {/* Final Submit */}
                <Button
                  type="primary"
                  block
                  disabled={!allFinished}
                  style={{ marginTop: 20 }}
                  onClick={handleFinalSubmit}
                >
                  Final Submit
                </Button>
              </>
            )}
        </Card>
      )}
    </div>
  );
}
