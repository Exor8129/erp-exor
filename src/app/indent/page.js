// "use client";

// import React, { useEffect, useState } from "react";
// import {
//   Table, Tag, Spin, Button, Tooltip, Modal, Form, Input,
//   DatePicker, InputNumber, message, Select
// } from "antd";
// import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
// import { supabase } from "../lib/supabase"; //
// import dayjs from "dayjs";

// const { Option } = Select;

// const InventoryTable = () => {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [searchText, setSearchText] = useState("");
//   const [itemsMaster, setItemsMaster] = useState([]);
//   const [departments, setDepartments] = useState([]);
//   const [form] = Form.useForm();

//   useEffect(() => {
//     fetchIndentData();
//     fetchDropdownData();
//   }, []);

//   const fetchDropdownData = async () => {
//     // Fetches the reference list for the dropdown
//     const { data: items } = await supabase.from("item_master").select("item_name");
//     const { data: depts } = await supabase.from("department").select("department_name");
//     if (items) setItemsMaster(items);
//     if (depts) setDepartments(depts);
//   };

//   const fetchIndentData = async () => {
//     setLoading(true);
//     const { data, error } = await supabase.from("indent").select("*").order("id", { ascending: true });
//     if (!error) setData(data);
//     setLoading(false);
//   };

//   const handleAddIndent = async (values) => {
//     // 1. Convert the Ant Design tag array into a plain string
//     const itemNameString = Array.isArray(values.item_name)
//       ? values.item_name[0]
//       : values.item_name;

//     // 2. Insert ONLY into the indent table
//     const { error } = await supabase.from("indent").insert([
//       {
//         item_name: itemNameString, // Saves as 'elko bp' instead of ["elko bp"]
//         quantity: values.quantity,
//         required_date: values.required_date.format("YYYY-MM-DD"),
//         purpose: values.purpose,
//         department: values.department,
//       },
//     ]);

//     if (error) {
//       message.error("Failed to add indent");
//     } else {
//       message.success("Indent added (item_master remains unchanged)");
//       setIsModalOpen(false);
//       form.resetFields();
//       fetchIndentData();
//     }
//   };

//   const columns = [
//     { title: "ID", dataIndex: "id", key: "id", width: 70 },
//     { title: "Item Name", dataIndex: "item_name", key: "item_name" },
//     { title: "Quantity", dataIndex: "quantity", key: "quantity" },
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
//       render: (dept) => <Tag color="blue">{dept}</Tag>,
//     },
//   ];

//   return (
//     <div style={{ padding: 20 }}>
//       <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
//         <Input
//           placeholder="Search Table..."
//           prefix={<SearchOutlined />}
//           style={{ width: 300 }}
//           onChange={(e) => setSearchText(e.target.value)}
//         />
//         <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
//           Add New Indent
//         </Button>
//       </div>

//       <Table
//         dataSource={data.filter(i => i.item_name?.toLowerCase().includes(searchText.toLowerCase()))}
//         columns={columns}
//         rowKey="id"
//         loading={loading}
//       />

//       <Modal title="Add New Indent" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
//         <Form layout="vertical" form={form} onFinish={handleAddIndent}>

//           <Form.Item
//             label="Item Name"
//             name="item_name"
//             rules={[{ required: true, message: "Type to check master list" }]}
//           >
//             <Select
//               showSearch
//               placeholder="Select existing or type new"
//               mode="tags" // Allows typing names not in master
//               maxCount={1}
//               optionFilterProp="children" // Checks master data while typing
//               style={{ width: '100%' }}
//             >
//               {itemsMaster.map((item, index) => (
//                 <Option key={index} value={item.item_name}>
//                   {item.item_name}
//                 </Option>
//               ))}
//             </Select>
//           </Form.Item>

//           <Form.Item label="Quantity" name="quantity" rules={[{ required: true }]}>
//             <InputNumber style={{ width: "100%" }} min={1} />
//           </Form.Item>

//           <Form.Item label="Required Date" name="required_date" >
//             <DatePicker style={{ width: "100%" }} />
//           </Form.Item>

//           <Form.Item label="Purpose" name="purpose" >
//             <Input />
//           </Form.Item>

//           <Form.Item label="Department" name="department" rules={[{ required: true }]}>
//             <Select placeholder="Select department">
//               {departments.map((dept, index) => (
//                 <Option key={index} value={dept.department_name}>
//                   {dept.department_name}
//                 </Option>
//               ))}
//             </Select>
//           </Form.Item>

//           <Button type="primary" htmlType="submit" block>Submit</Button>
//         </Form>
//       </Modal>
//     </div>
//   );
// };

// export default InventoryTable;

// "use client";

// import React, { useEffect, useState } from "react";
// import {
//   Table, Tag, Spin, Button, Modal, Form, Input,
//   DatePicker, InputNumber, message, Select, Upload
// } from "antd";
// import { PlusOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
// import { supabase } from "../lib/supabase";
// import dayjs from "dayjs";

// const { Option } = Select;

// const InventoryTable = () => {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [dropdownOpen, setDropdownOpen] = useState(false);
//   const [searchText, setSearchText] = useState("");
//   const [itemsMaster, setItemsMaster] = useState([]);
//   const [departments, setDepartments] = useState([]);
//   const [fileList, setFileList] = useState([]);
//   const [form] = Form.useForm();

//   // Watcher to trigger image upload field appearance
//   const itemNameValue = Form.useWatch("item_name", form);

//   useEffect(() => {
//     fetchIndentData();
//     fetchDropdownData();
//   }, []);

//   const fetchDropdownData = async () => {
//     const { data: items } = await supabase.from("item_master").select("item_name");
//     const { data: depts } = await supabase.from("department").select("department_name");
//     if (items) setItemsMaster(items);
//     if (depts) setDepartments(depts);
//   };

//   const fetchIndentData = async () => {
//     setLoading(true);
//     const { data, error } = await supabase.from("indent").select("*").order("id", { ascending: true });
//     if (!error) setData(data);
//     setLoading(false);
//   };

//   const handleAddIndent = async (values) => {
//     // Prevent brackets/quotes in DB
//     const itemNameString = Array.isArray(values.item_name) ? values.item_name[0] : values.item_name;

//     // Safety check for date formatting to prevent crash

//     const formattedDate = values.required_date ? values.required_date.format("YYYY-MM-DD") : null;

//     const { error } = await supabase.from("indent").insert([
//       {
//         item_name: itemNameString,
//         quantity: values.quantity,
//         required_date: formattedDate,
//         purpose: values.purpose,
//         department: values.department,
//         status: "Indent Request",
//       },
//     ]);

//     if (!error) {
//       message.success("Indent created successfully");
//       setIsModalOpen(false);
//       form.resetFields();
//       setFileList([]);
//       fetchIndentData();
//     } else {
//       message.error("Failed to save indent");
//     }
//   };

//   const columns = [
//     { title: "ID", dataIndex: "id", key: "id", width: 70 },
//     { title: "Item Name", dataIndex: "item_name", key: "item_name" },
//     { title: "Quantity", dataIndex: "quantity", key: "quantity" },

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
//         if (status === "Purchase Approved") color = "orange";
//         if (status === "PO Issued") color = "green";
//         return <Tag color={color}>{status || "Purchase Requested"}</Tag>;
//       },
//     },
//   ];

//   return (
//     <div style={{ padding: 20 }}>
//       <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
//         <Input
//           placeholder="Search items..."
//           prefix={<SearchOutlined />}
//           style={{ width: 300 }}
//           allowClear
//           onChange={(e) => setSearchText(e.target.value)}
//         />
//         <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
//           Add New Indent
//         </Button>
//       </div>

//       <Table
//         dataSource={data.filter(i => i.item_name?.toLowerCase().includes(searchText.toLowerCase()))}
//         columns={columns}
//         rowKey="id"
//         bordered
//         loading={loading}
//       />

//       <Modal title="Add New Indent" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
//         <Form layout="vertical" form={form} onFinish={handleAddIndent}>
//           <Form.Item label="Item Name" name="item_name" rules={[{ required: true }]}>
//             <Select
//               showSearch mode="tags" maxCount={1}
//               open={dropdownOpen}
//               onOpenChange={(open) => setDropdownOpen(open)}
//               onSelect={() => setDropdownOpen(false)}
//               onInputKeyDown={(e) => { if (e.key === 'Enter') setDropdownOpen(false); }}
//               placeholder="Select or type new item"
//             >
//               {itemsMaster.map((item, index) => (
//                 <Option key={index} value={item.item_name}>{item.item_name}</Option>
//               ))}
//             </Select>
//           </Form.Item>

