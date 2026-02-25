// "use client";

// import React, { useEffect, useState } from "react";
// import { Table, Button, Checkbox, Collapse, Card, Typography, message, Space } from "antd";
// import { ShoppingCartOutlined, ShopOutlined } from "@ant-design/icons";
// import { supabase } from "../../lib/supabase";

// const { Panel } = Collapse;
// const { Title, Text } = Typography;

// const VendorPool = () => {
//   const [vendorData, setVendorData] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [selectedItems, setSelectedItems] = useState([]); // Stores IDs of items to be in PO

//   useEffect(() => {
//     fetchApprovedItems();
//   }, []);

//   const fetchApprovedItems = async () => {
//     setLoading(true);
//     // Fetch only items that were approved in the previous step
//     const { data, error } = await supabase
//       .from("purchase_requests")
//       .select("*")
//       .eq("status", "Approved");

//     if (!error) {
//       // Grouping logic: Create an object where keys are vendor names
//       const grouped = data.reduce((acc, item) => {
//         if (!acc[item.vendor_name]) acc[item.vendor_name] = [];
//         acc[item.vendor_name].push(item);
//         return acc;
//       }, {});
//       setVendorData(grouped);
//     }
//     setLoading(false);
//   };

//   const handleCreatePO = async (vendorName) => {
//     const itemsToProcess = selectedItems.filter(id => 
//       vendorData[vendorName].some(item => item.id === id)
//     );

//     if (itemsToProcess.length === 0) {
//       return message.warning("Please select at least one item to create a PO");
//     }

//     // Logic to update status to 'PO Issued'
//     const { error } = await supabase
//       .from("purchase_requests")
//       .update({ status: "PO Issued" })
//       .in("id", itemsToProcess);

//     if (!error) {
//       message.success(`PO Created for ${vendorName} with ${itemsToProcess.length} items`);
//       setSelectedItems(selectedItems.filter(id => !itemsToProcess.includes(id)));
//       fetchApprovedItems();
//     }
//   };

//   const columns = [
//     {
//       title: "Select",
//       key: "selection",
//       width: 50,
//       render: (_, record) => (
//         <Checkbox 
//           checked={selectedItems.includes(record.id)}
//           onChange={(e) => {
//             if (e.target.checked) setSelectedItems([...selectedItems, record.id]);
//             else setSelectedItems(selectedItems.filter(id => id !== record.id));
//           }}
//         />
//       )
//     },
//     { title: "Item Name", dataIndex: "item_name", key: "item_name" },
//     { title: "Qty", dataIndex: "quantity", key: "quantity" },
//     { title: "Rate", dataIndex: "rate", key: "rate", render: (r) => `₹${r}` },
//     { 
//       title: "Total", 
//       key: "total", 
//       render: (_, record) => `₹${record.quantity * record.rate}` 
//     }
//   ];

//   return (
//     <div style={{ padding: 24 }}>
//       <Title level={2}><ShopOutlined /> Vendor Pool</Title>
//       <Text type="secondary">Select approved items to generate Purchase Orders</Text>
      
//       <Collapse accordion style={{ marginTop: 20 }}>
//         {Object.keys(vendorData).map((vendor) => (
//           <Panel 
//             header={<Text strong>{vendor} ({vendorData[vendor].length} Items Pending)</Text>} 
//             key={vendor}
//           >
//             <Table 
//               dataSource={vendorData[vendor]} 
//               columns={columns} 
//               rowKey="id" 
//               pagination={false} 
//               footer={() => (
//                 <div style={{ textAlign: 'right' }}>
//                   <Button 
//                     type="primary" 
//                     icon={<ShoppingCartOutlined />}
//                     onClick={() => handleCreatePO(vendor)}
//                   >
//                     Generate PO for Selected
//                   </Button>
//                 </div>
//               )}
//             />
//           </Panel>
//         ))}
//       </Collapse>
      
//       {Object.keys(vendorData).length === 0 && !loading && (
//         <Card style={{ textAlign: 'center', marginTop: 20 }}>
//           <Text>No approved items waiting in the pool.</Text>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default VendorPool;






















// "use client";

// import React, { useEffect, useState } from "react";
// import { Table, Button, Checkbox, Collapse, Card, Typography, message } from "antd";
// import { ShoppingCartOutlined, ShopOutlined } from "@ant-design/icons";
// import { supabase } from "../../lib/supabase";

// const { Title, Text } = Typography;

// const VendorPool = () => {
//   const [vendorData, setVendorData] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [selectedItems, setSelectedItems] = useState([]);

//   useEffect(() => {
//     fetchApprovedItems();
//   }, []);

//   const fetchApprovedItems = async () => {
//     setLoading(true);
//     const { data, error } = await supabase
//       .from("purchase_requests")
//       .select("*")
//       .eq("status", "Approved");

//     if (!error) {
//       const grouped = data.reduce((acc, item) => {
//         if (!acc[item.vendor_name]) acc[item.vendor_name] = [];
//         acc[item.vendor_name].push(item);
//         return acc;
//       }, {});
//       setVendorData(grouped);
//     }
//     setLoading(false);
//   };

//   const handleCreatePO = async (vendorName) => {
//     const itemsToProcess = selectedItems.filter(id => 
//       vendorData[vendorName].some(item => item.id === id)
//     );

//     if (itemsToProcess.length === 0) {
//       return message.warning("Please select at least one item to create a PO");
//     }

//     const { error } = await supabase
//       .from("purchase_requests")
//       .update({ status: "PO Issued" })
//       .in("id", itemsToProcess);

//     if (!error) {
//       message.success(`PO Created for ${vendorName}`);
//       setSelectedItems(selectedItems.filter(id => !itemsToProcess.includes(id)));
//       fetchApprovedItems();
//     }
//   };

//   const columns = [
//     {
//       title: "Select",
//       key: "selection",
//       width: 50,
//       render: (_, record) => (
//         <Checkbox 
//           checked={selectedItems.includes(record.id)}
//           onChange={(e) => {
//             if (e.target.checked) setSelectedItems([...selectedItems, record.id]);
//             else setSelectedItems(selectedItems.filter(id => id !== record.id));
//           }}
//         />
//       )
//     },
//     { title: "Item Name", dataIndex: "item_name", key: "item_name" },
//     { title: "Qty", dataIndex: "quantity", key: "quantity" },
//     { title: "Rate", dataIndex: "rate", key: "rate", render: (r) => `₹${r}` },
//     { 
//       title: "Total", 
//       key: "total", 
//       render: (_, record) => `₹${record.quantity * (record.rate || 0)}` 
//     }
//   ];

//   // --- NEW LOGIC: Prepare items for the Collapse component ---
//   const collapseItems = Object.keys(vendorData).map((vendor) => ({
//     key: vendor,
//     label: <Text strong>{vendor} ({vendorData[vendor].length} Items Pending)</Text>,
//     children: (
//       <Table 
//         dataSource={vendorData[vendor]} 
//         columns={columns} 
//         rowKey="id" 
//         pagination={false} 
//         footer={() => (
//           <div style={{ textAlign: 'right' }}>
//             <Button 
//               type="primary" 
//               icon={<ShoppingCartOutlined />}
//               onClick={() => handleCreatePO(vendor)}
//             >
//               Generate PO for Selected
//             </Button>
//           </div>
//         )}
//       />
//     ),
//   }));

//   return (
//     <div style={{ padding: 24 }}>
//       <Title level={2}><ShopOutlined /> Vendor Pool</Title>
//       <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
//         Select approved items to generate Purchase Orders
//       </Text>
      
//       {/* Fixed: Using the 'items' prop instead of children */}
//       <Collapse 
//         accordion 
//         items={collapseItems} 
//         defaultActiveKey={Object.keys(vendorData)[0]}
//       />
      
//       {Object.keys(vendorData).length === 0 && !loading && (
//         <Card style={{ textAlign: 'center', marginTop: 20 }}>
//           <Text>No approved items waiting in the pool.</Text>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default VendorPool;








"use client";

import React, { useEffect, useState } from "react";
import { Table, Button, Checkbox, Collapse, Card, Typography, message } from "antd";
import { ShoppingCartOutlined, ShopOutlined, DownloadOutlined } from "@ant-design/icons";
import { supabase } from "../../lib/supabase";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const { Title, Text } = Typography;

const VendorPool = () => {
  const [vendorData, setVendorData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchApprovedItems();
  }, []);

  const fetchApprovedItems = async () => {
    setLoading(true);
    // Join with vendors table to get both ID and Name
    const { data, error } = await supabase
      .from("purchase_requests")
      .select(`*, vendors(id, vendor_name)`) 
      .eq("status", "Approved");

    if (!error) {
      // Group by Vendor ID but keep Name for the UI
      const grouped = data.reduce((acc, item) => {
        const vId = item.vendors?.id;
        const vName = item.vendors?.vendor_name || "Unknown Vendor";
        
        if (!acc[vId]) {
          acc[vId] = { name: vName, items: [] };
        }
        acc[vId].items.push(item);
        return acc;
      }, {});
      setVendorData(grouped);
    }
    setLoading(false);
  };

  const generatePDF = (poNumber, vendorName, items, total) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("PURCHASE ORDER", 105, 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`PO Number: ${poNumber}`, 14, 25);
    doc.text(`Vendor: ${vendorName}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 35);

    const tableRows = items.map((item, index) => [
      index + 1,
      item.item_name,
      item.quantity,
      `Rs. ${item.rate}`,
      `Rs. ${item.quantity * item.rate}`
    ]);

    doc.autoTable({
      startY: 40,
      head: [["Sl No", "Item Name", "Qty", "Rate", "Total"]],
      body: tableRows,
    });

    doc.text(`Grand Total: Rs. ${total}`, 14, doc.lastAutoTable.finalY + 10);
    doc.save(`${poNumber}.pdf`);
  };

  const handleCreatePO = async (vId, vName) => {
    const itemsToProcess = vendorData[vId].items.filter(item => 
      selectedItems.includes(item.id)
    );

    if (itemsToProcess.length === 0) return message.warning("Select items first");

    const total = itemsToProcess.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const poNumber = `PO-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Insert into purchase_order table using vendor_id
      const { error: poError } = await supabase
        .from("purchase_order")
        .insert([{
          po_number: poNumber,
          vendor_id: vId,
          total_amount: total,
          status: "Issued",
          expected_delivery: null // Can be updated later
        }]);

      if (poError) throw poError;

      // 2. Update purchase_requests status
      await supabase
        .from("purchase_requests")
        .update({ status: "PO Issued" })
        .in("id", itemsToProcess.map(i => i.id));

      message.success(`PO ${poNumber} Generated`);
      generatePDF(poNumber, vName, itemsToProcess, total);
      
      // Clear selection and refresh
      setSelectedItems(selectedItems.filter(id => !itemsToProcess.map(i => i.id).includes(id)));
      fetchApprovedItems();
    } catch (err) {
      message.error("Error creating PO");
    }
  };

  const columns = [
    {
      title: "Select",
      key: "selection",
      render: (_, record) => (
        <Checkbox 
          checked={selectedItems.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) setSelectedItems([...selectedItems, record.id]);
            else setSelectedItems(selectedItems.filter(id => id !== record.id));
          }}
        />
      )
    },
    { title: "Item", dataIndex: "item_name" },
    { title: "Qty", dataIndex: "quantity" },
    { title: "Rate", dataIndex: "rate", render: (r) => `Rs. ${r}` },
    { title: "Total", render: (_, r) => `Rs. ${r.quantity * r.rate}` }
  ];

  const collapseItems = Object.keys(vendorData).map((vId) => ({
    key: vId,
    label: <Text strong>{vendorData[vId].name} ({vendorData[vId].items.length} Items)</Text>,
    children: (
      <Table 
        dataSource={vendorData[vId].items} 
        columns={columns} 
        rowKey="id" 
        pagination={false} 
        footer={() => (
          <div style={{ textAlign: 'right' }}>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              onClick={() => handleCreatePO(vId, vendorData[vId].name)}
            >
              Generate PO
            </Button>
          </div>
        )}
      />
    ),
  }));

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}><ShopOutlined /> Vendor Pool</Title>
      <Collapse accordion items={collapseItems} />
    </div>
  );
};

export default VendorPool;










