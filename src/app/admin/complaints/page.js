"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import {
  Card,
  Table,
  Typography,
  message,
  Row,
  Col,
  Select,
  InputNumber,
  Button,
  Space,
  Segmented,
  Modal,
} from "antd";

const { Title, Text } = Typography;

export default function ComplaintStockPage() {
  const [items, setItems] = useState([]);
  const [data, setData] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [sellable, setSellable] = useState(0);
  const [scrap, setScrap] = useState(0);
  const [repacking, setRepacking] = useState(0);

  const [editingId, setEditingId] = useState(null); // ⭐ EDIT MODE

  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [duplicateModal, setDuplicateModal] = useState(false);
  const [existingEntry, setExistingEntry] = useState([]);
  const [pendingPayload, setPendingPayload] = useState(null);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
  });

  // -----------------------------
  // FETCH ITEMS
  // -----------------------------
  const fetchItems = async () => {
    const { data } = await supabase
      .from("item_master")
      .select("id, item_name")
      .order("item_name");

    setItems(data || []);
  };

  // -----------------------------
  // FETCH DATA
  // -----------------------------
  const fetchData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("complaint_item")
      .select(
        `
        id,
        item_id,
        sellable,
        scrap,
        repacking,
        item_master (item_name)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      message.error("Error loading data");
      setLoading(false);
      return;
    }

    const formatted = (data || []).map((row) => ({
      key: row.id,
      item_id: row.item_id,
      item_name: row.item_master?.item_name || "Unknown",
      sellable: row.sellable || 0,
      scrap: row.scrap || 0,
      repacking: row.repacking || 0,
    }));

    setData(formatted);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    fetchData();
  }, []);

  // -----------------------------
  // TOTAL
  // -----------------------------
  const totalQty = sellable + scrap + repacking;

  // -----------------------------
  // RESET FORM
  // -----------------------------
  const resetForm = () => {
    setSelectedItem(null);
    setSellable(0);
    setScrap(0);
    setRepacking(0);
    setEditingId(null);
  };

  // -----------------------------
  // ADD / UPDATE
  // -----------------------------
  const handleSave = async () => {
    if (!selectedItem || totalQty <= 0) {
      message.warning("Enter valid data");
      return;
    }

    // ✏️ EDIT MODE → normal update
    if (editingId) {
      return handleFinalSave({
        item_id: selectedItem,
        sellable,
        scrap,
        repacking,
      });
    }

    // 🔍 CHECK EXISTING ITEM
    const { data: existing } = await supabase
      .from("complaint_item")
      .select("id, sellable, scrap, repacking, item_master(item_name)")
      .eq("item_id", selectedItem)
      .limit(1)
      .single();

    if (existing) {
      setExistingEntry(existing);

      setPendingPayload({
        item_id: selectedItem,
        sellable,
        scrap,
        repacking,
      });

      setDuplicateModal(true);
      return;
    }

    // ✅ NEW ENTRY
    handleFinalSave({
      item_id: selectedItem,
      sellable,
      scrap,
      repacking,
    });
  };

  const handleFinalSave = async (payload, isMerge = false) => {
    setSaving(true);

    let error;

    if (editingId) {
      // ✏️ EDIT MODE
      const res = await supabase
        .from("complaint_item")
        .update(payload)
        .eq("id", editingId);

      error = res.error;
    } else if (isMerge && existingEntry) {
      // 🔁 MERGE MODE (ADD TO EXISTING)
      const res = await supabase
        .from("complaint_item")
        .update({
          sellable: (existingEntry.sellable || 0) + payload.sellable,
          scrap: (existingEntry.scrap || 0) + payload.scrap,
          repacking: (existingEntry.repacking || 0) + payload.repacking,
        })
        .eq("id", existingEntry.id);

      error = res.error;
    } else {
      // ➕ NEW ENTRY
      const res = await supabase.from("complaint_item").insert([payload]);

      error = res.error;
    }

    if (error) {
      console.error(error);
      message.error("Error saving");
    } else {
      message.success(
        editingId
          ? "Updated successfully"
          : isMerge
            ? "Merged successfully"
            : "Added successfully",
      );

      resetForm();
      fetchData();
    }

    setSaving(false);
    setDuplicateModal(false);
    setExistingEntry(null);
    setPendingPayload(null);
  };

  // -----------------------------
  // EDIT CLICK
  // -----------------------------
  const handleEdit = (record) => {
    setEditingId(record.key);
    setSelectedItem(record.item_id);
    setSellable(record.sellable);
    setScrap(record.scrap);
    setRepacking(record.repacking);
  };

  // -----------------------------
  // FILTER
  // -----------------------------
  const filteredData = useMemo(() => {
    if (filter === "repacking") {
      return data.filter((d) => d.repacking > 0);
    }
    return data;
  }, [data, filter]);

  // -----------------------------
  // COLUMNS
  // -----------------------------
  const columns = [
    {
      title: "SL No",
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Item Name",
      dataIndex: "item_name",
    },
    {
      title: "Sellable",
      dataIndex: "sellable",
    },
    {
      title: "Scrap",
      dataIndex: "scrap",
    },
    {
      title: "Repacking",
      dataIndex: "repacking",
    },
    {
      title: "Total",
      render: (_, r) => r.sellable + r.scrap + r.repacking,
    },
    {
      title: "Actions",
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(r)}>
            Edit
          </Button>

          {r.repacking > 0 && (
            <Button size="small" onClick={() => handlePrint(r)}>
              Print
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // -----------------------------
  // PRINT
  // -----------------------------
  const handlePrint = (record) => {
    message.info(
      `Print barcode for ${record.item_name} (Qty: ${record.repacking})`,
    );
  };

  const thStyle = {
    border: "1px solid #f0f0f0",
    padding: 8,
    background: "#fafafa",
    fontWeight: 600,
  };

  const tdStyle = {
    border: "1px solid #f0f0f0",
    padding: 8,
  };

  const tdLabel = {
    ...tdStyle,
    textAlign: "left",
    fontWeight: 600,
  };

  const finalStyle = {
    ...tdStyle,
    background: "#f6ffed",
    fontWeight: 600,
  };

  const diffStyle = {
    color: "green",
    marginLeft: 6,
    fontSize: 12,
  };

  return (
    <div style={{ padding: 16 }}>
      <Card>
        <Title level={4}>Complaint Department</Title>

        {/* INPUT */}
        <Row gutter={12}>
          <Col span={8}>
            <Text strong>Item</Text>
            <Select
              showSearch={{
                optionFilterProp: "label",
                filterOption: (input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
              placeholder="Select Item"
              value={selectedItem}
              onChange={setSelectedItem}
              style={{ width: "100%", marginTop: 4 }}
              options={items.map((i) => ({
                value: i.id,
                label: i.item_name,
              }))}
            />
          </Col>

          <Col span={4}>
            <Text strong>Sellable</Text>
            <InputNumber
              value={sellable}
              onChange={(v) => setSellable(v || 0)}
              style={{ width: "100%", marginTop: 4 }}
            />
          </Col>

          <Col span={4}>
            <Text strong>Scrap</Text>
            <InputNumber
              value={scrap}
              onChange={(v) => setScrap(v || 0)}
              style={{ width: "100%", marginTop: 4 }}
            />
          </Col>

          <Col span={4}>
            <Text strong>Repacking</Text>
            <InputNumber
              value={repacking}
              onChange={(v) => setRepacking(v || 0)}
              style={{ width: "100%", marginTop: 4 }}
            />
          </Col>

          <Col span={4}>
            <Text strong>Total</Text>
            <Button
              type="primary"
              block
              loading={saving}
              onClick={handleSave}
              style={{ marginTop: 4 }}
            >
              {editingId ? `UPDATE (${totalQty})` : `ADD (${totalQty})`}
            </Button>
          </Col>
        </Row>

        {/* FILTER */}
        <div style={{ marginTop: 16 }}>
          <Segmented
            options={[
              { label: "All", value: "all" },
              { label: "Repacking", value: "repacking" },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {/* TABLE */}
        <Table
          style={{ marginTop: 16 }}
          dataSource={filteredData}
          columns={columns}
          loading={loading}
          rowKey="key"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            onChange: (page, size) =>
              setPagination({ current: page, pageSize: size }),
          }}
        />
      </Card>

      <Modal
        open={duplicateModal}
        title="Merge with Existing Entry"
        onCancel={() => setDuplicateModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setDuplicateModal(false)}>
            Cancel
          </Button>,
          <Button
            key="merge"
            type="primary"
            onClick={() => handleFinalSave(pendingPayload, true)}
          >
            Merge Quantities
          </Button>,
        ]}
      >
        {existingEntry && pendingPayload && (
          <div style={{ marginTop: 12 }}>
            {/* ================= TABLE ================= */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "center",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}></th>
                  <th style={thStyle}>Existing</th>
                  <th style={thStyle}>New</th>
                  <th style={thStyle}>Final</th>
                </tr>
              </thead>

              <tbody>
                {/* SELLABLE */}
                <tr>
                  <td style={tdLabel}>Sellable</td>

                  <td style={tdStyle}>{existingEntry.sellable || 0}</td>

                  <td style={tdStyle}>
                    {pendingPayload.sellable || 0}
                    {pendingPayload.sellable > 0 && (
                      <span style={diffStyle}>
                        (+{pendingPayload.sellable})
                      </span>
                    )}
                  </td>

                  <td style={finalStyle}>
                    {(existingEntry.sellable || 0) +
                      (pendingPayload.sellable || 0)}
                  </td>
                </tr>

                {/* SCRAP */}
                <tr>
                  <td style={tdLabel}>Scrap</td>

                  <td style={tdStyle}>{existingEntry.scrap || 0}</td>

                  <td style={tdStyle}>
                    {pendingPayload.scrap || 0}
                    {pendingPayload.scrap > 0 && (
                      <span style={diffStyle}>(+{pendingPayload.scrap})</span>
                    )}
                  </td>

                  <td style={finalStyle}>
                    {(existingEntry.scrap || 0) + (pendingPayload.scrap || 0)}
                  </td>
                </tr>

                {/* REPACKING */}
                <tr>
                  <td style={tdLabel}>Repacking</td>

                  <td style={tdStyle}>{existingEntry.repacking || 0}</td>

                  <td style={tdStyle}>
                    {pendingPayload.repacking || 0}
                    {pendingPayload.repacking > 0 && (
                      <span style={diffStyle}>
                        (+{pendingPayload.repacking})
                      </span>
                    )}
                  </td>

                  <td style={finalStyle}>
                    {(existingEntry.repacking || 0) +
                      (pendingPayload.repacking || 0)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ================= STOCK IMPACT ================= */}
            <div style={{ marginTop: 20 }}>
              <Text strong>Stock Impact Preview</Text>

              <div style={{ marginTop: 10 }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "center",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}></th>
                      <th style={thStyle}>Before</th>
                      <th style={thStyle}>After</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td style={tdLabel}>Sellable Stock</td>
                      <td style={tdStyle}>{existingEntry.sellable || 0}</td>
                      <td style={finalStyle}>
                        {(existingEntry.sellable || 0) +
                          (pendingPayload.sellable || 0)}
                      </td>
                    </tr>

                    <tr>
                      <td style={tdLabel}>Scrap Stock</td>
                      <td style={tdStyle}>{existingEntry.scrap || 0}</td>
                      <td style={finalStyle}>
                        {(existingEntry.scrap || 0) +
                          (pendingPayload.scrap || 0)}
                      </td>
                    </tr>

                    <tr>
                      <td style={tdLabel}>Repacking Queue</td>
                      <td style={tdStyle}>{existingEntry.repacking || 0}</td>
                      <td style={finalStyle}>
                        {(existingEntry.repacking || 0) +
                          (pendingPayload.repacking || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 10 }}>
                <Text type="secondary">
                  This shows how complaint processing will affect stock
                  allocation.
                </Text>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
