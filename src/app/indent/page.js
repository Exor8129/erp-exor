

// "use client";

// import React, { useEffect, useState } from "react";
// import { Table, Tag, Spin, Button, Modal, Form, Input, DatePicker, InputNumber, message, Select, Upload, Tabs, } from "antd";
// import { PlusOutlined, SearchOutlined, UploadOutlined, FilterOutlined, } from "@ant-design/icons";
// import { supabase } from "../lib/supabase";
// import dayjs from "dayjs";
// import { useRouter } from "next/navigation";

// const { Option } = Select;

// const InventoryTable = () => {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [dropdownOpen, setDropdownOpen] = useState(false);
//   const [searchText, setSearchText] = useState("");
//   const [selectedDept, setSelectedDept] = useState("All"); // Department filter state
//   const [activeTab, setActiveTab] = useState("All"); // Status tab state
//   const [itemsMaster, setItemsMaster] = useState([]);
//   const [departments, setDepartments] = useState([]);
//   const [fileList, setFileList] = useState([]);
//   const [form] = Form.useForm();

//   const itemNameValue = Form.useWatch("item_name", form);
//   const router = useRouter();

//   useEffect(() => {
//     fetchIndentData();
//     fetchDropdownData();
//   }, []);




//   const fetchDropdownData = async () => {
//     const { data: items } = await supabase
//       .from("item_master")
//       .select("item_name");
//     const { data: depts } = await supabase
//       .from("department")
//       .select("department_name");
//     if (items) setItemsMaster(items);
//     if (depts) setDepartments(depts);
//   };

//   const fetchIndentData = async () => {
//     setLoading(true);
//     const { data, error } = await supabase
//       .from("indent")
//       .select("*")
//       .order("id", { ascending: true });
//     if (!error) setData(data);
//     setLoading(false);
//   };


//   // Ensure this is only declared ONCE at the top of your component

//   const [isModalVisible, setIsModalVisible] = useState(false);

//   const handleAddIndent = async (values) => {
//     try {
//       // FIX: Extract clean string if the form returns an array
//       const itemNameString = Array.isArray(values.item_name)
//         ? values.item_name[0]
//         : values.item_name;

//       // 1. Fetch the 'id' from item_master
//       const { data: itemMasterRecord, error: fetchError } = await supabase
//         .from("item_master")
//         .select("id")
//         .eq("item_name", itemNameString)
//         .single();

//       // Use fetchError specifically to avoid ReferenceError
//       if (fetchError || !itemMasterRecord) {
//         console.error("Fetch Error:", fetchError);
//         return message.error("Selected item not found in Item Master.");
//       }

//       // 2. Insert into the indent table
//       const { error: insertError } = await supabase.from("indent").insert([
//         {
//           item_id: itemMasterRecord.id,
//           item_name: itemNameString, // This will now be saved without brackets
//           quantity: values.quantity,
//           required_date: values.required_date?.format('YYYY-MM-DD'),
//           purpose: values.purpose,
//           department: values.department,
//           status: "Indent Request",
//         },
//       ]);

//       // Check insertError specifically
//       if (insertError) {
//         console.error("Insert Error:", insertError);
//         message.error("Failed to create indent: " + insertError.message);
//       } else {
//         message.success("Indent Request created successfully!");

//         // 1. Close the modal first to provide immediate feedback
//         setIsModalOpen(false);

//         // 2. Clear form fields so they are ready for the next entry
//         form.resetFields();
//         setFileList([]); // Clear any uploaded images

//         // 3. Trigger the data fetch to sync with Supabase
//         await fetchIndentData();

//         // 4. Optional: Clear filters to ensure the new record is visible
//         setSearchText("");
//         setActiveTab("All");
//       }
//     } catch (err) {
//       console.error("Unexpected Error:", err);
//       message.error("An unexpected error occurred.");
//     }
//   };

