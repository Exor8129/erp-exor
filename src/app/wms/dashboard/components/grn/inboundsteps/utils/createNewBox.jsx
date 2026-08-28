"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Switch,
  Space,
  Divider,
  message,
} from "antd";
import {
  BarcodeOutlined,
  PrinterOutlined,
  PlusOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { supabase } from "../../../../../../lib/supabase";

// Enum definitions based on schema
const CONTAINER_TYPES = [
  { label: "Box", value: "BOX" },
  { label: "Carton", value: "CARTON" },
  { label: "Pallet", value: "PALLET" },
  { label: "Crate", value: "CRATE" },
  { label: "Tote", value: "TOTE" },
];

const CONTAINER_STATUSES = [
  { label: "Pending", value: "PENDING" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
];

const CreateNewBoxModal = ({
  open,
  onClose,
  onSuccess,
  grnId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [parentContainers, setParentContainers] = useState([]);
  const [createdContainer, setCreatedContainer] = useState(null);
  const printRef = useRef(null);

  // Fetch potential parent containers for nesting
  useEffect(() => {
    if (open && grnId) {
      const fetchParents = async () => {
        try {
          const { data, error } = await supabase
            .schema("purchase")
            .from("containers")
            .select("id, container_code, container_type")
            .eq("grn_id", grnId);

          if (error) throw error;
          setParentContainers(data || []);
        } catch (err) {
          console.error("Failed to fetch parent containers:", err);
        }
      };
      fetchParents();
    }
  }, [open, grnId]);

  // Set auto-generated defaults when modal opens
  useEffect(() => {
    if (open) {
      form.resetFields();
      setCreatedContainer(null);
      const timestamp = Date.now().toString().slice(-6);
      const defaultCode = `BOX-${timestamp}`;

      form.setFieldsValue({
        container_code: defaultCode,
        barcode: defaultCode,
        container_type: "BOX",
        status: "PENDING",
        auto_print: true,
      });
    }
  }, [open, form]);

  // Handle direct print function
  const handlePrintBarcode = async (containerData) => {
    const printWindow = window.open("", "_blank", "width=600,height=400");
    if (!printWindow) {
      message.error("Please allow popups to print barcodes.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${containerData.container_code}</title>
          <style>
            body {
              font-family: monospace, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .label-box {
              border: 2px solid #000;
              padding: 16px;
              width: 280px;
              text-align: center;
              border-radius: 6px;
            }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .subtitle { font-size: 12px; color: #555; margin-bottom: 12px; }
            .barcode { 
              font-size: 24px; 
              font-weight: bold; 
              letter-spacing: 4px; 
              border-top: 1px dashed #ccc; 
              border-bottom: 1px dashed #ccc;
              padding: 8px 0;
              margin: 8px 0;
            }
            .footer { font-size: 10px; color: #666; margin-top: 6px; }
            @media print {
              body { padding: 0; }
              .label-box { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="title">${containerData.container_code}</div>
            <div class="subtitle">TYPE: ${containerData.container_type}</div>
            <div class="barcode">*${containerData.barcode}*</div>
            <div class="footer">GRN: ${grnId || "N/A"}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Mark as printed in Database
    try {
      await supabase
        .schema("purchase")
        .from("containers")
        .update({
          printed: true,
          printed_at: new Date().toISOString(),
        })
        .eq("id", containerData.id);
    } catch (err) {
      console.error("Failed to update print timestamp:", err);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Get current authenticated user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const newRecord = {
        grn_id: grnId || null,
        container_code: values.container_code,
        container_type: values.container_type,
        status: values.status || "PENDING",
        parent_container_id: values.parent_container_id || null,
        barcode: values.barcode || values.container_code,
        notes: values.notes || null,
        created_by: user?.id || null,
      };

      const { data, error } = await supabase
        .schema("purchase")
        .from("containers")
        .insert(newRecord)
        .select()
        .single();

      if (error) throw error;

      message.success("New container registered successfully!");
      setCreatedContainer(data);

      if (values.auto_print) {
        handlePrintBarcode(data);
      }

      if (onSuccess) onSuccess(data);
      onClose();
    } catch (err) {
      console.error("Failed to create container:", err);
      message.error(`Container creation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <InboxOutlined className="text-blue-600" />
          <span>Register New Storage Container</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={520}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
        <div className="grid grid-cols-2 gap-3">
          <Form.Item
            name="container_code"
            label="Container Code"
            rules={[{ required: true, message: "Code is required" }]}
          >
            <Input placeholder="e.g. BOX-2026-001" />
          </Form.Item>

          <Form.Item
            name="container_type"
            label="Container Type"
            rules={[{ required: true, message: "Select type" }]}
          >
            <Select placeholder="Type">
              {CONTAINER_TYPES.map((t) => (
                <Select.Option key={t.value} value={t.value}>
                  {t.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="barcode" label="Barcode / Serial">
            <Input
              prefix={<BarcodeOutlined className="text-slate-400" />}
              placeholder="Auto-matches Code if empty"
            />
          </Form.Item>

          <Form.Item name="status" label="Initial Status">
            <Select>
              {CONTAINER_STATUSES.map((s) => (
                <Select.Option key={s.value} value={s.value}>
                  {s.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <Form.Item
          name="parent_container_id"
          label="Parent Container (Optional Nesting)"
        >
          <Select placeholder="None (Top Level)" allowClear>
            {parentContainers.map((p) => (
              <Select.Option key={p.id} value={p.id}>
                {p.container_code} ({p.container_type})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="notes" label="Notes / Location Remarks">
          <Input.TextArea rows={2} placeholder="Optional details..." />
        </Form.Item>

        <Divider className="my-3" />

        <div className="flex items-center justify-between mb-4 bg-slate-50 p-2.5 rounded-md border border-slate-200">
          <span className="text-sm text-slate-600 font-medium flex items-center gap-2">
            <PrinterOutlined /> Print Label Automatically
          </span>
          <Form.Item name="auto_print" valuePropName="checked" noStyle>
            <Switch size="small" />
          </Form.Item>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={loading}
            onClick={() => form.submit()}
          >
            Create Container
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateNewBoxModal;