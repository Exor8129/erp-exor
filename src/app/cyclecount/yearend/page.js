





// "use client";

// import { useState, useEffect, useMemo } from "react";
// import { supabase } from "../../lib/supabase";
// import {
//   Card, Row, Col, Divider, message, Tabs, Typography,
//   Table, Tag, InputNumber, DatePicker, Input, Button, AutoComplete
// } from "antd";
// import {
//   BarcodeOutlined, PlusOutlined, DeleteOutlined, SaveOutlined,
//   CheckCircleOutlined, HistoryOutlined, ThunderboltOutlined,
//   GlobalOutlined, PrinterOutlined
// } from "@ant-design/icons";
// import dayjs from "dayjs";

// const { Text, Title } = Typography;


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
  
//   /* Remove all borders and boxes for a clean text-only look */
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

//   /* Hide the up/down arrows in the number input during print */
//   .thermal-slip .ant-input-number-handler-wrap {
//     display: none !important;
//   }

//   /* Darken disabled text for thermal readability */
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


// const extendedStyles = `
//   ${thermalStyles}
//   /* Hide DatePicker icon when disabled */
//   .ant-picker-disabled .ant-picker-suffix {
//     display: none !important;
//   }
//   /* Optional: Make disabled text darker for better thermal printing */
//   .ant-picker-disabled input {
//     color: #000 !important;
//   }
// `;




// export default function YearEndPage() {
//   const [mounted, setMounted] = useState(false);
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [team, setTeam] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const [products, setProducts] = useState([]);
//   const [selectedProduct, setSelectedProduct] = useState(null);
//   const [countingUnits, setCountingUnits] = useState([]);
//   const [activeTab, setActiveTab] = useState("all");

//   useEffect(() => {
//     setMounted(true);
//     if (window.location.hostname === "localhost") {
//       setIsLoggedIn(true);
//       setTeam({ id: 0, team_leader: "Developer Mode" });
//     }
//   }, []);

//   useEffect(() => {
//     if (isLoggedIn) fetchInventory();
//   }, [isLoggedIn]);

//   useEffect(() => {
//     if (!selectedProduct) return;
//     const pendingUnits = selectedProduct.systemUnits.filter(u => u.status !== "submitted");
//     if (selectedProduct.tracking_type === "none") {
//       setCountingUnits([{ tempId: "system-row", quantity: null, isSystem: true }]);
//     } else {
//       setCountingUnits(
//         pendingUnits.map((unit, index) => ({
//           tempId: `system-${index}`,
//           id: unit.id,
//           batch_no: unit.count_batch_no || unit.sys_batch_no || "",
//           serial_no: unit.count_serial_no || unit.sys_serial_no || "",
//           expiry_date: unit.count_expiry_date || unit.sys_expiry_date || null,
//           quantity: null,
//           isSystem: true
//         }))
//       );
//     }
//   }, [selectedProduct]);

//   // Greyscale-optimized Totals
//   const totals = useMemo(() => {
//     if (!selectedProduct) return { history: 0, pending: 0, total: 0 };
//     const history = selectedProduct.systemUnits.filter(u => u.status === "submitted").reduce((s, u) => s + (Number(u.count_quantity) || 0), 0);
//     const pending = countingUnits.reduce((s, u) => s + (Number(u.quantity) || 0), 0);
//     return { history, pending, total: history + pending };
//   }, [selectedProduct, countingUnits]);

//   const fetchInventory = async () => {
//     setLoading(true);
//     try {
//       const { data, error } = await supabase.from("cycle_items").select(`
//         id, cycle_id, item_id, status, sys_batch_no, sys_serial_no, sys_expiry_date,
//         count_batch_no, count_serial_no, count_expiry_date, count_quantity, counted_at,
//         item_master (id, item_name, tracking_type, mrp, current_stock)
//       `);
//       if (error) throw error;
//       const grouped = data.reduce((acc, curr) => {
//         const itemId = curr.item_id;
//         if (!acc[itemId]) acc[itemId] = { ...curr.item_master, cycle_id: curr.cycle_id, status: curr.status, systemUnits: [] };
//         acc[itemId].systemUnits.push(curr);
//         if (curr.status === "pending") acc[itemId].status = "pending";
//         return acc;
//       }, {});
//       setProducts(Object.values(grouped));
//     } catch (err) { message.error("Database Error"); }
//     finally { setLoading(false); }
//   };