//   // --- FILTER LOGIC ---
//   const filteredData = data.filter((item) => {
//     const matchesStatus = activeTab === "All" || item.status === activeTab;
//     const matchesDept =
//       selectedDept === "All" || item.department === selectedDept;
//     const matchesSearch = item.item_name
//       ?.toLowerCase()
//       .includes(searchText.toLowerCase());
//     return matchesStatus && matchesDept && matchesSearch;
//   });

//   const columns = [
//     {
//       title: "Sl No",
//       key: "index",
//       width: 70,
//       // (text, record, index) => index + 1 gives a continuous sequence
//       render: (text, record, index) => index + 1,
//     },
//     { title: "Item Name", dataIndex: "item_name", key: "item_name" },
//     { title: "Quantity", dataIndex: "quantity", key: "quantity" },
//     { title: "Purpose", dataIndex: "purpose", key: "purpose" },
//     {
//       title: "Required Date",
//       dataIndex: "required_date",
//       key: "required_date",
//       render: (date) => (date ? dayjs(date).format("DD MMM YYYY") : "-"),
//     },
//     {
//       title: "Department",
//       dataIndex: "department",
//       key: "department",
//       render: (dept) => <Tag color="cyan">{dept}</Tag>,
//     },
//     {
//       title: "Status",
//       dataIndex: "status",
//       key: "status",
//       render: (status) => {
//         let color = "blue";
//         if (status === "Purchase Requested") color = "magenta";
//         if (status === "Purchase Approved") color = "orange";
//         if (status === "PO Issued") color = "green";
//         return <Tag color={color}>{status || "Indent Request"}</Tag>;
//       },
//     },
//   ];

//   const tabItems = [
//     { key: "All", label: "All" },
//     { key: "Indent Request", label: "Indent Request" },
//     { key: "Purchase Requested", label: "Purchase Requested" },
//     { key: "Purchase Approved", label: "Purchase Approved" },
//     { key: "PO Issued", label: "PO Issued" },
//   ];

//   return (
//     <div style={{ padding: 20 }}>
//       {/* Header Controls */}
//       <div
//         style={{
//           marginBottom: 16,
//           display: "flex",
//           gap: "10px",
//           flexWrap: "wrap",
//           justifyContent: "space-between",
//         }}
//       >
//         <div style={{ display: "flex", gap: "10px" }}>
//           <Input
//             placeholder="Search item name..."
//             prefix={<SearchOutlined />}
//             style={{ width: 250 }}
//             allowClear
//             onChange={(e) => setSearchText(e.target.value)}
//           />

//           <Select
//             placeholder="Filter by Department"
//             style={{ width: 200 }}
//             defaultValue="All"
//             suffixIcon={<FilterOutlined />}
//             onChange={(value) => setSelectedDept(value)}
//           >
//             <Option value="All">All Departments</Option>
//             {departments.map((dept, index) => (
//               <Option key={index} value={dept.department_name}>
//                 {dept.department_name}
//               </Option>
//             ))}
//           </Select>
//         </div>

//         <Button
//           type="primary"
//           icon={<PlusOutlined />}
//           onClick={() => setIsModalOpen(true)}
//         >
//           Add New Indent
//         </Button>
//       </div>

//       {/* Status Tabs */}
//       <Tabs
//         activeKey={activeTab}
//         onChange={setActiveTab}
//         items={tabItems}
//         style={{ marginBottom: 10 }}
//       />

//       <Table
//         dataSource={filteredData}
//         columns={columns}
//         rowKey="id"
//         bordered
//         loading={loading}
//         pagination={{ pageSize: 10 }}
//         onRow={(record) => ({
//           onClick: () => {
//             if (record.status === "Indent Request") {
//               router.push(`/purchase/purchase_request?id=${record.id}`);
//             }
//           },
//           style: {
//             cursor: record.status === "Indent Request" ? "pointer" : "default",
//           },
//         })}
//       />