//           {itemNameValue && (
//             <Form.Item label="Item Image" name="image" valuePropName="fileList" getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}>
//               <Upload
//                 listType="picture"
//                 maxCount={1}
//                 beforeUpload={() => false}
//                 fileList={fileList}
//                 onChange={({ fileList }) => setFileList(fileList)}
//               >
//                 <Button icon={<UploadOutlined />} block>Upload Image</Button>
//               </Upload>
//             </Form.Item>
//           )}

//           <Form.Item label="Quantity" name="quantity" rules={[{ required: true }]}>
//             <InputNumber style={{ width: "100%" }} min={1} />
//           </Form.Item>

//           <Form.Item label="Required Date" name="required_date">
//             <DatePicker style={{ width: "100%" }} />
//           </Form.Item>

//           <Form.Item label="Purpose" name="purpose"><Input /></Form.Item>

//           <Form.Item label="Department" name="department" rules={[{ required: true }]}>
//             <Select placeholder="Select department">
//               {departments.map((dept, index) => (
//                 <Option key={index} value={dept.department_name}>{dept.department_name}</Option>
//               ))}
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
import {Table,Tag,Spin,Button,Modal,Form,Input,DatePicker,InputNumber,message,Select,Upload,Tabs,} from "antd";
import {PlusOutlined,SearchOutlined,UploadOutlined,FilterOutlined,} from "@ant-design/icons";
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
  const [selectedDept, setSelectedDept] = useState("All"); // Department filter state
  const [activeTab, setActiveTab] = useState("All"); // Status tab state
  const [itemsMaster, setItemsMaster] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();

  const itemNameValue = Form.useWatch("item_name", form);
  const router = useRouter();

  useEffect(() => {
    fetchIndentData();
    fetchDropdownData();
  }, []);




  const fetchDropdownData = async () => {
    const { data: items } = await supabase
      .from("item_master")
      .select("item_name");
    const { data: depts } = await supabase
      .from("department")
      .select("department_name");
    if (items) setItemsMaster(items);
    if (depts) setDepartments(depts);
  };

  const fetchIndentData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("indent")
      .select("*")
      .order("id", { ascending: true });
    if (!error) setData(data);
    setLoading(false);
  };


// Ensure this is only declared ONCE at the top of your component

const [isModalVisible, setIsModalVisible] = useState(false);

