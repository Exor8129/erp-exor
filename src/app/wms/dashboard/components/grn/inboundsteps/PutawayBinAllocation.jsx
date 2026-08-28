// "use client";

// import React, { useState, useEffect, useCallback, useRef } from "react";
// import {
//   Table,
//   Card,
//   Button,
//   Tag,
//   Spin,
//   message,
//   Popconfirm,
//   Badge,
//   Input,
//   Tooltip,
//   Steps,
//   Drawer,
//   Empty,
// } from "antd";
// import {
//   ScanOutlined,
//   BarcodeOutlined,
//   DeleteOutlined,
//   EnvironmentOutlined,
//   InboxOutlined,
//   CheckCircleOutlined,
//   ExclamationCircleOutlined,
//   ReloadOutlined,
//   ArrowRightOutlined,
//   SyncOutlined,
//   EyeOutlined,
//   ClockCircleOutlined,
// } from "@ant-design/icons";
// import { supabase } from "../../../../../lib/supabase";

// export default function PutawayBinAllocation({ grnId, grnData, onComplete }) {
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [grnItems, setGrnItems] = useState([]);
//   const [rackLevels, setRackLevels] = useState([]);
//   const [containersList, setContainersList] = useState([]);
//   const [containerItemsMap, setContainerItemsMap] = useState({});
//   const [allocations, setAllocations] = useState([]);
//   const [scanInput, setScanInput] = useState("");

//   // Drawer state for viewing container items
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [selectedContainerForDrawer, setSelectedContainerForDrawer] = useState(null);

//   // TWO-STEP SCANNING STATES ("SCAN_CONTAINER" | "SCAN_RACK_LEVEL")
//   const [scanStep, setScanStep] = useState("SCAN_CONTAINER");
//   const [scannedContainer, setScannedContainer] = useState(null);
//   const [scannedRackLevel, setScannedRackLevel] = useState(null);

//   const scanInputRef = useRef(null);
//   const activeGrnId = grnId || grnData?.id;

//   // 1. Fetch Rack Levels, Container Items, and GRN Items
//   const fetchData = useCallback(async () => {
//     if (!activeGrnId) return;

//     try {
//       setLoading(true);

//       // Fetch WMS Rack Levels master
//       const { data: levelData, error: levelError } = await supabase
//         .schema("wms")
//         .from("rack_levels")
//         .select("id, rack_id, level_index, barcode");

//       if (levelError) throw levelError;
//       setRackLevels(levelData || []);

//       // Fetch GRN items
//       const { data: grnItemsData, error: grnError } = await supabase
//         .schema("purchase")
//         .from("grn_items")
//         .select(`
//           id,
//           expected_qty,
//           received_qty,
//           purchase_order_items!po_item_id (
//             id,
//             product_id,
//             product_name,
//             product_code,
//             unit
//           )
//         `)
//         .eq("grn_id", activeGrnId);

//       if (grnError) throw grnError;

//       // Fetch packed container items
//       const { data: cItemsData, error: cError } = await supabase
//         .schema("purchase")
//         .from("container_items")
//         .select(`
//           id,
//           container_id,
//           grn_item_id,
//           accepted_qty,
//           containers!container_id (
//             id,
//             barcode
//           )
//         `);

//       if (cError) console.warn("Container items fetch warning:", cError);

//       const cMap = {};
//       const uniqueContainersObj = {};

//       (cItemsData || []).forEach((ci) => {
//         const cId = ci.container_id;
//         const cBarcode = ci.containers?.barcode;
//         const searchBarcode = cBarcode?.toUpperCase();

//         const containerObj = {
//           container_id: cId,
//           barcode: cBarcode,
//           grn_item_id: ci.grn_item_id,
//           accepted_qty: Number(ci.accepted_qty || 0),
//         };

//         if (searchBarcode) {
//           if (!cMap[searchBarcode]) cMap[searchBarcode] = [];
//           cMap[searchBarcode].push(containerObj);
//         }

//         if (cId && !uniqueContainersObj[cId]) {
//           uniqueContainersObj[cId] = {
//             id: cId,
//             barcode: cBarcode || "N/A",
//             items: [],
//             totalQty: 0,
//           };
//         }

//         if (cId && uniqueContainersObj[cId]) {
//           uniqueContainersObj[cId].items.push(containerObj);
//           uniqueContainersObj[cId].totalQty += Number(ci.accepted_qty || 0);
//         }
//       });

//       setContainerItemsMap(cMap);
//       setContainersList(Object.values(uniqueContainersObj));

//       const formattedGrnItems = (grnItemsData || []).map((row) => {
//         const poItem = row.purchase_order_items || {};
//         return {
//           id: row.id,
//           product_id: poItem.product_id,
//           product_name: poItem.product_name || "Unnamed Item",
//           product_code: poItem.product_code || "N/A",
//           unit: poItem.unit || "Pcs",
//           accepted_qty: Number(row.received_qty || row.expected_qty || 0),
//         };
//       });

//       setGrnItems(formattedGrnItems);

//       // Fetch existing container locations for this session
//       const { data: existingLocs, error: locError } = await supabase
//         .schema("purchase")
//         .from("container_locations")
//         .select(`
//           id,
//           container_id,
//           rack_level_id,
//           rack_id,
//           status,
//           containers!container_id (
//             barcode
//           )
//         `)
//         .eq("status", "STORED");