//       {/* Modal remains the same as your provided code */}
//       <Modal
//         title="Add New Indent"
//         open={isModalOpen}
//         onCancel={() => setIsModalOpen(false)}
//         footer={null}
//       >
//         <Form layout="vertical" form={form} onFinish={handleAddIndent}>
//           <Form.Item
//             label="Item Name"
//             name="item_name"
//             rules={[{ required: true }]}
//           >
//             <Select
//               showSearch
//               mode="tags"
//               maxCount={1}
//               open={dropdownOpen}
//               onOpenChange={(open) => setDropdownOpen(open)}
//               onSelect={() => setDropdownOpen(false)}
//               onInputKeyDown={(e) => {
//                 if (e.key === "Enter") setDropdownOpen(false);
//               }}
//               placeholder="Select or type new item"
//             >
//               {itemsMaster.map((item, index) => (
//                 <Option key={index} value={item.item_name}>
//                   {item.item_name}
//                 </Option>
//               ))}
//             </Select>
//           </Form.Item>

//           {/* Check if itemNameValue exists AND if it is NOT found in the itemsMaster list.
//             We use .some() to check if any item_name in our master list matches the current input.*/}


//           {(() => {
//             const itemNameString = Array.isArray(itemNameValue) ? itemNameValue[0] : itemNameValue;
//             const isNotEmpty = itemNameString && itemNameString.trim().length > 0;
//             const isNewItem = !itemsMaster.some(item => item.item_name === itemNameString);

//             if (isNotEmpty && isNewItem) {
//               return (
//                 <Form.Item
//                   label="New Item Image"
//                   name="image"
//                   extra="This item is not in the master list. Please upload an image."
//                   valuePropName="fileList"
//                   getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
//                 >
//                   <Upload
//                     listType="picture"
//                     maxCount={1}
//                     beforeUpload={() => false}
//                     fileList={fileList}
//                     onChange={({ fileList }) => setFileList(fileList)}
//                   >
//                     <Button icon={<UploadOutlined />} block>
//                       Upload Image
//                     </Button>
//                   </Upload>
//                 </Form.Item>
//               );
//             }
//             return null;
//           })()}

//           <Form.Item
//             label="Quantity"
//             name="quantity"
//             rules={[{ required: true }]}
//           >
//             <InputNumber style={{ width: "100%" }} min={1} />
//           </Form.Item>

//           <Form.Item label="Required Date" name="required_date">
//             <DatePicker style={{ width: "100%" }} />
//           </Form.Item>

//           <Form.Item label="Purpose" name="purpose">
//             <Input />
//           </Form.Item>

//           <Form.Item
//             label="Department"
//             name="department"
//             rules={[{ required: true }]}
//           >
//             <Select placeholder="Select department">
//               {departments.map((dept, index) => (
//                 <Option key={index} value={dept.department_name}>
//                   {dept.department_name}
//                 </Option>
//               ))}
//             </Select>
//           </Form.Item>

//           <Button type="primary" htmlType="submit" block>
//             Submit
//           </Button>
//         </Form>
//       </Modal>
//     </div>
//   );
// };

// export default InventoryTable;













// "use client";

// import React, { useEffect, useState } from "react";
// import { Table, Tag, Button, Modal, Form, Input, DatePicker, InputNumber, message, Select, Upload, Tabs } from "antd";
// import { PlusOutlined, SearchOutlined, UploadOutlined, FilterOutlined } from "@ant-design/icons";
// import { supabase } from "../lib/supabase";
// import dayjs from "dayjs";
// import { useRouter } from "next/navigation";

// const { Option } = Select;

// const InventoryTable = () => {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [dropdownOpen, setDropdownOpen] = useState(false);
//   const [searchText, setSearchText] = useState("");
//   const [selectedDept, setSelectedDept] = useState("All");
//   const [activeTab, setActiveTab] = useState("All");
//   const [itemsMaster, setItemsMaster] = useState([]);
//   const [departments, setDepartments] = useState([]);
//   const [fileList, setFileList] = useState([]);
//   const [form] = Form.useForm();

