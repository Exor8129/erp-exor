"use client";

import { Modal, Form, Input, Button, message } from "antd";
import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";

export default function WarehouseModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [warehouseCode, setWarehouseCode] = useState("");

  // Generate next warehouse code
  const generateCode = async () => {
    const { data, error } = await supabase
      .from("warehouses")
      .select("code")
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastCode = data[0].code; // WH01
      const number = parseInt(lastCode.replace("WH", ""));
      const next = number + 1;
      const newCode = `WH${String(next).padStart(2, "0")}`;
      setWarehouseCode(newCode);
      form.setFieldsValue({ code: newCode });
    } else {
      setWarehouseCode("WH01");
      form.setFieldsValue({ code: "WH01" });
    }
  };

  useEffect(() => {
    if (open) generateCode();
  }, [open]);

  const handleSubmit = async (values) => {
    setLoading(true);

    const { error } = await supabase.from("warehouses").insert([
      {
        name: values.name,
        code: values.code,
        location: values.location,
      },
    ]);

    if (error) {
      console.error(error);
      message.error("Failed to create warehouse");
    } else {
      message.success("Warehouse created");
      form.resetFields();
      onClose();
    }

    setLoading(false);
  };

  return (
    <Modal
      open={open}
      title="Create Warehouse"
      footer={null}
      onCancel={onClose}
      width={450}
    >
      <Form layout="vertical" form={form} onFinish={handleSubmit}>
        
        <Form.Item label="Warehouse Code" name="code">
          <Input disabled />
        </Form.Item>

        <Form.Item
          label="Warehouse Name"
          name="name"
          rules={[{ required: true, message: "Enter warehouse name" }]}
        >
          <Input placeholder="Main Warehouse" />
        </Form.Item>

        <Form.Item label="Location" name="location">
          <Input placeholder="Kochi Storage Facility" />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
        >
          Create Warehouse
        </Button>

      </Form>
    </Modal>
  );
}