"use client";

import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message, Typography, Card } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";

const { Title } = Typography;

const PurchaseApprovalPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchaseRequests();
  }, []);

  const fetchPurchaseRequests = async () => {
    setLoading(true);
    // Fetching from your specific "purchase_requests" table
    const { data, error } = await supabase
      .from("purchase_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      message.error("Failed to fetch purchase requests");
    } else {
      setRequests(data);
    }
    setLoading(false);
  };

  const updateRequestStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from("purchase_requests")
      .update({ status: newStatus })
      .eq("id", id); // Using the primary key 'id' to target the row

    if (!error) {
      message.success(`Request ${newStatus}`);
      fetchPurchaseRequests();
    } else {
      message.error("Update failed");
    }
  };

  const columns = [
    {
      title: "Sl No",
      key: "sl_no",
      width: 70,
      // Dynamic serial number based on table index
      render: (_, __, index) => index + 1,
    },
    { 
      title: "Item Name", 
      dataIndex: "item_name", 
      key: "item_name" 
    },
    { 
      title: "Quantity", 
      dataIndex: "quantity", 
      key: "quantity" 
    },
    { 
      title: "Rate", 
      dataIndex: "rate", 
      key: "rate",
      render: (rate) => `₹${rate || 0}` 
    },
    { 
      title: "Vendor Name", 
      dataIndex: "vendor_name", 
      key: "vendor_name" 
    },
    {
      title: "Priority Type",
      dataIndex: "priority_type",
      key: "priority_type",
      render: (priority) => {
        const colors = { High: "red", Medium: "orange", Low: "blue" };
        return <Tag color={colors[priority] || "default"}>{priority}</Tag>;
      }
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<CheckCircleOutlined />} 
            disabled={record.status === "Approved"}
            onClick={() => updateRequestStatus(record.id, "Approved")}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Approve
          </Button>
          <Button 
            danger 
            icon={<CloseCircleOutlined />} 
            disabled={record.status === "Rejected"}
            onClick={() => updateRequestStatus(record.id, "Rejected")}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Card>
        <Title level={2} style={{ marginBottom: 20 }}>Item Purchase Approval</Title>
        <Table 
          columns={columns} 
          dataSource={requests} 
          rowKey="id" 
          loading={loading} 
          bordered
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default PurchaseApprovalPage;




















// "use client";

// import React, { useEffect, useState } from "react";
// import { Table, Tag, Button, Space, message, Typography, Select, Card } from "antd";
// import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
// import { supabase } from "../../lib/supabase";

// const { Title } = Typography;
// const { Option } = Select;

// const PurchaseApprovalPage = () => {
//   const [requests, setRequests] = useState([]);
//   const [vendors, setVendors] = useState([]); // To store list of available vendors
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchPurchaseRequests();
//     fetchVendors();
//   }, []);

//   const fetchVendors = async () => {
//     const { data } = await supabase.from("vendors").select("id, vendor_name");
//     if (data) setVendors(data);
//   };

//   const fetchPurchaseRequests = async () => {
//     setLoading(true);
//     // Fetching from purchase_requests and joining with vendors table
//     const { data, error } = await supabase
//       .from("purchase_requests")
//       .select(`*, vendors(id, vendor_name)`)
//       .order("id", { ascending: true });

//     if (!error) setRequests(data);
//     setLoading(false);
//   };

//   const handleUpdate = async (id, updates) => {
//     const { error } = await supabase
//       .from("purchase_requests")
//       .update(updates)
//       .eq("id", id);

//     if (!error) {
//       message.success("Record updated");
//       fetchPurchaseRequests();
//     } else {
//       message.error("Update failed");
//     }
//   };

//   const columns = [
//     {
//       title: "Sl No",
//       key: "sl_no",
//       width: 60,
//       render: (_, __, index) => index + 1,
//     },
//     { title: "Item Name", dataIndex: "item_name", key: "item_name" },
//     { title: "Qty", dataIndex: "quantity", key: "quantity" },
//     { 
//       title: "Rate", 
//       dataIndex: "rate", 
//       render: (rate) => `₹${rate || 0}` 
//     },
//     { 
//       title: "Vendor (Assign ID)", 
//       key: "vendor_id",
//       render: (_, record) => (
//         <Select
//           placeholder="Select Vendor"
//           style={{ width: 180 }}
//           defaultValue={record.vendor_id}
//           onChange={(value) => handleUpdate(record.id, { vendor_id: value })}
//         >
//           {vendors.map(v => (
//             <Option key={v.id} value={v.id}>{v.vendor_name} (ID: {v.id})</Option>
//           ))}
//         </Select>
//       )
//     },
//     {
//       title: "Priority",
//       dataIndex: "priority_type",
//       render: (priority) => {
//         const color = priority === "High" ? "red" : "orange";
//         return <Tag color={color}>{priority}</Tag>;
//       }
//     },
//     {
//       title: "Action",
//       key: "action",
//       render: (_, record) => (
//         <Space size="middle">
//           <Button 
//             type="primary" 
//             icon={<CheckCircleOutlined />} 
//             onClick={() => handleUpdate(record.id, { status: "Approved" })}
//             style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
//             disabled={!record.vendor_id || record.status === "Approved"}
//           >
//             Approve
//           </Button>
//           <Button 
//             danger 
//             icon={<CloseCircleOutlined />} 
//             onClick={() => handleUpdate(record.id, { status: "Rejected" })}
//             disabled={record.status === "Rejected"}
//           >
//             Reject
//           </Button>
//         </Space>
//       ),
//     },
//   ];

//   return (
//     <div style={{ padding: "24px" }}>
//       <Card>
//         <Title level={2}>Purchase Item Approval</Title>
//         <Table 
//           columns={columns} 
//           dataSource={requests} 
//           rowKey="id" 
//           loading={loading} 
//           bordered
//         />
//       </Card>
//     </div>
//   );
// };

// export default PurchaseApprovalPage;