//   const getOptions = (field, val, currentId) => {
//     const uniqueVals = new Map();
//     selectedProduct?.systemUnits?.forEach(u => {
//       const v = field === "batch_no" ? (u.count_batch_no || u.sys_batch_no) : (u.count_serial_no || u.sys_serial_no);
//       if (v) uniqueVals.set(v, "History");
//     });
//     countingUnits.forEach(u => {
//       if (u.tempId !== currentId) {
//         const v = field === "batch_no" ? u.batch_no : u.serial_no;
//         if (v) uniqueVals.set(v, "Active");
//       }
//     });
//     return Array.from(uniqueVals.entries())
//       .filter(([v]) => !val || v.toLowerCase().includes(val.toLowerCase()))
//       .map(([v, type]) => ({
//         key: `opt-${v}-${type}`,
//         value: v,
//         label: <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{v}</span><Tag variant="outlined" style={{ fontSize: 9 }}>{type}</Tag></div>
//       }));
//   };

//   const updateField = (id, f, v) => setCountingUnits(prev => prev.map(u => u.tempId === id ? { ...u, [f]: v } : u));

//   const handleSubmit = async () => {
//     setLoading(true);
//     try {
//       const activeUnits = countingUnits.filter(u => u.quantity !== null);
//       for (const unit of activeUnits) {
//         const payload = {
//           count_quantity: unit.quantity, count_batch_no: unit.batch_no || null, count_serial_no: unit.serial_no || null,
//           count_expiry_date: unit.expiry_date ? dayjs(unit.expiry_date).format("YYYY-MM-DD") : null,
//           status: "submitted", counted_at: new Date()
//         };
//         if (unit.isSystem) await supabase.from("cycle_items").update(payload).eq("id", unit.id);
//         else await supabase.from("cycle_items").insert([{ ...payload, cycle_id: selectedProduct.cycle_id, item_id: selectedProduct.id }]);
//       }
//       message.success("Logs Saved");
//       fetchInventory();
//       setSelectedProduct(null);
//     } catch (e) { message.error("Error Saving"); }
//     finally { setLoading(false); }
//   };

//   const filteredItems = useMemo(() => activeTab === "all" ? products : products.filter(p => p.status === activeTab), [products, activeTab]);

//   return (
//     <div style={{ padding: 20, background: "#fff", minHeight: "100vh" }}>
//       <style>{thermalStyles}</style>
//       {isLoggedIn && (
//         <Card variant="none" title={<Text strong className="no-print">TL: {team?.team_leader}</Text>} style={{ border: '1px solid #d9d9d9' }}>
//           <Row gutter={24}>
//             <Col span={8} className="no-print">
//               <Tabs activeKey={activeTab} onChange={setActiveTab} items={[{ key: "all", label: "All" }]} />
//               <Table dataSource={products} columns={[{ title: "Item Name", dataIndex: "item_name" }]} rowKey="id" onRow={(r) => ({ onClick: () => setSelectedProduct(r) })} pagination={false} size="small" scroll={{ y: "60vh" }} />
//             </Col>



//             <Col span={16} className="thermal-slip">
//               {selectedProduct ? (
//                 <div>
//                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
//                     <Title level={4} style={{ margin: 0 }}>{selectedProduct.item_name}</Title>
//                     <div className="no-print">
//                       <Button icon={<PrinterOutlined />} onClick={() => window.print()} style={{ marginRight: 8 }}>Print Slip</Button>
//                       <Button icon={<PlusOutlined />} onClick={() => setCountingUnits([...countingUnits, { tempId: Date.now(), batch_no: "", serial_no: "", quantity: null, isSystem: false }])}>Add Row</Button>
//                     </div>
//                   </div>

//                   {/* HIGHLIGHT: Rebalanced Column Spans for Width */}
//                   <Row gutter={8} style={{ marginBottom: 8, borderBottom: '2px solid #000', paddingBottom: 4, textAlign: 'center' }}>
//                     <Col span={8}><Text strong style={{ fontSize: 11 }}>BATCH/SERIAL</Text></Col>
//                     <Col span={5}><Text strong style={{ fontSize: 11 }}>EXPIRY</Text></Col>
//                     <Col span={4}><Text strong style={{ fontSize: 11 }}>QTY</Text></Col>
//                     <Col span={5}><Text strong style={{ fontSize: 11 }}>STATUS</Text></Col>
//                   </Row>