//   // Updated: Set to 10 rows per page
//   const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

//   const itemNameValue = Form.useWatch("item_name", form);
//   const router = useRouter();

//   useEffect(() => {
//     fetchIndentData();
//     fetchDropdownData();
    
//     // Lock the background page from scrolling
//     document.body.style.overflow = "hidden";
//     return () => { document.body.style.overflow = "auto"; };
//   }, []);

//   const fetchDropdownData = async () => {
//     const { data: items } = await supabase.from("item_master").select("item_name");
//     const { data: depts } = await supabase.from("department").select("department_name");
//     if (items) setItemsMaster(items);
//     if (depts) setDepartments(depts);
//   };

//   const fetchIndentData = async () => {
//     setLoading(true);
//     const { data, error } = await supabase
//       .from("indent")
//       .select("*")
//       .order("id", { ascending: true });
//     if (!error) setData(data);
//     setLoading(false);
//   };

//   const handleAddIndent = async (values) => {
//     try {
//       const itemNameString = Array.isArray(values.item_name) ? values.item_name[0] : values.item_name;
//       const { data: itemMasterRecord } = await supabase.from("item_master").select("id").eq("item_name", itemNameString).single();

//       if (!itemMasterRecord) return message.error("Selected item not found.");

//       const { error: insertError } = await supabase.from("indent").insert([
//         {
//           item_id: itemMasterRecord.id,
//           item_name: itemNameString,
//           quantity: values.quantity,
//           required_date: values.required_date?.format('YYYY-MM-DD'),
//           purpose: values.purpose,
//           department: values.department,
//           status: "Indent Request",
//         },
//       ]);

//       if (insertError) {
//         message.error("Failed to create indent");
//       } else {
//         message.success("Indent Request created!");
//         setIsModalOpen(false);
//         form.resetFields();
//         setFileList([]);
//         await fetchIndentData();
//       }
//     } catch (err) {
//       message.error("An unexpected error occurred.");
//     }
//   };

//   const filteredData = data.filter((item) => {
//     const matchesStatus = activeTab === "All" || item.status === activeTab;
//     const matchesDept = selectedDept === "All" || item.department === selectedDept;
//     const matchesSearch = item.item_name?.toLowerCase().includes(searchText.toLowerCase());
//     return matchesStatus && matchesDept && matchesSearch;
//   });

//   const columns = [
//     {
//       title: "Sl No",
//       key: "index",
//       width: 70,
//       align: 'center',
//       // Continuous numbering logic remains based on pageSize (now 10)
//       render: (text, record, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
//     },
//     { title: "Item Name", dataIndex: "item_name", key: "item_name" },
//     { title: "Quantity", dataIndex: "quantity", key: "quantity", width: 100 },
//     { title: "Purpose", dataIndex: "purpose", key: "purpose", ellipsis: true },
//     {
//       title: "Required Date",
//       dataIndex: "required_date",
//       key: "required_date",
//       width: 140,
//       render: (date) => (date ? dayjs(date).format("DD MMM YYYY") : "-"),
//     },
//     {
//       title: "Department",
//       dataIndex: "department",
//       key: "department",
//       width: 150,
//       render: (dept) => <Tag color="cyan">{dept}</Tag>,
//     },
//     {
//       title: "Status",
//       dataIndex: "status",
//       key: "status",
//       width: 180,
//       render: (status) => <Tag color="blue">{status || "Indent Request"}</Tag>,
//     },
//   ];

//   const tabItems = [
//     { key: "All", label: "All" },
//     { key: "Indent Request", label: "Indent Request" },
//     { key: "Purchase Requested", label: "Purchase Requested" },
//     { key: "Purchase Approved", label: "Purchase Approved" },
//     { key: "PO Issued", label: "PO Issued" },
//   ];