//       if (!locError && existingLocs && existingLocs.length > 0) {
//         setAllocations(
//           existingLocs.map((loc) => ({
//             key: loc.id,
//             id: loc.id,
//             container_id: loc.container_id,
//             barcode: loc.containers?.barcode || "Bulk",
//             rack_level_id: loc.rack_level_id,
//             rack_id: loc.rack_id,
//           }))
//         );
//       }
//     } catch (err) {
//       console.error("Error loading putaway data:", err);
//       message.error(`Failed to load data: ${err.message}`);
//     } finally {
//       setLoading(false);
//     }
//   }, [activeGrnId]);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   const focusScanner = () => {
//     setTimeout(() => scanInputRef.current?.focus(), 50);
//   };

//   // 2. TWO-STEP BARCODE SCANNER LOGIC & INSTANT PERSISTENCE
//   const handleBarcodeScan = (scannedCode) => {
//     const code = scannedCode?.trim()?.toUpperCase();
//     if (!code) return;

//     if (scanStep === "SCAN_CONTAINER") {
//       const matchedContainerItems = containerItemsMap[code];

//       if (matchedContainerItems && matchedContainerItems.length > 0) {
//         const containerId = matchedContainerItems[0].container_id;
//         const containerBarcode = matchedContainerItems[0].barcode;

//         // Check if container is already allocated/stored
//         if (isContainerAllocated(containerId)) {
//           message.warning(`Container "${containerBarcode}" has already been binned/allocated!`);
//           setScanInput("");
//           focusScanner();
//           return;
//         }

//         const containerInfo = {
//           container_id: containerId,
//           barcode: containerBarcode,
//           items: matchedContainerItems,
//         };
//         setScannedContainer(containerInfo);
//         setScanStep("SCAN_RACK_LEVEL");
//         message.success(`Container "${containerInfo.barcode}" Scanned! Now scan target Rack Level Barcode.`);
//       } else {
//         message.error(`Container barcode "${code}" not found or has no packed items.`);
//       }
//     } else if (scanStep === "SCAN_RACK_LEVEL") {
//       const matchedLevel = rackLevels.find(
//         (rl) => rl.barcode?.toUpperCase() === code || rl.id === code
//       );

//       if (matchedLevel) {
//         setScannedRackLevel(matchedLevel);
//         message.success(`Rack Level "${matchedLevel.barcode || matchedLevel.id}" Scanned! Saving allocation...`);
//         executeTwoStepAllocationAndSave(scannedContainer, matchedLevel);
//       } else {
//         message.error(`Rack level barcode "${code}" not found.`);
//       }
//     }

//     setScanInput("");
//     focusScanner();
//   };

//   const executeTwoStepAllocationAndSave = async (container, rackLevel) => {
//     if (!container || !rackLevel) return;

//     // Double check session-level duplicate mapping
//     if (allocations.some((a) => a.container_id === container.container_id)) {
//       message.warning(`Container "${container.barcode}" is already registered.`);
//       resetScanWorkflow();
//       return;
//     }

//     try {
//       setSaving(true);

//       const recordToInsert = {
//         container_id: container.container_id,
//         rack_level_id: rackLevel.id,
//         rack_id: rackLevel.rack_id,
//         status: "STORED",
//       };

//       // Instantly save to Supabase database
//       const { data, error } = await supabase
//         .schema("purchase")
//         .from("container_locations")
//         .insert([recordToInsert])
//         .select()
//         .single();

//       if (error) throw error;

//       const newAllocation = {
//         key: data?.id || `${container.container_id}-${rackLevel.id}-${Date.now()}`,
//         id: data?.id,
//         container_id: container.container_id,
//         barcode: container.barcode,
//         rack_level_id: rackLevel.id,
//         rack_id: rackLevel.rack_id,
//       };

//       setAllocations((prev) => [...prev, newAllocation]);
//       message.success(
//         `Successfully binned Container ${container.barcode} to Rack Level ${rackLevel.barcode || rackLevel.id}`
//       );
//     } catch (err) {
//       console.error("Error saving container location:", err);
//       message.error(`Failed to save location record: ${err.message}`);
//     } finally {
//       setSaving(false);
//       resetScanWorkflow();
//     }
//   };

//   const resetScanWorkflow = () => {
//     setScannedContainer(null);
//     setScannedRackLevel(null);
//     setScanStep("SCAN_CONTAINER");
//     setScanInput("");
//     focusScanner();
//   };

//   const handleRemoveAllocation = async (record) => {
//     try {
//       setLoading(true);
//       if (record.id) {
//         const { error } = await supabase
//           .schema("purchase")
//           .from("container_locations")
//           .delete()
//           .eq("id", record.id);

//         if (error) throw error;
//       }

//       setAllocations((prev) => prev.filter((a) => a.key !== record.key));
//       message.success("Allocation removed successfully.");
//     } catch (err) {
//       console.error("Error removing allocation:", err);
//       message.error(`Failed to remove: ${err.message}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isContainerAllocated = (containerId) => {
//     return allocations.some((a) => a.container_id === containerId);
//   };

//   const isContainerScannedStep1 = (containerId) => {
//     return scannedContainer?.container_id === containerId;
//   };

//   const getContainerRackLevelCode = (containerId) => {
//     const alloc = allocations.find((a) => a.container_id === containerId);
//     if (!alloc) return null;
//     const level = rackLevels.find((rl) => rl.id === alloc.rack_level_id);
//     return level?.barcode || `Level ${level?.level_index}` || alloc.rack_level_id;
//   };