//                   {selectedProduct.systemUnits.filter(u => u.status === "submitted").map((u, i) => (
//                     <Row key={`hist-${i}`} gutter={8} style={{ marginBottom: 4, borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}>
//                       <Col span={8} style={{ textAlign: 'center' }}><Text style={{ fontSize: 13 }}>{u.count_batch_no || u.count_serial_no}</Text></Col>
//                       <Col span={5} style={{ textAlign: 'center' }}><Text style={{ fontSize: 12 }}>{u.count_expiry_date || 'N/A'}</Text></Col>
//                       <Col span={4} style={{ textAlign: 'center' }}><Text style={{ fontSize: 13 }}>{u.count_quantity}</Text></Col>
//                       <Col span={5} style={{ textAlign: 'center' }}><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(u.counted_at).format("DD/MM/YY HH:mm")}</Text></Col>
//                     </Row>
//                   ))}

//                   <Divider titlePlacement="left" plain><Text type="secondary" style={{ fontSize: 10 }}>NEW ENTRIES</Text></Divider>

//                   <Row gutter={5} style={{ marginBottom: 5, borderBottom: '1px solid #f0f0f0' }}>
//                     <Col span={10} style={{ textAlign: 'center' }}><Text strong style={{ fontSize: 12 }}>Batch/Serial</Text></Col>
//                     <Col span={8} style={{ textAlign: 'center' }}><Text strong style={{ fontSize: 12 }}>Expiry</Text></Col>
//                     <Col span={4} style={{ textAlign: 'center' }}><Text strong style={{ fontSize: 12 }}>Count</Text></Col>
//                     <Col span={2}></Col>
//                   </Row>

//                   {countingUnits.map(u => (
//                     <Row key={u.tempId} gutter={5} style={{ marginBottom: 10 }}>
//                       <Col span={10}>
//                         <AutoComplete
//                           style={{ width: '100%' }}
//                           options={getOptions(selectedProduct.tracking_type === "batch" ? "batch_no" : "serial_no", selectedProduct.tracking_type === "batch" ? u.batch_no : u.serial_no, u.tempId)}
//                           value={selectedProduct.tracking_type === "batch" ? u.batch_no : u.serial_no}
//                           onChange={(v) => updateField(u.tempId, selectedProduct.tracking_type === "batch" ? "batch_no" : "serial_no", v)}
//                           disabled={u.isSystem}
//                         >
//                           {/* Removed prefix entirely for a cleaner greyscale look */}
//                           <Input placeholder="Enter ID..." style={{ textAlign: 'left' }} />
//                         </AutoComplete>
//                       </Col>
//                       <Col span={8}><DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" suffixIcon={u.isSystem ? null : undefined} value={u.expiry_date ? dayjs(u.expiry_date) : null} onChange={(_, d) => updateField(u.tempId, "expiry_date", d)} disabled={u.isSystem} /></Col>
//                       <Col span={4}><InputNumber placeholder="" style={{ width: '100%' }} controls={false} value={u.quantity === 0 || u.quantity === null ? null : u.quantity} onChange={(v) => updateField(u.tempId, "quantity", v)} /></Col>
//                       <Col span={2}>{!u.isSystem && <Button danger type="text" icon={<DeleteOutlined />} onClick={() => setCountingUnits(countingUnits.filter(x => x.tempId !== u.tempId))} />}</Col>

//                     </Row>
//                   ))}

