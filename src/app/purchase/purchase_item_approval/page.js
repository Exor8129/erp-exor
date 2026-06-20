





// "use client";

// import React, { useEffect, useState } from "react";
// import { Table, Tag, Button, Space, message, Typography, Select, Card } from "antd";
// import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined } from "@ant-design/icons";
// import { supabase } from "../../lib/supabase";
// import { useRouter } from "next/navigation";

// const { Title } = Typography;
// const { Option } = Select;


// const PurchaseApprovalPage = () => {
//     const [requests, setRequests] = useState([]);
//     const [vendors, setVendors] = useState([]); // To store list of available vendors
//     const [loading, setLoading] = useState(true);
//     const router = useRouter();

//     useEffect(() => {
//         fetchPurchaseRequests();
//         fetchVendors();
//     }, []);

//     const fetchVendors = async () => {
//         const { data } = await supabase.from("vendors").select("id, name");
//         if (data) setVendors(data);
        
//     };

//     const fetchPurchaseRequests = async () => {
//         setLoading(true);
//         // Fetching from purchase_requests and joining with vendors table
//         const { data, error } = await supabase
//             .from("purchase_requests")
//             .select(`*, vendors(id, name)`)
//             .order("id", { ascending: true });

//         if (!error) setRequests(data);
//         setLoading(false);
//     };

//     const handleUpdate = async (id, updates) => {
//         const { error } = await supabase
//             .from("purchase_requests")
//             .update(updates)
//             .eq("id", id);

//         if (!error) {
//             message.success("Record updated");
//             fetchPurchaseRequests();
//         } else {
//             message.error("Update failed");
//         }
//     };

//     const columns = [
//         {
//             title: "Sl No",
//             key: "sl_no",
//             width: 60,
//             render: (_, __, index) => index + 1,
//         },
//         { title: "Item Name", dataIndex: "item_name", key: "item_name" },
//         { title: "Qty", dataIndex: "quantity", key: "quantity" },
//         {
//             title: "Rate",
//             dataIndex: "rate",
//             render: (rate) => `₹${rate || 0}`
//         },
//         // { 
//         //   title: "Vendor (Assign ID)", 
//         //   key: "vendor_id",
//         // //   render: (_, record) => (
//         // //     <Select
//         // //       placeholder="Select Vendor"
//         // //       style={{ width: 180 }}
//         // //       defaultValue={record.vendor_id}
//         // //     //   onChange={(value) => handleUpdate(record.id, { vendor_id: value })}
//         // //     >
//         // //       {vendors.map(v => (
//         // //         <Option key={v.id} value={v.id}>{v.vendor_name} (ID: {v.id})</Option>
//         // //       ))}
//         // //     </Select>
//         // //   )
//         // dataIndex: "vendors.name",
//         // },



//         {
//             title: "Vendor",
//             key: "vendor_display", // Changed key to avoid conflict
//             render: (_, record) => (
//                 // Access the joined 'vendors' object and the 'name' property
//                 record.vendors ? record.vendors.name : "-"
//             )
//         },


//         {
//             title: "Priority",
//             dataIndex: "priority_type",
//             render: (priority) => {
//                 const color = priority === "High" ? "red" : "orange";
//                 return <Tag color={color}>{priority}</Tag>;
//             }
//         },
//         {
//             title: "Action",
//             key: "action",
//             render: (_, record) => (
//                 <Space size="middle">
//                     <Button
//                         icon={<EditOutlined />}
//                         onClick={() => {
                             
//                                 router.push(`/purchase/purchase_request?id=${record.reference}`);
                            
  
//                         }}
//                     >
                        
//                     </Button>
//                     <Button
//                         type="primary"
//                         icon={<CheckCircleOutlined />}
//                         onClick={() => handleUpdate(record.id, { status: "Approved" })}
//                         style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
//                         disabled={!record.vendor_id || record.status === "Approved"}
//                     >
                    