const handleAddIndent = async (values) => {
  try {
    // FIX: Extract clean string if the form returns an array
    const itemNameString = Array.isArray(values.item_name) 
      ? values.item_name[0] 
      : values.item_name;

    // 1. Fetch the 'id' from item_master
    const { data: itemMasterRecord, error: fetchError } = await supabase
      .from("item_master")
      .select("id")
      .eq("item_name", itemNameString)
      .single();

    // Use fetchError specifically to avoid ReferenceError
    if (fetchError || !itemMasterRecord) {
      console.error("Fetch Error:", fetchError);
      return message.error("Selected item not found in Item Master.");
    }

    // 2. Insert into the indent table
    const { error: insertError } = await supabase.from("indent").insert([
      {
        item_id: itemMasterRecord.id,
        item_name: itemNameString, // This will now be saved without brackets
        quantity: values.quantity,
        required_date: values.required_date?.format('YYYY-MM-DD'),
        purpose: values.purpose,
        department: values.department,
        status: "Indent Request",
      },
    ]);

    // Check insertError specifically
    if (insertError) {
      console.error("Insert Error:", insertError);
      message.error("Failed to create indent: " + insertError.message);
    } else {
      message.success("Indent Request created successfully!");
      
      // 1. Close the modal first to provide immediate feedback
      setIsModalOpen(false); 
      
      // 2. Clear form fields so they are ready for the next entry
      form.resetFields(); 
      setFileList([]); // Clear any uploaded images

      // 3. Trigger the data fetch to sync with Supabase
      await fetchIndentData(); 
      
      // 4. Optional: Clear filters to ensure the new record is visible
      setSearchText(""); 
      setActiveTab("All");
    }
  } catch (err) {
    console.error("Unexpected Error:", err);
    message.error("An unexpected error occurred.");
  }
};

  // --- FILTER LOGIC ---
  const filteredData = data.filter((item) => {
    const matchesStatus = activeTab === "All" || item.status === activeTab;
    const matchesDept =
      selectedDept === "All" || item.department === selectedDept;
    const matchesSearch = item.item_name
      ?.toLowerCase()
      .includes(searchText.toLowerCase());
    return matchesStatus && matchesDept && matchesSearch;
  });

  const columns = [
    {
      title: "Sl No",
      key: "index",
      width: 70,
      // (text, record, index) => index + 1 gives a continuous sequence
      render: (text, record, index) => index + 1,
    },
    { title: "Item Name", dataIndex: "item_name", key: "item_name" },
    { title: "Quantity", dataIndex: "quantity", key: "quantity" },
    {
      title: "Required Date",
      dataIndex: "required_date",
      key: "required_date",
      render: (date) => (date ? dayjs(date).format("DD MMM YYYY") : "-"),
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      render: (dept) => <Tag color="cyan">{dept}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = "blue";
        if (status === "Purchase Requested") color = "magenta";
        if (status === "Purchase Approved") color = "orange";
        if (status === "PO Issued") color = "green";
        return <Tag color={color}>{status || "Indent Request"}</Tag>;
      },
    },
  ];

  const tabItems = [
    { key: "All", label: "All" },
    { key: "Indent Request", label: "Indent Request" },
    { key: "Purchase Requested", label: "Purchase Requested" },
    { key: "Purchase Approved", label: "Purchase Approved" },
    { key: "PO Issued", label: "PO Issued" },
  ];

  return (
    <div style={{ padding: 20 }}>
      {/* Header Controls */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <Input
            placeholder="Search item name..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
          />

          <Select
            placeholder="Filter by Department"
            style={{ width: 200 }}
            defaultValue="All"
            suffixIcon={<FilterOutlined />}
            onChange={(value) => setSelectedDept(value)}
          >
            <Option value="All">All Departments</Option>
            {departments.map((dept, index) => (
              <Option key={index} value={dept.department_name}>
                {dept.department_name}
              </Option>
            ))}
          </Select>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Add New Indent
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 10 }}
      />

      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey="id"
        bordered
        loading={loading}
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({
          onClick: () => {
            if (record.status === "Indent Request") {
              router.push(`/purchase/purchase_request?id=${record.id}`);
            }
          },
          style: {
            cursor: record.status === "Indent Request" ? "pointer" : "default",
          },
        })}
      />

      {/* Modal remains the same as your provided code */}
      <Modal
        title="Add New Indent"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form layout="vertical" form={form} onFinish={handleAddIndent}>
          <Form.Item
            label="Item Name"
            name="item_name"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              mode="tags"
              maxCount={1}
              open={dropdownOpen}
              onOpenChange={(open) => setDropdownOpen(open)}
              onSelect={() => setDropdownOpen(false)}
              onInputKeyDown={(e) => {
                if (e.key === "Enter") setDropdownOpen(false);
              }}
              placeholder="Select or type new item"
            >
              {itemsMaster.map((item, index) => (
                <Option key={index} value={item.item_name}>
                  {item.item_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {itemNameValue && (
            <Form.Item
              label="Item Image"
              name="image"
              valuePropName="fileList"
              getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            >
              <Upload
                listType="picture"
                maxCount={1}
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
              >
                <Button icon={<UploadOutlined />} block>
                  Upload Image
                </Button>
              </Upload>
            </Form.Item>
          )}

          <Form.Item
            label="Quantity"
            name="quantity"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>

          <Form.Item label="Required Date" name="required_date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Purpose" name="purpose">
            <Input />
          </Form.Item>

          <Form.Item
            label="Department"
            name="department"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select department">
              {departments.map((dept, index) => (
                <Option key={index} value={dept.department_name}>
                  {dept.department_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            Submit
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryTable;
