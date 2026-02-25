"use client";

import { useState, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  Input,
  Button,
  Rate,
  Tag,
  Segmented,
  Modal,
  Form,
} from "antd";

import { ShoppingCart, Package, Warehouse, TrendingUp } from "lucide-react";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "../../lib/supabase"; // ✅ updated import

const { Option } = Select;
const { TextArea } = Input;

export default function PurchaseRequestPage() {
  const [range, setRange] = useState(90);
  const [interval, setInterval] = useState(5);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [quantity, setQuantity] = useState(null);
  const [priority, setPriority] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [rate, setRate] = useState(null);

  // 🔹 Range Config
  const rangeMap = {
    90: { days: 90 },
    "6m": { days: 180 },
    "1y": { months: 12 },
    "2y": { months: 24 },
    "3y": { months: 36 },
  };

  const config = rangeMap[range];

  // 🔹 DAILY DATA
  const dailyData = useMemo(() => {
    if (!config.days) return [];
    return Array.from({ length: config.days }, (_, i) => ({
      day: i + 1,
      sales: Math.floor(Math.random() * 20) + 5,
    }));
  }, [config]);

  // 🔹 GROUPED DAILY
  const groupedDailyData = useMemo(() => {
    if (!config.days) return [];

    const result = [];
    for (let i = 0; i < dailyData.length; i += interval) {
      const chunk = dailyData.slice(i, i + interval);
      const total = chunk.reduce((sum, item) => sum + item.sales, 0);

      result.push({
        label: `D${chunk[0].day}-${chunk[chunk.length - 1].day}`,
        sales: total,
      });
    }

    return result;
  }, [dailyData, interval, config]);

  // 🔹 MONTHLY DATA (Real Month Labels)
  const monthlyData = useMemo(() => {
    if (!config.months) return [];

    const today = new Date();
    const data = [];

    for (let i = config.months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);

      const label = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      data.push({
        label,
        sales: Math.floor(Math.random() * 500) + 200,
      });
    }

    return data;
  }, [config]);

  const chartData = config.days ? groupedDailyData : monthlyData;

  // 🔹 Vendor Table
  const vendorColumns = [
    { title: "Vendor", dataIndex: "vendor" },
    {
      title: "Rating",
      dataIndex: "rating",
      render: (rating) => <Rate disabled defaultValue={rating} />,
    },
    { title: "Last Rate", dataIndex: "rate" },
    { title: "Credit", dataIndex: "credit" },
    {
      title: "Preferred",
      dataIndex: "preferred",
      render: (preferred) =>
        preferred ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
    },
  ];

  const vendorData = [
    {
      key: 1,
      vendor: "ABC Pharma",
      rating: 4,
      rate: "₹470",
      credit: "30 Days",
      preferred: true,
    },
    {
      key: 2,
      vendor: "Medi Supplies",
      rating: 5,
      rate: "₹465",
      credit: "45 Days",
      preferred: false,
    },
  ];

  const handleNewItemSubmit = (values) => {
    console.log("New Item Request:", values);
    form.resetFields();
    setIsNewItemModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!vendor || !quantity || !priority) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("purchase_requests").insert([
        {
          item_name: "Mesh Nebulizer - Exor", // make dynamic later
          quantity: Number(quantity),
          rate: 0,
          vendor_name: vendor,
          priority_type: priority,
          status: "Pending",
          rate: rate ? Number(rate) : null,
        },
      ]);

      if (error) throw error;

      alert("Purchase Request Created Successfully");

      // Reset fields
      setVendor(null);
      setQuantity(null);
      setPriority(null);
      setRate("");
      setRemarks("");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart size={22} />
          <h1 className="text-2xl font-semibold">Purchase Request</h1>
        </div>

        <Button onClick={() => setIsNewItemModalOpen(true)}>
          + Request New Item
        </Button>
      </div>

      {/* PRODUCT DETAILS */}
      <Card className="rounded-2xl shadow-sm">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package size={18} />
              Mesh Nebulizer - Exor
            </h2>
            <p className="text-gray-500">SKU: EXR-MN-001</p>
          </div>

          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Current Stock"
                value={42}
                prefix={<Warehouse size={14} />}
              />
            </Col>
            <Col span={6}>
              <Statistic title="Reorder Level" value={60} />
            </Col>
            <Col span={6}>
              <Statistic title="Pending PO Qty" value={25} />
            </Col>
            <Col span={6}>
              <Statistic title="Avg Purchase Rate" value="₹475" />
            </Col>
          </Row>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Current Request Details</h3>

            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Requested Quantity"
                  value={80}
                  valueStyle={{ color: "#1677ff" }}
                />
              </Col>

              <Col span={8}>
                <p className="text-gray-500 text-sm">Department</p>
                <p className="font-medium">ICU Department</p>
              </Col>

              <Col span={8}>
                <p className="text-gray-500 text-sm">Purpose</p>
                <p className="font-medium">Emergency Stock Refill</p>
              </Col>
            </Row>
          </div>
        </div>
      </Card>

      {/* SALES ANALYTICS */}
      <Card className="rounded-2xl shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp size={16} />
            Sales Analytics
          </h3>

          <div className="flex gap-3 flex-wrap">
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { label: "90D", value: 90 },
                { label: "6M", value: "6m" },
                { label: "1Y", value: "1y" },
                { label: "2Y", value: "2y" },
                { label: "3Y", value: "3y" },
              ]}
            />

            {config.days && (
              <Segmented
                value={interval}
                onChange={setInterval}
                options={[
                  { label: "5D", value: 5 },
                  { label: "10D", value: 10 },
                  { label: "15D", value: 15 },
                ]}
              />
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sales" fill="#1677ff" radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#ff4d4f"
              strokeWidth={3}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* VENDOR TABLE */}
      <Card className="rounded-2xl shadow-sm">
        <h3 className="font-semibold mb-3">Available Vendors</h3>
        <Table
          size="small"
          pagination={false}
          columns={vendorColumns}
          dataSource={vendorData}
        />
      </Card>

      {/* PURCHASE FORM */}
      <Card className="rounded-2xl shadow-sm">
        <h3 className="font-semibold mb-4">Create Purchase Request</h3>

        <Row gutter={[16, 16]}>
          {/* Vendor */}
          <Col xs={24} md={8}>
            <Select
              placeholder="Select Vendor"
              className="w-full"
              value={vendor}
              onChange={(value) => setVendor(value)}
              allowClear
            >
              <Option value="ABC Pharma">ABC Pharma</Option>
              <Option value="Medi Supplies">Medi Supplies</Option>
            </Select>
          </Col>

          {/* Quantity */}
          <Col xs={24} md={8}>
            <Input
              type="number"
              min={1}
              placeholder="Enter Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Col>

          {/* Rate */}
          <Col xs={24} md={8}>
            <Input
              type="number"
              min={0}
              placeholder="Rate (auto-filled if empty)"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Col>

          {/* Priority */}
          <Col xs={24} md={8}>
            <Select
              placeholder="Select Priority"
              className="w-full"
              value={priority}
              onChange={(value) => setPriority(value)}
              allowClear
            >
              <Option value="normal">Normal</Option>
              <Option value="urgent">Urgent</Option>
              <Option value="very_urgent">Very Urgent</Option>
            </Select>
          </Col>

          {/* Remarks */}
          <Col xs={24}>
            <Input.TextArea
              rows={2}
              placeholder="Remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </Col>
        </Row>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            danger
            onClick={() => {
              setVendor(null);
              setQuantity(null);
              setPriority(null);
              setRate(null);
              setRemarks("");
            }}
          >
            Cancel
          </Button>

          <Button type="primary" loading={loading} onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      </Card>

      {/* NEW ITEM MODAL */}
      <Modal
        title="Request New Item"
        open={isNewItemModalOpen}
        onCancel={() => setIsNewItemModalOpen(false)}
        footer={null}
      >
        <Form layout="vertical" form={form} onFinish={handleNewItemSubmit}>
          <Form.Item
            label="Item Name"
            name="itemName"
            rules={[{ required: true, message: "Enter item name" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: "Enter category" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Estimated Monthly Usage" name="usage">
            <Input type="number" />
          </Form.Item>

          <Form.Item label="Purpose" name="purpose">
            <TextArea rows={3} />
          </Form.Item>

          <div className="flex justify-end gap-3">
            <Button onClick={() => setIsNewItemModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Submit Request
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
