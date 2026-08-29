"use client";

import React, { useState } from "react";
import { Modal, Form, Input, Switch, message } from "antd";
import { supabase } from "../../../../lib/supabase"; // Adjust this import path to your Supabase client

export default function AddTransporterModal({
  open,
  onClose,
  onSuccess, // Callback returning newly created transporter record
  existingTransporters = [], // List for client-side duplicate check
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      // 1. Client-side duplicate check
      const isDuplicate = existingTransporters.some(
        (t) =>
          t.transporter_name.trim().toLowerCase() ===
          values.transporter_name.trim().toLowerCase()
      );

      if (isDuplicate) {
        form.setFields([
          {
            name: "transporter_name",
            errors: ["A transporter with this name already exists."],
          },
        ]);
        setSubmitting(false);
        return;
      }

      // 2. Prepare payload for public.transporters
      const payload = {
        transporter_name: values.transporter_name.trim(),
        tracking_base_url: values.tracking_base_url?.trim() || null,
        contact_person: values.contact_person?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        active: values.active ?? true,
      };

      // 3. Save directly using Supabase client
      const { data, error } = await supabase
        .from("transporters") // If under public schema default
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      message.success("Transporter added successfully!");
      form.resetFields();

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      console.error("FULL ERROR:", err);
      console.error("MESSAGE:", err?.message);
      console.error("DETAILS:", err?.details);
      console.error("HINT:", err?.hint);
      console.error("CODE:", err?.code);

      message.error(err?.message || "Error saving transporter");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="🚚 Add New Transporter"
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnHidden
      okText="Save Transporter"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ active: true }}
        className="mt-4"
      >
        <Form.Item
          label="Transporter Name"
          name="transporter_name"
          rules={[
            { required: true, message: "Please enter transporter name" },
            { whitespace: true, message: "Name cannot be empty spaces" },
          ]}
        >
          <Input placeholder="e.g., VRL Logistics" />
        </Form.Item>

        <Form.Item label="Contact Person" name="contact_person">
          <Input placeholder="e.g., John Doe" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="Phone"
            name="phone"
            rules={[
              {
                pattern: /^[0-9+\s-]{8,15}$/,
                message: "Enter a valid phone number",
              },
            ]}
          >
            <Input placeholder="e.g., +91 9876543210" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ type: "email", message: "Enter a valid email" }]}
          >
            <Input placeholder="e.g., contact@vrl.com" />
          </Form.Item>
        </div>

        <Form.Item
          label="Tracking Base URL"
          name="tracking_base_url"
          rules={[{ type: "url", message: "Enter a valid URL" }]}
        >
          <Input placeholder="https://tracking.example.com/track?lr=" />
        </Form.Item>

        <Form.Item label="Active Status" name="active" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>
      </Form>
    </Modal>
  );
}