//   // Open Drawer to show items in a container
//   const handleOpenContainerDrawer = (container) => {
//     setSelectedContainerForDrawer(container);
//     setDrawerVisible(true);
//   };

//   // Filter lists into Pending and Allocated sections
//   const pendingContainers = containersList.filter(
//     (c) => !isContainerAllocated(c.id)
//   );
//   const allocatedContainers = containersList.filter((c) =>
//     isContainerAllocated(c.id)
//   );

//   const allocationColumns = [
//     {
//       title: "Container Barcode",
//       dataIndex: "barcode",
//       key: "barcode",
//       width: 160,
//       render: (code) => (
//         <Tag color="blue" icon={<InboxOutlined />} className="font-mono text-xs">
//           {code || "Bulk"}
//         </Tag>
//       ),
//     },
//     {
//       title: "Target Rack Level",
//       key: "rack_level_id",
//       render: (_, record) => {
//         const level = rackLevels.find((rl) => rl.id === record.rack_level_id);
//         return (
//           <Tag color="emerald" icon={<EnvironmentOutlined />} className="font-mono text-xs">
//             {level?.barcode ? `${level.barcode} (L${level.level_index})` : record.rack_level_id}
//           </Tag>
//         );
//       },
//     },
//     {
//       title: "Action",
//       key: "action",
//       width: 80,
//       align: "center",
//       render: (_, record) => (
//         <Popconfirm
//           title="Remove allocation?"
//           onConfirm={() => handleRemoveAllocation(record)}
//           okText="Remove"
//           cancelText="Cancel"
//         >
//           <Button type="text" danger icon={<DeleteOutlined />} size="small" />
//         </Popconfirm>
//       ),
//     },
//   ];

//   const drawerColumns = [
//     {
//       title: "Product Name",
//       key: "product_name",
//       render: (_, record) => {
//         const item = grnItems.find((i) => i.id === record.grn_item_id);
//         return (
//           <div className="flex flex-col">
//             <span className="font-semibold text-slate-800">
//               {item?.product_name || "Item"}
//             </span>
//             <span className="font-mono text-xs text-slate-400">
//               {item?.product_code || "N/A"}
//             </span>
//           </div>
//         );
//       },
//     },
//     {
//       title: "Packed Qty",
//       dataIndex: "accepted_qty",
//       key: "accepted_qty",
//       width: 110,
//       align: "center",
//       render: (qty, record) => {
//         const item = grnItems.find((i) => i.id === record.grn_item_id);
//         return (
//           <span className="font-mono font-bold text-slate-700">
//             {qty} {item?.unit || "Pcs"}
//           </span>
//         );
//       },
//     },
//   ];

//   const renderContainerCard = (container, index, isAllocatedSection) => {
//     const allocated = isContainerAllocated(container.id);
//     const step1Scanned = isContainerScannedStep1(container.id);
//     const assignedLevelCode = getContainerRackLevelCode(container.id);

//     return (
//       <Card
//         key={container.id || index}
//         hoverable
//         size="small"
//         onClick={() => handleOpenContainerDrawer(container)}
//         className={`relative transition-all duration-200 border-2 ${
//           allocated
//             ? "border-emerald-500 bg-emerald-50/20 shadow-xs"
//             : step1Scanned
//             ? "border-blue-500 bg-blue-50/40 shadow-sm animate-pulse"
//             : "border-slate-200 hover:border-blue-400 bg-white"
//         }`}
//       >
//         <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
//           <span className="font-extrabold text-slate-700 text-sm tracking-wide">
//             Box {index + 1}
//           </span>
//           {allocated ? (
//             <Tag icon={<CheckCircleOutlined />} color="green" className="m-0 font-semibold uppercase">
//               Allocated
//             </Tag>
//           ) : step1Scanned ? (
//             <Tag icon={<ScanOutlined />} color="processing" className="m-0 font-semibold uppercase animate-bounce">
//               Scanned
//             </Tag>
//           ) : (
//             <Tag icon={<ClockCircleOutlined />} color="warning" className="m-0 uppercase">
//               Pending
//             </Tag>
//           )}
//         </div>

//         <div className="space-y-2">
//           <div className="flex items-center justify-between">
//             <span className="text-xs text-slate-400 uppercase font-semibold">Barcode</span>
//             <span className="font-mono font-bold text-slate-800 text-sm">
//               {container.barcode || "N/A"}
//             </span>
//           </div>

//           {allocated && assignedLevelCode && (
//             <div className="flex items-center justify-between bg-emerald-100/70 px-2 py-1 rounded">
//               <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
//                 <EnvironmentOutlined /> Target Level:
//               </span>
//               <span className="font-mono font-bold text-emerald-900 text-xs">
//                 {assignedLevelCode}
//               </span>
//             </div>
//           )}

//           <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
//             <span>
//               Items Line: <strong>{container.items?.length || 0}</strong>
//             </span>
//             <Button
//               type="link"
//               size="small"
//               icon={<EyeOutlined />}
//               className="p-0 h-auto text-blue-600 font-medium"
//             >
//               View Contents
//             </Button>
//           </div>
//         </div>
//       </Card>
//     );
//   };