//                     </Button>
//                     <Button
//                         danger
//                         icon={<CloseCircleOutlined />}
//                         onClick={() => handleUpdate(record.id, { status: "Rejected" })}
//                         disabled={record.status === "Rejected"}
//                     >
                        
//                     </Button>
//                 </Space>
//             ),
//         },
//     ];

//     return (
//         <div style={{ padding: "24px" }}>
//             <Card>
//                 <Title level={2}>Purchase Item Approval</Title>
//                 <Table
//                     columns={columns}
//                     dataSource={requests}
//                     rowKey="id"
//                     loading={loading}
//                     bordered
//                 />
//             </Card>
//         </div>
//     );
// };

// export default PurchaseApprovalPage;












"use client";

import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message, Typography, Select, Card, Tabs } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined } from "@ant-design/icons";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

const { Title } = Typography;

const PurchaseApprovalPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("pending"); // Tab state
    const router = useRouter();

    useEffect(() => {
        fetchPurchaseRequests();
    }, []);

    const fetchPurchaseRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("purchase_requests")
            .select(`*, vendors(id, name)`)
            .order("id", { ascending: true });

        if (!error) setRequests(data);
        setLoading(false);
    };

    const handleUpdate = async (id, updates) => {
        const { error } = await supabase
            .from("purchase_requests")
            .update(updates)
            .eq("id", id);

        if (!error) {
            message.success(`Record marked as ${updates.status}`);
            fetchPurchaseRequests();
        } else {
            message.error("Update failed");
        }
    };

    // --- FILTER LOGIC ---
    const filteredData = requests.filter((item) => {
        if (activeTab === "pending") {
            // Pending: Anything not Approved or Rejected
            return item.status !== "Approved" && item.status !== "Rejected";
        } else {
            // Completed: Approved or Rejected
            return item.status === "Approved" || item.status === "Rejected";
        }
    });

    const columns = [
        {
            title: "Sl No",
            key: "sl_no",
            width: 60,
            render: (_, __, index) => index + 1,
        },
        { title: "Item Name", dataIndex: "item_name", key: "item_name" },
        { title: "Qty", dataIndex: "quantity", key: "quantity" },
        {
            title: "Rate",
            dataIndex: "rate",
            render: (rate) => `₹${rate || 0}`
        },
        {
            title: "Vendor",
            key: "vendor_display",
            render: (_, record) => record.vendors ? record.vendors.name : "-"
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => {
                let color = "blue";
                if (status === "Approved") color = "green";
                if (status === "Rejected") color = "volcano";
                return <Tag color={color}>{status || "Pending"}</Tag>;
            }
        },
        {
            title: "Action",
            key: "action",
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => router.push(`/purchase/purchase_request?id=${record.reference}`)}
                        disabled={record.status === "Approved" || record.status === "Rejected"}
                    />
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleUpdate(record.id, { status: "Approved" })}
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        disabled={!record.vendor_id || record.status === "Approved" || record.status === "Rejected"}
                    />
                    <Button
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() => handleUpdate(record.id, { status: "Rejected" })}
                        disabled={record.status === "Rejected" || record.status === "Approved"}
                    />
                </Space>
            ),
        },
    ];

    const tabItems = [
        { key: "pending", label: `Pending (${requests.filter(i => i.status !== "Approved" && i.status !== "Rejected").length})` },
        { key: "completed", label: `Completed ` },
    ];

    return (
        <div style={{ padding: "24px" }}>
            <Card>
                <Title level={2}>Purchase Item Approval</Title>
                
                <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab} 
                    items={tabItems} 
                    style={{ marginBottom: 16 }}
                />

                <Table
                    columns={columns}
                    dataSource={filteredData} // Use filtered data
                    rowKey="id"
                    loading={loading}
                    bordered
                />
            </Card>
        </div>
    );
};

export default PurchaseApprovalPage;