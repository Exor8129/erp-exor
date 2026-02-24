"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Spin,
  Button,
  Tooltip,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { supabase } from "../lib/supabase"; // ✅ updated import
import dayjs from "dayjs";

const InventoryTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchIndentData();

    const channel = supabase
      .channel("indent-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "indent" },
        () => {
          fetchIndentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIndentData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("indent")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Fetch Error:", error);
      message.error("Failed to load data");
    } else {
      setData(data);
    }

    setLoading(false);
  };

  const handleAddIndent = async (values) => {
    const { error } = await supabase.from("indent").insert([
      {
        item_name: values.item_name,
        quantity: values.quantity,
        required_date: values.required_date.format("YYYY-MM-DD"),
        purpose: values.purpose,
        department: values.department,
      },
    ]);

    if (error) {
      console.error("Insert Error:", error);
      message.error("Failed to add indent");
    } else {
      message.success("Indent added successfully");
      setIsModalOpen(false);
      form.resetFields();
      fetchIndentData();
    }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 70 },
    { title: "Item Name", dataIndex: "item_name", key: "item_name" },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: "Required Date",
      dataIndex: "required_date",
      key: "required_date",
      render: (date) =>
        date ? dayjs(date).format("DD MMM YYYY") : "-",
    },
    { title: "Purpose", dataIndex: "purpose", key: "purpose" },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      render: (dept) => <Tag color="blue">{dept}</Tag>,
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      {/* Add Button */}
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <Tooltip title="Add New Indent">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Add New Indent
          </Button>
        </Tooltip>
      </div>

      {loading ? (
        <Spin size="large" />
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          bordered
          pagination={{ pageSize: 8 }}
        />
      )}

      {/* Modal */}
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
            rules={[{ required: true, message: "Please enter item name" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Quantity"
            name="quantity"
            rules={[{ required: true, message: "Enter quantity" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>

          <Form.Item
            label="Required Date"
            name="required_date"
            rules={[{ required: true, message: "Select date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Purpose"
            name="purpose"
            rules={[{ required: true, message: "Enter purpose" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Department"
            name="department"
            rules={[{ required: true, message: "Enter department" }]}
          >
            <Input />
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