//   return (
//     <div className="space-y-4">
//       {/* SCANNING WORKFLOW STEP INDICATOR BANNER */}
//       <Card
//         size="small"
//         className={`border transition-all ${
//           scanStep === "SCAN_CONTAINER"
//             ? "bg-blue-50/60 border-blue-300"
//             : "bg-emerald-50/60 border-emerald-300"
//         }`}
//       >
//         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
//           <div className="flex-1 w-full">
//             <Steps
//               size="small"
//               current={scanStep === "SCAN_CONTAINER" ? 0 : 1}
//               items={[
//                 {
//                   title: "Step 1: Scan Container",
//                   description: scannedContainer
//                     ? `Container: ${scannedContainer.barcode}`
//                     : "Scan Container Barcode",
//                   icon: <InboxOutlined />,
//                 },
//                 {
//                   title: "Step 2: Scan Rack Level",
//                   description: scannedRackLevel
//                     ? `Level Barcode: ${scannedRackLevel.barcode}`
//                     : "Scan Target Level Barcode",
//                   icon: <EnvironmentOutlined />,
//                 },
//               ]}
//             />
//           </div>

//           {scanStep === "SCAN_RACK_LEVEL" && (
//             <Button
//               icon={<SyncOutlined />}
//               onClick={resetScanWorkflow}
//               size="small"
//             >
//               Reset Sequence
//             </Button>
//           )}
//         </div>
//       </Card>

//       {/* SCANNER INPUT BOX */}
//       <Card size="small" className="border-slate-200/80 shadow-xs bg-slate-50">
//         <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
//           <div className="flex items-center gap-2 flex-1 w-full">
//             <Input
//               ref={scanInputRef}
//               prefix={
//                 <ScanOutlined
//                   className={`text-base animate-pulse ${
//                     scanStep === "SCAN_CONTAINER" ? "text-blue-600" : "text-emerald-600"
//                   }`}
//                 />
//               }
//               placeholder={
//                 scanStep === "SCAN_CONTAINER"
//                   ? "[STEP 1] Scan Container Barcode..."
//                   : "[STEP 2] Scan Rack Level Barcode..."
//               }
//               value={scanInput}
//               onChange={(e) => setScanInput(e.target.value)}
//               onPressEnter={(e) => handleBarcodeScan(e.target.value)}
//               className={`font-mono bg-white shadow-xs ${
//                 scanStep === "SCAN_CONTAINER"
//                   ? "border-blue-300 focus:border-blue-500"
//                   : "border-emerald-300 focus:border-emerald-500"
//               }`}
//               allowClear
//               autoFocus
//             />
//             <Tooltip title="Focus Scanner Input">
//               <Button
//                 icon={<BarcodeOutlined />}
//                 onClick={focusScanner}
//                 className="bg-white"
//               >
//                 Ready
//               </Button>
//             </Tooltip>
//           </div>
//           <span className="text-xs text-slate-500 font-mono italic">
//             *Allocations save automatically upon successful level scan.
//           </span>
//         </div>
//       </Card>

//       {/* SECTION 1: CONTAINERS PENDING PUTAWAY */}
//       <Card
//         size="small"
//         className="border-amber-200/80 shadow-xs bg-amber-50/10"
//         title={
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <ExclamationCircleOutlined className="text-amber-600" />
//               <span className="font-bold text-slate-800">
//                 Containers Pending Putaway
//               </span>
//               <Badge
//                 count={pendingContainers.length}
//                 overflowCount={999}
//                 style={{ backgroundColor: "#d97706" }}
//               />
//             </div>
//             <Button
//               type="text"
//               icon={<ReloadOutlined />}
//               onClick={fetchData}
//               loading={loading}
//               size="small"
//             >
//               Refresh
//             </Button>
//           </div>
//         }
//       >
//         <Spin spinning={loading}>
//           {pendingContainers.length === 0 ? (
//             <Empty
//               description="No pending containers left for putaway"
//               className="py-4"
//             />
//           ) : (
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
//               {pendingContainers.map((container, index) =>
//                 renderContainerCard(container, index, false)
//               )}
//             </div>
//           )}
//         </Spin>
//       </Card>

//       {/* SECTION 2: ALLOCATED / BINNED CONTAINERS */}
//       <Card
//         size="small"
//         className="border-emerald-200/80 shadow-xs bg-emerald-50/10"
//         title={
//           <div className="flex items-center gap-2">
//             <CheckCircleOutlined className="text-emerald-600" />
//             <span className="font-bold text-slate-800">
//               Allocated Containers
//             </span>
//             <Badge
//               count={allocatedContainers.length}
//               overflowCount={999}
//               style={{ backgroundColor: "#059669" }}
//             />
//           </div>
//         }
//       >
//         {allocatedContainers.length === 0 ? (
//           <Empty
//             description="No containers allocated to rack levels yet"
//             className="py-4"
//           />
//         ) : (
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
//             {allocatedContainers.map((container, index) =>
//               renderContainerCard(container, index, true)
//             )}
//           </div>
//         )}
//       </Card>

//       {/* COMPLETED SEQUENCED ALLOCATIONS SHEET */}
//       {allocations.length > 0 && (
//         <Card
//           size="small"
//           className="border-slate-200/80 shadow-xs bg-slate-50/50"
//           title={
//             <div className="flex items-center gap-2">
//               <EnvironmentOutlined className="text-blue-600" />
//               <span className="font-bold text-slate-800">
//                 Binned Allocations Sheet
//               </span>
//               <Tag color="blue" className="font-mono">
//                 {allocations.length} Container(s)
//               </Tag>
//             </div>
//           }
//         >
//           <Table
//             dataSource={allocations}
//             columns={allocationColumns}
//             rowKey="key"
//             pagination={false}
//             size="small"
//             bordered
//           />
//         </Card>
//       )}

