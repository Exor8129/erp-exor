"use client";

import { useEffect, useState } from "react";
import { Card, Select, Table, Row, Col, message } from "antd";
import { supabase } from "../../lib/supabase";
import dayjs from "dayjs";

export default function PriceLookupPage() {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [data, setData] = useState([]);
  const [latest, setLatest] = useState(null);
  const [boardItems, setBoardItems] = useState([]);

  // 🔄 Load dropdowns
const fetchFilters = async () => {
  try {
    const { data, error } = await supabase
      .rpc("get_distinct_filters");

    if (error) throw error;

    // Extract unique customers
    const uniqueCustomers = [
      ...new Set(data.map((d) => d.party_name)),
    ];

    // Extract unique items
    const uniqueItems = [
      ...new Set(data.map((d) => d.item_name)),
    ];

    setCustomers(uniqueCustomers);
    setItems(uniqueItems);

  } catch (err) {
    console.error(err);
    message.error("Failed to load filters ❌");
  }
};

  useEffect(() => {
    fetchFilters();
  }, []);

  // 🔍 Fetch data based on selection
const fetchData = async (page = 1, pageSize = 10) => {
  if (!selectedCustomer || !selectedItem) return;

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("sales_data")
      .select("id, date, qty, rate,vch_no", { count: "exact" }) // ✅ Get total count
      .eq("party_name", selectedCustomer)
      .eq("item_name", selectedItem)
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (error) throw error;

    setData(data);
    // Set total count for the Ant Design table pagination
    // setTotal(count); 
    
    // Only set latest once when on page 1
    if (page === 1) setLatest(data[0] || null);

  } catch (err) {
    console.error(err);
    message.error("Failed to fetch data ❌");
  }
};
  useEffect(() => {
    fetchData();
  }, [selectedCustomer, selectedItem]);

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      render: (d) => dayjs(d).format("DD-MM-YYYY"),
    },
    {
    title: "Voucher",
    dataIndex: "voucher_no",
  },
    { title: "Qty", dataIndex: "qty" },
    { title: "Rate", dataIndex: "rate" },
    // { title: "Amount", dataIndex: "amount" },
  ];

  const addToBoard = (record) => {
  if (!selectedItem) return;

  const newItem = {
    key: Date.now(),
    item_name: selectedItem,
    rate: record.rate,
    date: record.date,
    vch_no: record.vch_no,
  };

  setBoardItems((prev) => [...prev, newItem]);
};

  return (
    <div className="p-6">
      <Card title="Customer Price Lookup" className="shadow rounded-xl">

        {/* Filters */}
        <Row gutter={16}>
          <Col span={12}>
            <Select
              placeholder="Select Customer"
              style={{ width: "100%" }}
              onChange={setSelectedCustomer}
              options={customers.map((c) => ({ label: c, value: c }))}
              showSearch
            />
          </Col>

          <Col span={12}>
            <Select
              placeholder="Select Item"
              style={{ width: "100%" }}
              onChange={setSelectedItem}
              options={items.map((i) => ({ label: i, value: i }))}
              showSearch
               virtual={false}
            />
          </Col>
        </Row>

        {/* Latest Price */}
        {latest && (
          <Card className="mt-4 bg-green-50">
            <h3>Last Sold Price</h3>
            <p><b>Date:</b> {dayjs(latest.date).format("DD-MM-YYYY")}</p>
            <p><b>Voucher:</b> {latest.vch_no}</p>
            <p><b>Qty:</b> {latest.qty}</p>
            <p><b>Rate:</b> ₹{latest.rate}</p>
          </Card>
        )}

        {/* History Table */}
        <h3 className="mt-6">Price History</h3>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          scroll={{ y: 400 }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}