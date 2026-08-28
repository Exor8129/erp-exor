"use client";

import React, { useState, useEffect } from "react";
import { Card, Radio, Select, Button, message, Spin, Form, Tag } from "antd";
import { SaveOutlined, ReloadOutlined } from "@ant-design/icons";
import { supabase } from "../../lib/supabase"; // Ensure your Supabase client import path is correct

// Pre-defined options for dynamic enum/fixed values
const SCAN_TYPE_OPTIONS = [
  { label: "Bulk", value: "Bulk" },
  { label: "Serialized", value: "Serialized" },
//   { label: "Batch", value: "batch" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: true },
  { label: "Inactive", value: false },
];

const UOM_OPTIONS = [
  { label: "PCS (Pieces)", value: "PCS" },
  { label: "KG (Kilograms)", value: "KG" },
  { label: "BOX (Boxes)", value: "BOX" },
  { label: "LTR (Liters)", value: "LTR" },
  { label: "MTR (Meters)", value: "MTR" },
];

export default function ProductSettings() {
  const [activeTab, setActiveTab] = useState("scan_type"); // 'scan_type' | 'status' | 'uom'
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Field values to edit
  const [newValue, setNewValue] = useState(null);
  
  // Loading states
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);

  // 1. Fetch all items from item_master for the 1st Dropdown
  const fetchItems = async () => {
    try {
      setLoadingItems(true);
      const { data, error } = await supabase
        .from("item_master")
        .select("id, item_name, uom, status, scan_type")
        .order("item_name", { ascending: true });

      if (error) throw error;

      setItems(data || []);
    } catch (err) {
      console.error("Error fetching items:", err);
      message.error("Failed to load products from database.");
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // 2. Sync selected item details and preset value when Item or Tab changes
  useEffect(() => {
    if (!selectedItemId) {
      setSelectedItem(null);
      setNewValue(null);
      return;
    }

    const item = items.find((i) => i.id === selectedItemId);
    setSelectedItem(item || null);

    if (item) {
      if (activeTab === "scan_type") setNewValue(item.scan_type);
      if (activeTab === "status") setNewValue(item.status);
      if (activeTab === "uom") setNewValue(item.uom);
    }
  }, [selectedItemId, activeTab, items]);

  // 3. Handle Save to update DB
  const handleSave = async () => {
    if (!selectedItemId) {
      message.warning("Please select an item first.");
      return;
    }

    if (newValue === null || newValue === undefined) {
      message.warning("Please select a new value to update.");
      return;
    }

    try {
      setSaving(true);

      const updateData = {};
      if (activeTab === "scan_type") updateData.scan_type = newValue;
      if (activeTab === "status") updateData.status = newValue;
      if (activeTab === "uom") updateData.uom = newValue;

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("item_master")
        .update(updateData)
        .eq("id", selectedItemId);

      if (error) throw error;

      message.success(`Successfully updated ${activeTab.replace("_", " ")}!`);

      // Update local state so options reflect newly saved state immediately
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === selectedItemId ? { ...item, ...updateData } : item
        )
      );
    } catch (err) {
      console.error("Error updating item_master:", err);
      message.error(`Failed to update ${activeTab.replace("_", " ")}.`);
    } finally {
      setSaving(false);
    }
  };

  // Render second dropdown based on the selected setting tab
  const renderSecondDropdown = () => {
    if (activeTab === "scan_type") {
      return (
        <Select
          placeholder="Select Scan Type"
          value={newValue}
          onChange={(val) => setNewValue(val)}
          className="w-full"
          options={SCAN_TYPE_OPTIONS}
        />
      );
    }

    if (activeTab === "status") {
      return (
        <Select
          placeholder="Select Status"
          value={newValue}
          onChange={(val) => setNewValue(val)}
          className="w-full"
          options={STATUS_OPTIONS}
        />
      );
    }

    if (activeTab === "uom") {
      return (
        <Select
          showSearch
          allowClear
          placeholder="Select or Type UOM"
          value={newValue}
          onChange={(val) => setNewValue(val)}
          className="w-full"
          options={UOM_OPTIONS}
        />
      );
    }

    return null;
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Option Selector Header */}
      <div className="mb-4 text-center">
        <Radio.Group
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          buttonStyle="solid"
          size="large"
        >
          <Radio.Button value="scan_type">Change Scan Type</Radio.Button>
          <Radio.Button value="status">Change Status</Radio.Button>
          <Radio.Button value="uom">Change UOM</Radio.Button>
        </Radio.Group>
      </div>

      {/* Main Settings Card */}
      <Card
        title={
          <div className="flex justify-between items-center">
            <span>
              Product Settings:{" "}
              <span className="capitalize text-emerald-600 font-semibold">
                {activeTab.replace("_", " ")}
              </span>
            </span>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={fetchItems}
              loading={loadingItems}
            >
              Refresh
            </Button>
          </div>
        }
        className="shadow-sm border-slate-200"
      >
        <Form layout="vertical">
          {/* 1st Searchable Dropdown: Select Product */}
          <Form.Item label="Select Product / Item" required>
            <Select
              showSearch
              loading={loadingItems}
              placeholder="Search item name..."
              value={selectedItemId}
              onChange={(val) => setSelectedItemId(val)}
              optionFilterProp="label"
              className="w-full"
              options={items.map((item) => ({
                value: item.id,
                label: item.item_name,
              }))}
            />
          </Form.Item>

          {/* Current State Info Badge */}
          {selectedItem && (
            <div className="mb-4 p-3 bg-slate-50 border rounded-md flex items-center justify-between text-xs text-slate-600">
              <span>
                Current Value:{" "}
                <strong className="text-slate-800">
                  {String(selectedItem[activeTab] ?? "N/A")}
                </strong>
              </span>
              {activeTab === "status" && (
                <Tag color={selectedItem.status ? "green" : "red"}>
                  {selectedItem.status ? "Active" : "Inactive"}
                </Tag>
              )}
            </div>
          )}

          {/* 2nd Dynamic Dropdown based on Active Option */}
          <Form.Item
            label={`New ${activeTab.replace("_", " ").toUpperCase()}`}
            required
          >
            {renderSecondDropdown()}
          </Form.Item>

          {/* Save Action */}
          <div className="flex justify-end mt-6">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              disabled={!selectedItemId}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}