//       {/* CONTAINER CONTENTS DRAWER */}
//       <Drawer
//         title={
//           <div className="flex items-center gap-2">
//             <InboxOutlined className="text-blue-600" />
//             <span>
//               Container: <strong>{selectedContainerForDrawer?.barcode}</strong>
//             </span>
//           </div>
//         }
//         placement="right"
//         width={450}
//         onClose={() => setDrawerVisible(false)}
//         open={drawerVisible}
//       >
//         {selectedContainerForDrawer && (
//           <div className="space-y-4">
//             <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
//               <div className="flex justify-between text-xs text-slate-600">
//                 <span>Barcode:</span>
//                 <span className="font-mono font-semibold text-slate-800">
//                   {selectedContainerForDrawer.barcode}
//                 </span>
//               </div>
//               <div className="flex justify-between text-xs text-slate-600">
//                 <span>Total Lines Packed:</span>
//                 <span className="font-semibold text-slate-800">
//                   {selectedContainerForDrawer.items?.length || 0}
//                 </span>
//               </div>
//             </div>

//             <Table
//               dataSource={selectedContainerForDrawer.items || []}
//               columns={drawerColumns}
//               rowKey={(item) => `${item.grn_item_id}-${item.accepted_qty}`}
//               pagination={false}
//               size="small"
//               bordered
//             />
//           </div>
//         )}
//       </Drawer>

//       {/* FINALIZATION FOOTER */}
//       <div className="flex items-center justify-between pt-2">
//         <span className="text-xs text-slate-500 font-mono">
//           Container location records commit instantly on scan.
//         </span>
//         {onComplete && (
//           <Button
//             type="primary"
//             size="large"
//             icon={<ArrowRightOutlined />}
//             onClick={onComplete}
//             className="bg-emerald-600 hover:bg-emerald-500 font-semibold shadow-md"
//           >
//             Complete Putaway Step
//           </Button>
//         )}
//       </div>
//     </div>
//   );
// }