//   return (
//     <div style={{ height: "100vh", padding: "10px 20px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
//       {/* Filters Header */}
//       <div style={{ flexShrink: 0, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
//         <div style={{ display: "flex", gap: "10px" }}>
//           <Input
//             placeholder="Search item name..."
//             prefix={<SearchOutlined />}
//             style={{ width: 220 }}
//             allowClear
//             onChange={(e) => setSearchText(e.target.value)}
//           />
//           <Select
//             placeholder="Department"
//             style={{ width: 180 }}
//             defaultValue="All"
//             onChange={(value) => setSelectedDept(value)}
//           >
//             <Option value="All">All Departments</Option>
//             {departments.map((dept, index) => (
//               <Option key={index} value={dept.department_name}>{dept.department_name}</Option>
//             ))}
//           </Select>
//         </div>
//         <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
//           Add New Indent
//         </Button>
//       </div>

//       <div style={{ flexShrink: 0 }}>
//         <Tabs activeKey={activeTab} onChange={(k) => {
//           setActiveTab(k);
//           setPagination({ ...pagination, current: 1 });
//         }} items={tabItems} style={{ marginBottom: 5 }} />
//       </div>

//       <div style={{ flexGrow: 1, overflow: "hidden" }}>
//         <Table
//           dataSource={filteredData}
//           columns={columns}
//           rowKey="id"
//           bordered
//           size="middle" 
//           loading={loading}
//           // Adjusted scroll height to perfectly fit 10 rows on screen
//           scroll={{ y: 'calc(100vh - 280px)' }} 
//           pagination={{
//             current: pagination.current,
//             pageSize: pagination.pageSize,
//             total: filteredData.length,
//             showSizeChanger: false,
//             placement: "bottomRight" // Updated placement prop
//           }}
//           onChange={(p) => setPagination(p)}
//           onRow={(record) => ({
//             onClick: () => {
//               if (record.status === "Indent Request") {
//                 router.push(`/purchase/purchase_request?id=${record.id}`);
//               }
//             },
//             style: { cursor: record.status === "Indent Request" ? "pointer" : "default" },
//           })}
//         />
//       </div>

//       <Modal 
//         title="Add New Indent" 
//         open={isModalOpen} 
//         onCancel={() => setIsModalOpen(false)} 
//         footer={null} 
//         destroyOnHidden // Updated prop
//       >
//         <Form layout="vertical" form={form} onFinish={handleAddIndent}>
//           {/* Form items (Select, Quantity, Date, etc.) remain as they were */}
//           <Form.Item label="Item Name" name="item_name" rules={[{ required: true }]}>
//             <Select showSearch mode="tags" maxCount={1} placeholder="Select item">
//               {itemsMaster.map((item, index) => (
//                 <Option key={index} value={item.item_name}>{item.item_name}</Option>
//               ))}
//             </Select>
//           </Form.Item>
//           {/* ... Other Form Items ... */}
//           <Form.Item label="Quantity" name="quantity" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} min={1} /></Form.Item>
//           <Form.Item label="Department" name="department" rules={[{ required: true }]}>
//             <Select>
//               {departments.map((d, i) => <Option key={i} value={d.department_name}>{d.department_name}</Option>)}
//             </Select>
//           </Form.Item>
//           <Button type="primary" htmlType="submit" block>Submit</Button>
//         </Form>
//       </Modal>
//     </div>
//   );
// };

// export default InventoryTable;











"use client";

import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Modal, Form, Input, DatePicker, InputNumber, message, Select, Upload, Tabs } from "antd";
import { PlusOutlined, SearchOutlined, UploadOutlined, FilterOutlined } from "@ant-design/icons";
import { supabase } from "../lib/supabase";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";

const { Option } = Select;

const InventoryTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [activeTab, setActiveTab] = useState("All");
  const [itemsMaster, setItemsMaster] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form] = Form.useForm();

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const router = useRouter();

  useEffect(() => {
    fetchIndentData();
    fetchDropdownData();
    
    // 1. Force the body to be unscrollable
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const fetchDropdownData = async () => {
    const { data: items } = await supabase.from("item_master").select("item_name");
    const { data: depts } = await supabase.from("department").select("department_name");
    if (items) setItemsMaster(items);
    if (depts) setDepartments(depts);
  };

  const fetchIndentData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("indent").select("*").order("id", { ascending: true });
    if (!error) setData(data);
    setLoading(false);
  };

  const filteredData = data.filter((item) => {
    const matchesStatus = activeTab === "All" || item.status === activeTab;
    const matchesDept = selectedDept === "All" || item.department === selectedDept;
    const matchesSearch = item.item_name?.toLowerCase().includes(searchText.toLowerCase());
    return matchesStatus && matchesDept && matchesSearch;
  });

  const columns = [
    {
      title: "Sl No",
      key: "index",
      width: 65,
      align: 'center',
      render: (_, __, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    { title: "Item Name", dataIndex: "item_name", key: "item_name" },
    { title: "Quantity", dataIndex: "quantity", key: "quantity", width: 90 },
    { title: "Purpose", dataIndex: "purpose", key: "purpose", ellipsis: true },
    {
      title: "Required Date",
      dataIndex: "required_date",
      key: "required_date",
      width: 130,
      render: (date) => (date ? dayjs(date).format("DD MMM YYYY") : "-"),
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      width: 130,
      render: (dept) => <Tag color="cyan">{dept}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (status) => {
        let color = "blue";
        if (status === "Purchase Requested") color = "magenta";
        if (status === "Purchase Approved") color = "orange";
        return <Tag color={color}>{status || "Indent Request"}</Tag>;
      },
    },
  ];

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      padding: "10px 20px",
      boxSizing: "border-box",
      backgroundColor: "#fff" 
    }}>
      {/* 2. Controls Section (Header) */}
      <div style={{ flexShrink: 0, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <Input 
            placeholder="Search item name..." 
            prefix={<SearchOutlined />} 
            style={{ width: 220 }} 
            allowClear 
            onChange={(e) => setSearchText(e.target.value)} 
          />
          <Select 
            defaultValue="All" 
            style={{ width: 180 }} 
            onChange={(v) => setSelectedDept(v)}
          >
            <Option value="All">All Departments</Option>
            {departments.map((d, i) => <Option key={i} value={d.department_name}>{d.department_name}</Option>)}
          </Select>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Add New Indent</Button>
      </div>

      {/* 3. Tabs Section */}
      <div style={{ flexShrink: 0 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={(k) => { setActiveTab(k); setPagination({ ...pagination, current: 1 }); }} 
          items={[
            { key: "All", label: "All" },
            { key: "Indent Request", label: "Indent Request" },
            { key: "Purchase Requested", label: "Purchase Requested" },
            { key: "Purchase Approved", label: "Purchase Approved" },
            { key: "PO Issued", label: "PO Issued" }
          ]} 
          style={{ marginBottom: 5 }} 
        />
      </div>

      {/* 4. Table Section - Filling available space */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          bordered
          size="middle"
          loading={loading}
          // Dynamic height: fits exactly within the view
          scroll={{ y: 'calc(100vh - 240px)' }} 
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: filteredData.length,
            showSizeChanger: false,
            placement: "bottomRight"
          }}
          onChange={(p) => setPagination(p)}
          onRow={(record) => ({
            onClick: () => record.status === "Indent Request" && router.push(`/purchase/purchase_request?id=${record.id}`),
            style: { cursor: record.status === "Indent Request" ? "pointer" : "default" },
          })}
        />
      </div>

      <Modal title="Add New Indent" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} destroyOnHidden>
        {/* Form content goes here */}
      </Modal>
    </div>
  );
};

export default InventoryTable;