//                   {/* SIMPLE PRINT-READY SUMMARY GRID */}
//                   <div style={{
//                     marginTop: 20, padding: '12px'
//                   }}>
//                     <Row gutter={16} align="middle">
//                       <Col span={7} style={{ borderRight: '1px solid #d9d9d9', textAlign: 'center' }}>
//                         <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>HISTORY</Text>
//                         <Text strong style={{ fontSize: 16 }}>{totals.history}</Text>
//                       </Col>
//                       <Col span={7} style={{ borderRight: '1px solid #d9d9d9', paddingLeft: 20, textAlign: 'center' }}>
//                         <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>NEW</Text>
//                         <Text strong style={{ fontSize: 16 }}>{totals.pending}</Text>
//                       </Col>
//                       <Col span={7} style={{ paddingLeft: 20, textAlign: 'center' }}>
//                         <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>TOTAL</Text>
//                         <Text strong style={{ fontSize: 16, lineHeight: 1 }}>{totals.total}</Text>
//                       </Col>
//                     </Row>
//                   </div>
//                   <div className="no-print" style={{ marginTop: 15 }}>
//                     <Button type="primary" block size="large" icon={<SaveOutlined />} onClick={handleSubmit} loading={loading} style={{ marginTop: 15, height: 45, fontWeight: 'bold' }}>
//                       CONFIRM & SUBMIT
//                     </Button>
//                   </div>
//                 </div>
//               ) : (
//                 <div style={{ textAlign: 'center', padding: 100, border: '1px dashed #d9d9d9' }}>
//                   <Text type="secondary">Select an item to begin counting</Text>
//                 </div>
//               )}
//             </Col>
//           </Row>
//         </Card>
//       )}
//     </div>
//   );
// }





"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import {
  Card, Row, Col, Divider, message, Tabs, Typography,
  Table, Tag, InputNumber, DatePicker, Input, Button, AutoComplete
} from "antd";
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, PrinterOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Text, Title } = Typography;

const thermalStyles = `
@media print {
  body * { visibility: hidden; }
  .thermal-slip, .thermal-slip * { visibility: visible; }
  .thermal-slip {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm; 
    padding: 2mm;
    background: #fff;
  }
  .no-print { display: none !important; }
  
  .thermal-slip .ant-input, 
  .thermal-slip .ant-picker, 
  .thermal-slip .ant-input-number,
  .thermal-slip .ant-input-number-input-wrap,
  .thermal-slip .ant-select-selector {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    padding: 0 !important;
  }

  .thermal-slip .ant-input-number-handler-wrap {
    display: none !important;
  }

  .thermal-slip .ant-input-disabled,
  .thermal-slip .ant-picker-disabled,
  .thermal-slip .ant-input-number-disabled,
  .thermal-slip .ant-input-number-input {
    color: #000 !important;
    -webkit-text-fill-color: #000 !important;
    opacity: 1 !important;
  }

  @page { margin: 0; size: auto; }
}
`;