"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Table,
  Card,
  Button,
  Tag,
  Spin,
  message,
  Popconfirm,
  Badge,
  Input,
  Tooltip,
  Steps,
  Drawer,
  Empty,
} from "antd";
import {
  ScanOutlined,
  BarcodeOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  SyncOutlined,
  EyeOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { supabase } from "../../../../../lib/supabase";

export default function PutawayBinAllocation({ grnId, grnData, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grnItems, setGrnItems] = useState([]);
  const [rackLevels, setRackLevels] = useState([]);
  const [containersList, setContainersList] = useState([]);
  const [containerItemsMap, setContainerItemsMap] = useState({});
  const [allocations, setAllocations] = useState([]);
  const [scanInput, setScanInput] = useState("");

  // Drawer state for viewing container items
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedContainerForDrawer, setSelectedContainerForDrawer] = useState(null);

  // TWO-STEP SCANNING STATES ("SCAN_CONTAINER" | "SCAN_RACK_LEVEL")
  const [scanStep, setScanStep] = useState("SCAN_CONTAINER");
  const [scannedContainer, setScannedContainer] = useState(null);
  const [scannedRackLevel, setScannedRackLevel] = useState(null);

  const scanInputRef = useRef(null);
  const activeGrnId = grnId || grnData?.id;

  // 1. Fetch Rack Levels, Container Items, and GRN Items
  const fetchData = useCallback(async () => {
    if (!activeGrnId) return;

    try {
      setLoading(true);

      // Fetch WMS Rack Levels master
      const { data: levelData, error: levelError } = await supabase
        .schema("wms")
        .from("rack_levels")
        .select("id, rack_id, level_index, barcode");

      if (levelError) throw levelError;
      setRackLevels(levelData || []);

      // Fetch GRN items
      const { data: grnItemsData, error: grnError } = await supabase
        .schema("purchase")
        .from("grn_items")
        .select(`
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
        `)
        .eq("grn_id", activeGrnId);

      if (grnError) throw grnError;

      // Fetch packed container items
      const { data: cItemsData, error: cError } = await supabase
        .schema("purchase")
        .from("container_items")
        .select(`
          id,
          container_id,
          grn_item_id,
          accepted_qty,
          containers!container_id (
            id,
            barcode
          )
        `);

      if (cError) console.warn("Container items fetch warning:", cError);

      const cMap = {};
      const uniqueContainersObj = {};

      (cItemsData || []).forEach((ci) => {
        const cId = ci.container_id;
        const cBarcode = ci.containers?.barcode;
        const searchBarcode = cBarcode?.toUpperCase();

        const containerObj = {
          container_id: cId,
          barcode: cBarcode,
          grn_item_id: ci.grn_item_id,
          accepted_qty: Number(ci.accepted_qty || 0),
        };

        if (searchBarcode) {
          if (!cMap[searchBarcode]) cMap[searchBarcode] = [];
          cMap[searchBarcode].push(containerObj);
        }

        if (cId && !uniqueContainersObj[cId]) {
          uniqueContainersObj[cId] = {
            id: cId,
            barcode: cBarcode || "N/A",
            items: [],
            totalQty: 0,
          };
        }

        if (cId && uniqueContainersObj[cId]) {
          uniqueContainersObj[cId].items.push(containerObj);
          uniqueContainersObj[cId].totalQty += Number(ci.accepted_qty || 0);
        }
      });

      setContainerItemsMap(cMap);
      setContainersList(Object.values(uniqueContainersObj));

      // Fetch existing container locations for this session
      const { data: existingLocs, error: locError } = await supabase
        .schema("purchase")
        .from("container_locations")
        .select(`
          id,
          container_id,
          rack_level_id,
          rack_id,
          status,
          containers!container_id (
            barcode
          )
        `)
        .eq("status", "STORED");

      if (!locError && existingLocs && existingLocs.length > 0) {
        setAllocations(
          existingLocs.map((loc) => ({
            key: loc.id,
            id: loc.id,
            container_id: loc.container_id,
            barcode: loc.containers?.barcode || "Bulk",
            rack_level_id: loc.rack_level_id,
            rack_id: loc.rack_id,
          }))
        );
      }
    } catch (err) {
      console.error("Error loading putaway data:", err);
      message.error(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [activeGrnId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const focusScanner = () => {
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  // 2. TWO-STEP BARCODE SCANNER LOGIC & INSTANT PERSISTENCE
  const handleBarcodeScan = (scannedCode) => {
    const code = scannedCode?.trim()?.toUpperCase();
    if (!code) return;

    if (scanStep === "SCAN_CONTAINER") {
      const matchedContainerItems = containerItemsMap[code];

      if (matchedContainerItems && matchedContainerItems.length > 0) {
        const containerId = matchedContainerItems[0].container_id;
        const containerBarcode = matchedContainerItems[0].barcode;

        // Check if container is already allocated/stored
        if (isContainerAllocated(containerId)) {
          message.warning(`Container "${containerBarcode}" has already been binned/allocated!`);
          setScanInput("");
          focusScanner();
          return;
        }

        const containerInfo = {
          container_id: containerId,
          barcode: containerBarcode,
          items: matchedContainerItems,
        };
        setScannedContainer(containerInfo);
        setScanStep("SCAN_RACK_LEVEL");
        message.success(`Container "${containerInfo.barcode}" Scanned! Now scan target Rack Level Barcode.`);
      } else {
        message.error(`Container barcode "${code}" not found or has no packed items.`);
      }
    } else if (scanStep === "SCAN_RACK_LEVEL") {
      const matchedLevel = rackLevels.find(
        (rl) => rl.barcode?.toUpperCase() === code || rl.id === code
      );

      if (matchedLevel) {
        setScannedRackLevel(matchedLevel);
        message.success(`Rack Level "${matchedLevel.barcode || matchedLevel.id}" Scanned! Processing mock save...`);
        executeTwoStepAllocationAndSave(scannedContainer, matchedLevel);
      } else {
        message.error(`Rack level barcode "${code}" not found.`);
      }
    }

    setScanInput("");
    focusScanner();
  };

  const executeTwoStepAllocationAndSave = async (container, rackLevel) => {
    if (!container || !rackLevel) return;

    // Double check session-level duplicate mapping
    if (allocations.some((a) => a.container_id === container.container_id)) {
      message.warning(`Container "${container.barcode}" is already registered.`);
      resetScanWorkflow();
      return;
    }

    try {
      setSaving(true);

      const recordToInsert = {
        container_id: container.container_id,
        rack_level_id: rackLevel.id,
        rack_id: rackLevel.rack_id,
        status: "STORED",
      };

      // ==============================================================
      // 🛑 REAL DATABASE INSERTION COMMENTED OUT FOR TESTING
      // ==============================================================
      /*
      const { data, error } = await supabase
        .schema("purchase")
        .from("container_locations")
        .insert([recordToInsert])
        .select()
        .single();

      if (error) throw error;
      */

      // 🔍 CONSOLE PREVIEW INSTEAD
      
      console.log("Payload Being Inserted:", recordToInsert);
      console.log("GRN:",grnData);

      // Mock returning data so the UI continues to function in test mode
      const mockReturnedData = {
        id: `mock-loc-${Date.now()}`
      };
      // ==============================================================

      const newAllocation = {
        key: mockReturnedData.id || `${container.container_id}-${rackLevel.id}-${Date.now()}`,
        id: mockReturnedData.id,
        container_id: container.container_id,
        barcode: container.barcode,
        rack_level_id: rackLevel.id,
        rack_id: rackLevel.rack_id,
      };

      setAllocations((prev) => [...prev, newAllocation]);
      message.success(
        `[MOCK] Successfully binned Container ${container.barcode} to Rack Level ${rackLevel.barcode || rackLevel.id} (Check console for payload)`
      );
    } catch (err) {
      console.error("Error saving container location:", err);
      message.error(`Failed to save location record: ${err.message}`);
    } finally {
      setSaving(false);
      resetScanWorkflow();
    }
  };

  const resetScanWorkflow = () => {
    setScannedContainer(null);
    setScannedRackLevel(null);
    setScanStep("SCAN_CONTAINER");
    setScanInput("");
    focusScanner();
  };

  const handleRemoveAllocation = async (record) => {
    try {
      setLoading(true);
      if (record.id) {
        
        // ==============================================================
        // 🛑 REAL DATABASE DELETION COMMENTED OUT FOR TESTING
        // ==============================================================
        /*
        const { error } = await supabase
          .schema("purchase")
          .from("container_locations")
          .delete()
          .eq("id", record.id);

        if (error) throw error;
        */

        // 🔍 CONSOLE PREVIEW INSTEAD
        console.groupCollapsed("🔴 DB DELETE PREVIEW: container_locations");
        console.log("Schema:", "purchase");
        console.log("Table:", "container_locations");
        console.log("Match Condition:", `id = ${record.id}`);
        console.groupEnd();
        // ==============================================================

      }

      setAllocations((prev) => prev.filter((a) => a.key !== record.key));
      message.success("[MOCK] Allocation removed successfully (Check console).");
    } catch (err) {
      console.error("Error removing allocation:", err);
      message.error(`Failed to remove: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isContainerAllocated = (containerId) => {
    return allocations.some((a) => a.container_id === containerId);
  };

  const isContainerScannedStep1 = (containerId) => {
    return scannedContainer?.container_id === containerId;
  };

  const getContainerRackLevelCode = (containerId) => {
    const alloc = allocations.find((a) => a.container_id === containerId);
    if (!alloc) return null;
    const level = rackLevels.find((rl) => rl.id === alloc.rack_level_id);
    return level?.barcode || `Level ${level?.level_index}` || alloc.rack_level_id;
  };

  // Open Drawer to show items in a container
  const handleOpenContainerDrawer = (container) => {
    setSelectedContainerForDrawer(container);
    setDrawerVisible(true);
  };

  // Filter lists into Pending and Allocated sections
  const pendingContainers = containersList.filter(
    (c) => !isContainerAllocated(c.id)
  );
  const allocatedContainers = containersList.filter((c) =>
    isContainerAllocated(c.id)
  );

  const allocationColumns = [
    {
      title: "Container Barcode",
      dataIndex: "barcode",
      key: "barcode",
      width: 160,
      render: (code) => (
        <Tag color="blue" icon={<InboxOutlined />} className="font-mono text-xs">
          {code || "Bulk"}
        </Tag>
      ),
    },
    {
      title: "Target Rack Level",
      key: "rack_level_id",
      render: (_, record) => {
        const level = rackLevels.find((rl) => rl.id === record.rack_level_id);
        return (
          <Tag color="emerald" icon={<EnvironmentOutlined />} className="font-mono text-xs">
            {level?.barcode ? `${level.barcode} (L${level.level_index})` : record.rack_level_id}
          </Tag>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      align: "center",
      render: (_, record) => (
        <Popconfirm
          title="Remove allocation?"
          onConfirm={() => handleRemoveAllocation(record)}
          okText="Remove"
          cancelText="Cancel"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  const drawerColumns = [
    {
      title: "Product Name",
      key: "product_name",
      render: (_, record) => {
        const item = grnItems.find((i) => i.id === record.grn_item_id);
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">
              {item?.product_name || "Item"}
            </span>
            <span className="font-mono text-xs text-slate-400">
              {item?.product_code || "N/A"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Packed Qty",
      dataIndex: "accepted_qty",
      key: "accepted_qty",
      width: 110,
      align: "center",
      render: (qty, record) => {
        const item = grnItems.find((i) => i.id === record.grn_item_id);
        return (
          <span className="font-mono font-bold text-slate-700">
            {qty} {item?.unit || "Pcs"}
          </span>
        );
      },
    },
  ];

  const renderContainerCard = (container, index, isAllocatedSection) => {
    const allocated = isContainerAllocated(container.id);
    const step1Scanned = isContainerScannedStep1(container.id);
    const assignedLevelCode = getContainerRackLevelCode(container.id);

    return (
      <Card
        key={container.id || index}
        hoverable
        size="small"
        onClick={() => handleOpenContainerDrawer(container)}
        className={`relative transition-all duration-200 border-2 ${
          allocated
            ? "border-emerald-500 bg-emerald-50/20 shadow-xs"
            : step1Scanned
            ? "border-blue-500 bg-blue-50/40 shadow-sm animate-pulse"
            : "border-slate-200 hover:border-blue-400 bg-white"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
          <span className="font-extrabold text-slate-700 text-sm tracking-wide">
            Box {index + 1}
          </span>
          {allocated ? (
            <Tag icon={<CheckCircleOutlined />} color="green" className="m-0 font-semibold uppercase">
              Allocated
            </Tag>
          ) : step1Scanned ? (
            <Tag icon={<ScanOutlined />} color="processing" className="m-0 font-semibold uppercase animate-bounce">
              Scanned
            </Tag>
          ) : (
            <Tag icon={<ClockCircleOutlined />} color="warning" className="m-0 uppercase">
              Pending
            </Tag>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Barcode</span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              {container.barcode || "N/A"}
            </span>
          </div>

          {allocated && assignedLevelCode && (
            <div className="flex items-center justify-between bg-emerald-100/70 px-2 py-1 rounded">
              <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                <EnvironmentOutlined /> Target Level:
              </span>
              <span className="font-mono font-bold text-emerald-900 text-xs">
                {assignedLevelCode}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Items Line: <strong>{container.items?.length || 0}</strong>
            </span>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              className="p-0 h-auto text-blue-600 font-medium"
            >
              View Contents
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* SCANNING WORKFLOW STEP INDICATOR BANNER */}
      <Card
        size="small"
        className={`border transition-all ${
          scanStep === "SCAN_CONTAINER"
            ? "bg-blue-50/60 border-blue-300"
            : "bg-emerald-50/60 border-emerald-300"
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1 w-full">
            <Steps
              size="small"
              current={scanStep === "SCAN_CONTAINER" ? 0 : 1}
              items={[
                {
                  title: "Step 1: Scan Container",
                  description: scannedContainer
                    ? `Container: ${scannedContainer.barcode}`
                    : "Scan Container Barcode",
                  icon: <InboxOutlined />,
                },
                {
                  title: "Step 2: Scan Rack Level",
                  description: scannedRackLevel
                    ? `Level Barcode: ${scannedRackLevel.barcode}`
                    : "Scan Target Level Barcode",
                  icon: <EnvironmentOutlined />,
                },
              ]}
            />
          </div>

          {scanStep === "SCAN_RACK_LEVEL" && (
            <Button
              icon={<SyncOutlined />}
              onClick={resetScanWorkflow}
              size="small"
            >
              Reset Sequence
            </Button>
          )}
        </div>
      </Card>

      {/* SCANNER INPUT BOX */}
      <Card size="small" className="border-slate-200/80 shadow-xs bg-slate-50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 w-full">
            <Input
              ref={scanInputRef}
              prefix={
                <ScanOutlined
                  className={`text-base animate-pulse ${
                    scanStep === "SCAN_CONTAINER" ? "text-blue-600" : "text-emerald-600"
                  }`}
                />
              }
              placeholder={
                scanStep === "SCAN_CONTAINER"
                  ? "[STEP 1] Scan Container Barcode..."
                  : "[STEP 2] Scan Rack Level Barcode..."
              }
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onPressEnter={(e) => handleBarcodeScan(e.target.value)}
              className={`font-mono bg-white shadow-xs ${
                scanStep === "SCAN_CONTAINER"
                  ? "border-blue-300 focus:border-blue-500"
                  : "border-emerald-300 focus:border-emerald-500"
              }`}
              allowClear
              autoFocus
            />
            <Tooltip title="Focus Scanner Input">
              <Button
                icon={<BarcodeOutlined />}
                onClick={focusScanner}
                className="bg-white"
              >
                Ready
              </Button>
            </Tooltip>
          </div>
          <span className="text-xs text-slate-500 font-mono italic">
            *Allocations save automatically upon successful level scan.
          </span>
        </div>
      </Card>

      {/* SECTION 1: CONTAINERS PENDING PUTAWAY */}
      <Card
        size="small"
        className="border-amber-200/80 shadow-xs bg-amber-50/10"
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExclamationCircleOutlined className="text-amber-600" />
              <span className="font-bold text-slate-800">
                Containers Pending Putaway
              </span>
              <Badge
                count={pendingContainers.length}
                overflowCount={999}
                style={{ backgroundColor: "#d97706" }}
              />
            </div>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
              size="small"
            >
              Refresh
            </Button>
          </div>
        }
      >
        <Spin spinning={loading}>
          {pendingContainers.length === 0 ? (
            <Empty
              description="No pending containers left for putaway"
              className="py-4"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
              {pendingContainers.map((container, index) =>
                renderContainerCard(container, index, false)
              )}
            </div>
          )}
        </Spin>
      </Card>

      {/* SECTION 2: ALLOCATED / BINNED CONTAINERS */}
      <Card
        size="small"
        className="border-emerald-200/80 shadow-xs bg-emerald-50/10"
        title={
          <div className="flex items-center gap-2">
            <CheckCircleOutlined className="text-emerald-600" />
            <span className="font-bold text-slate-800">
              Allocated Containers
            </span>
            <Badge
              count={allocatedContainers.length}
              overflowCount={999}
              style={{ backgroundColor: "#059669" }}
            />
          </div>
        }
      >
        {allocatedContainers.length === 0 ? (
          <Empty
            description="No containers allocated to rack levels yet"
            className="py-4"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
            {allocatedContainers.map((container, index) =>
              renderContainerCard(container, index, true)
            )}
          </div>
        )}
      </Card>

      {/* COMPLETED SEQUENCED ALLOCATIONS SHEET */}
      {allocations.length > 0 && (
        <Card
          size="small"
          className="border-slate-200/80 shadow-xs bg-slate-50/50"
          title={
            <div className="flex items-center gap-2">
              <EnvironmentOutlined className="text-blue-600" />
              <span className="font-bold text-slate-800">
                Binned Allocations Sheet
              </span>
              <Tag color="blue" className="font-mono">
                {allocations.length} Container(s)
              </Tag>
            </div>
          }
        >
          <Table
            dataSource={allocations}
            columns={allocationColumns}
            rowKey="key"
            pagination={false}
            size="small"
            bordered
          />
        </Card>
      )}

      {/* CONTAINER CONTENTS DRAWER */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <InboxOutlined className="text-blue-600" />
            <span>
              Container: <strong>{selectedContainerForDrawer?.barcode}</strong>
            </span>
          </div>
        }
        placement="right"
        width={450}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedContainerForDrawer && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Barcode:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedContainerForDrawer.barcode}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total Lines Packed:</span>
                <span className="font-semibold text-slate-800">
                  {selectedContainerForDrawer.items?.length || 0}
                </span>
              </div>
            </div>

            <Table
              dataSource={selectedContainerForDrawer.items || []}
              columns={drawerColumns}
              rowKey={(item) => `${item.grn_item_id}-${item.accepted_qty}`}
              pagination={false}
              size="small"
              bordered
            />
          </div>
        )}
      </Drawer>

      {/* FINALIZATION FOOTER */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-500 font-mono">
          Container location records commit instantly on scan.
        </span>
        {onComplete && (
          <Button
            type="primary"
            size="large"
            icon={<ArrowRightOutlined />}
            onClick={onComplete}
            className="bg-emerald-600 hover:bg-emerald-500 font-semibold shadow-md"
          >
            Complete Putaway Step
          </Button>
        )}
      </div>
    </div>
  );
}