export default function YearEndPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [countingUnits, setCountingUnits] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    setMounted(true);
    if (window.location.hostname === "localhost") {
      setIsLoggedIn(true);
      setTeam({ id: 0, team_leader: "Developer Mode" });
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchInventory();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!selectedProduct) return;
    const pendingUnits = selectedProduct.systemUnits.filter(u => u.status !== "submitted");
    if (selectedProduct.tracking_type === "none") {
      setCountingUnits([{ tempId: "system-row", quantity: null, isSystem: true }]);
    } else {
      setCountingUnits(
        pendingUnits.map((unit, index) => ({
          tempId: `system-${index}`,
          id: unit.id,
          batch_no: unit.count_batch_no || unit.sys_batch_no || "",
          serial_no: unit.count_serial_no || unit.sys_serial_no || "",
          expiry_date: unit.count_expiry_date || unit.sys_expiry_date || null,
          quantity: null,
          isSystem: true
        }))
      );
    }
  }, [selectedProduct]);

  const totals = useMemo(() => {
    if (!selectedProduct) return { history: 0, pending: 0, total: 0 };
    const history = selectedProduct.systemUnits.filter(u => u.status === "submitted").reduce((s, u) => s + (Number(u.count_quantity) || 0), 0);
    const pending = countingUnits.reduce((s, u) => s + (Number(u.quantity) || 0), 0);
    return { history, pending, total: history + pending };
  }, [selectedProduct, countingUnits]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("cycle_items").select(`
        id, cycle_id, item_id, status, sys_batch_no, sys_serial_no, sys_expiry_date,
        count_batch_no, count_serial_no, count_expiry_date, count_quantity, counted_at,
        item_master (id, item_name, tracking_type, mrp, current_stock)
      `);
      if (error) throw error;
      const grouped = data.reduce((acc, curr) => {
        const itemId = curr.item_id;
        if (!acc[itemId]) acc[itemId] = { ...curr.item_master, cycle_id: curr.cycle_id, status: curr.status, systemUnits: [] };
        acc[itemId].systemUnits.push(curr);
        if (curr.status === "pending") acc[itemId].status = "pending";
        return acc;
      }, {});
      setProducts(Object.values(grouped));
    } catch (err) { message.error("Database Error"); }
    finally { setLoading(false); }
  };

  const updateField = (id, f, v) => setCountingUnits(prev => prev.map(u => u.tempId === id ? { ...u, [f]: v } : u));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const activeUnits = countingUnits.filter(u => u.quantity !== null);
      for (const unit of activeUnits) {
        const payload = {
          count_quantity: unit.quantity, 
          count_batch_no: unit.batch_no || null, 
          count_serial_no: unit.serial_no || null,
          count_expiry_date: unit.expiry_date ? dayjs(unit.expiry_date).format("YYYY-MM-DD") : null,
          status: "submitted", counted_at: new Date()
        };
        if (unit.isSystem) await supabase.from("cycle_items").update(payload).eq("id", unit.id);
        else await supabase.from("cycle_items").insert([{ ...payload, cycle_id: selectedProduct.cycle_id, item_id: selectedProduct.id }]);
      }
      message.success("Logs Saved");
      fetchInventory();
      setSelectedProduct(null);
    } catch (e) { message.error("Error Saving"); }
    finally { setLoading(false); }
  };

  // Restore Tabs logic
  const filteredItems = useMemo(() => {
    if (activeTab === "all") return products;
    return products.filter(p => p.status === activeTab);
  }, [products, activeTab]);

  return (
    <div style={{ padding: 20, background: "#fff", minHeight: "100vh" }}>
      <style>{thermalStyles}</style>
      {isLoggedIn && (
        <Card variant="none" title={<Text strong className="no-print">TL: {team?.team_leader}</Text>} style={{ border: '1px solid #d9d9d9' }}>
          <Row gutter={24}>
            <Col span={8} className="no-print">
              {/* RESTORED TABS */}
              <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab} 
                items={[
                  { key: "all", label: "All" },
                  { key: "pending", label: "Pending" },
                  { key: "submitted", label: "Submitted" }
                ]} 
              />
              <Table 
                dataSource={filteredItems} 
                columns={[{ title: "Item Name", dataIndex: "item_name" }]} 
                rowKey="id" 
                onRow={(r) => ({ onClick: () => setSelectedProduct(r) })} 
                pagination={false} 
                size="small" 
                scroll={{ y: "60vh" }} 
              />
            </Col>

            <Col span={16} className="thermal-slip">
              {selectedProduct ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0 }}>{selectedProduct.item_name}</Title>
                    <div className="no-print">
                      <Button icon={<PrinterOutlined />} onClick={() => window.print()} style={{ marginRight: 8 }}>Print Slip</Button>
                      <Button icon={<PlusOutlined />} onClick={() => setCountingUnits([...countingUnits, { tempId: Date.now(), batch_no: "", serial_no: "", quantity: null, isSystem: false }])}>Add Row</Button>
                    </div>
                  </div>

                  <Row gutter={8} style={{ marginBottom: 8, borderBottom: '2px solid #000', paddingBottom: 4, textAlign: 'center' }}>
                    <Col span={8}><Text strong style={{ fontSize: 11 }}>BATCH/SERIAL</Text></Col>
                    <Col span={5}><Text strong style={{ fontSize: 11 }}>EXPIRY</Text></Col>
                    <Col span={4}><Text strong style={{ fontSize: 11 }}>QTY</Text></Col>
                    <Col span={5}><Text strong style={{ fontSize: 11 }}>STATUS</Text></Col>
                  </Row>

                  {selectedProduct.systemUnits.filter(u => u.status === "submitted").map((u, i) => (
                    <Row key={`hist-${i}`} gutter={8} style={{ marginBottom: 4, borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}>
                      <Col span={8} style={{ textAlign: 'center' }}><Text style={{ fontSize: 13 }}>{u.count_batch_no || u.count_serial_no}</Text></Col>
                      <Col span={5} style={{ textAlign: 'center' }}>
                        <Text style={{ fontSize: 12 }}>
                          {u.count_expiry_date ? dayjs(u.count_expiry_date).format("DD-MM-YYYY") : 'N/A'}
                        </Text>
                      </Col>
                      <Col span={4} style={{ textAlign: 'center' }}><Text style={{ fontSize: 13 }}>{u.count_quantity}</Text></Col>
                      <Col span={5} style={{ textAlign: 'center' }}><Text type="secondary" style={{ fontSize: 11 }}>{dayjs(u.counted_at).format("DD/MM/YY HH:mm")}</Text></Col>
                    </Row>
                  ))}

                  <Divider titlePlacement="left" plain><Text type="secondary" style={{ fontSize: 10 }}>NEW ENTRIES</Text></Divider>

                  {/* HEADER FOR NEW ENTRIES */}
                  <Row gutter={5} style={{ marginBottom: 5, borderBottom: '1px solid #f0f0f0' }}>
                    <Col span={10}><Text strong style={{ fontSize: 10 }}>Batch/Serial</Text></Col>
                    <Col span={8}><Text strong style={{ fontSize: 10 }}>Expiry Date</Text></Col>
                    <Col span={4}><Text strong style={{ fontSize: 10 }}>Count Qty</Text></Col>
                    <Col span={2}></Col>
                  </Row>

                  {countingUnits.map(u => (
                    <Row key={u.tempId} gutter={5} style={{ marginBottom: 10 }}>
                      <Col span={10}>
                        <AutoComplete
                          style={{ width: '100%' }}
                          value={selectedProduct.tracking_type === "batch" ? u.batch_no : u.serial_no}
                          onChange={(v) => updateField(u.tempId, selectedProduct.tracking_type === "batch" ? "batch_no" : "serial_no", v)}
                          disabled={u.isSystem}
                        >
                          <Input placeholder="Enter ID..." style={{ textAlign: 'left' }} />
                        </AutoComplete>
                      </Col>
                      <Col span={8}>
                        <DatePicker 
                          style={{ width: '100%' }} 
                          format="DD-MM-YYYY" 
                          suffixIcon={u.isSystem ? null : undefined} 
                          value={u.expiry_date ? dayjs(u.expiry_date) : null} 
                          onChange={(_, d) => updateField(u.tempId, "expiry_date", d)} 
                          disabled={u.isSystem} 
                        />
                      </Col>
                      <Col span={4}>
                        <InputNumber 
                          placeholder="" 
                          style={{ width: '100%' }} 
                          controls={false} 
                          value={u.quantity === 0 || u.quantity === null ? null : u.quantity} 
                          onChange={(v) => updateField(u.tempId, "quantity", v)} 
                        />
                      </Col>
                      <Col span={2} className="no-print">
                        {!u.isSystem && <Button danger type="text" icon={<DeleteOutlined />} onClick={() => setCountingUnits(countingUnits.filter(x => x.tempId !== u.tempId))} />}
                      </Col>
                    </Row>
                  ))}

                  <div style={{ marginTop: 20, padding: '12px' }}>
                    <Row gutter={16} align="middle">
                      <Col span={7} style={{ borderRight: '1px solid #d9d9d9', textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>HISTORY</Text>
                        <Text strong style={{ fontSize: 16 }}>{totals.history}</Text>
                      </Col>
                      <Col span={7} style={{ borderRight: '1px solid #d9d9d9', paddingLeft: 20, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>NEW</Text>
                        <Text strong style={{ fontSize: 16 }}>{totals.pending}</Text>
                      </Col>
                      <Col span={7} style={{ paddingLeft: 20, textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>TOTAL</Text>
                        <Text strong style={{ fontSize: 16, lineHeight: 1 }}>{totals.total}</Text>
                      </Col>
                    </Row>
                  </div>
                  <div className="no-print" style={{ marginTop: 15 }}>
                    <Button type="primary" block size="large" icon={<SaveOutlined />} onClick={handleSubmit} loading={loading} style={{ height: 45, fontWeight: 'bold' }}>
                      CONFIRM & SUBMIT
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 100, border: '1px dashed #d9d9d9' }}>
                  <Text type="secondary">Select an item to begin counting</Text>
                </div>
              )}
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
}