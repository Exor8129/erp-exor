"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import {
  Card,
  Row,
  Col,
  Tabs,
  Table,
  Typography,
  Tag,
  Button,
  Divider,
  message,
  Select,
  Badge,
} from "antd";

const { Text, Title } = Typography;

export default function VerificationPage() {
  const [cycleId, setCycleId] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // STATUS COLORS
  // -----------------------------
  const statusColors = {
    pending: "#faad14",
    submitted: "#1677ff",
    verified: "#52c41a",
    gdl_updated: "#722ed1",
    all: "#595959",
  };

  // -----------------------------
  // STATUS CALCULATION
  // -----------------------------
  const getItemStatus = (units) => {
    if (units.every((u) => u.status === "gdl_updated")) return "gdl_updated";
    if (units.every((u) => u.status === "verified")) return "verified";
    if (units.every((u) => u.status === "submitted")) return "submitted";
    return "pending";
  };

  // -----------------------------
  // FETCH CYCLES
  // -----------------------------
  const fetchCycles = async () => {
    const { data, error } = await supabase
      .from("count_cycles")
      .select("id, created_at")
      .order("id", { ascending: false });

    if (!error) setCycles(data || []);
  };

  // -----------------------------
  // FETCH INVENTORY
  // -----------------------------
  const fetchInventory = async (selectedCycleId) => {
    if (!selectedCycleId) return;

    setLoading(true);

    try {
      let allData = [];
      let from = 0;
      const limit = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("cycle_items")
          .select(
            `
                    id,
                    cycle_id,
                    item_id,
                    status,
                    sys_batch_no,
                    sys_quantity,
                    count_batch_no,
                    count_quantity,
                    team_id,
                    item_master (
                      id,
                      item_name,
                      sl_no
                    ),
                    teams (
                      id,
                      team_leader,
                      username
                    )
                  `,
          )
          .eq("cycle_id", selectedCycleId)
          .range(from, from + limit - 1);

        if (error) throw error;

        allData = [...allData, ...data];
        if (data.length < limit) break;
        from += limit;
      }

      // GROUPING
      const grouped = allData.reduce((acc, curr) => {
        const itemId = curr.item_id;

        if (!acc[itemId]) {
          acc[itemId] = {
            ...curr.item_master,
            cycle_id: curr.cycle_id,
            systemUnits: [],
            teams: new Set(), // 👈 track teams
          };
        }

        acc[itemId].systemUnits.push(curr);

        // collect team names
        if (curr.teams) {
          acc[itemId].teams.add(curr.teams.username || curr.teams.team_leader);
        }

        return acc;
      }, {});

      const finalData = Object.values(grouped).map((item) => ({
        ...item,
        status: getItemStatus(item.systemUnits),
        teams: item.teams ? Array.from(item.teams) : [],
      }));

      setProducts(finalData);
    } catch (err) {
      console.error(err);
      message.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  // -----------------------------
  // COUNTS
  // -----------------------------
  const counts = useMemo(() => {
    return {
      all: products.length,
      pending: products.filter((p) => p.status === "pending").length,
      submitted: products.filter((p) => p.status === "submitted").length,
      verified: products.filter((p) => p.status === "verified").length,
      gdl_updated: products.filter((p) => p.status === "gdl_updated").length,
    };
  }, [products]);

  // -----------------------------
  // TAB LABEL
  // -----------------------------
  const getTabLabel = (key, label, count) => {
    const color = statusColors[key];

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: activeTab === key ? color : undefined,
          fontWeight: activeTab === key ? 600 : 400,
        }}
      >
        {label}
        {count > 0 && (
          <Badge
            count={count}
            overflowCount={999999}
            size="small"
            style={{ backgroundColor: color }}
          />
        )}
      </span>
    );
  };

  // -----------------------------
  // FILTER
  // -----------------------------
  const filteredItems = useMemo(() => {
    if (activeTab === "all") return products;
    return products.filter((p) => p.status === activeTab);
  }, [products, activeTab]);

  // -----------------------------
  // VERIFY
  // -----------------------------
  const handleVerify = async () => {
    await supabase
      .from("cycle_items")
      .update({ status: "verified" })
      .eq("cycle_id", cycleId)
      .eq("item_id", selectedProduct.id);

    message.success("Verified");
    fetchInventory(cycleId);
  };

  // -----------------------------
  // GDL UPDATE
  // -----------------------------
  const handleGDLUpdate = async () => {
    await supabase
      .from("cycle_items")
      .update({ status: "gdl_updated" })
      .eq("cycle_id", cycleId)
      .eq("item_id", selectedProduct.id);

    message.success("GDL Updated");
    fetchInventory(cycleId);
  };

  // -----------------------------
  // TOTALS
  // -----------------------------
  const totals = useMemo(() => {
    if (!selectedProduct) return { sys: 0, count: 0, diff: 0 };

    const sys = selectedProduct.systemUnits.reduce(
      (s, u) => s + Number(u.sys_quantity || 0),
      0,
    );

    const count = selectedProduct.systemUnits.reduce(
      (s, u) => s + Number(u.count_quantity || 0),
      0,
    );

    return { sys, count, diff: count - sys };
  }, [selectedProduct]);

  return (
    <div style={{ padding: 16 }}>
      <Card>
        {/* ---------------- SELECT CYCLE ---------------- */}
        <div style={{ marginBottom: 16 }}>
          <Text strong>Select Cycle</Text>
          <Select
            style={{ width: "100%", marginTop: 8 }}
            placeholder="Select Cycle → Load Data"
            value={cycleId}
            onChange={(val) => {
              setCycleId(val);
              setSelectedProduct(null);
              fetchInventory(val);
            }}
            options={cycles.map((c) => ({
              value: c.id,
              label: `Cycle #${c.id}`,
            }))}
          />
        </div>

        {/* ---------------- TABS ---------------- */}
        <Tabs
          activeKey={activeTab}
          onChange={(k) => {
            setActiveTab(k);
            setSelectedProduct(null);
          }}
          items={[
            { key: "all", label: getTabLabel("all", "All", counts.all) },
            {
              key: "pending",
              label: getTabLabel("pending", "Pending", counts.pending),
            },
            {
              key: "submitted",
              label: getTabLabel("submitted", "Submitted", counts.submitted),
            },
            {
              key: "verified",
              label: getTabLabel("verified", "Verified", counts.verified),
            },
            {
              key: "gdl_updated",
              label: getTabLabel(
                "gdl_updated",
                "GDL Updated",
                counts.gdl_updated,
              ),
            },
          ]}
        />

        {/* ---------------- TABLE ---------------- */}

        <div
          style={{
            height: "500px", // 👈 control this height
            overflowY: "auto",
            border: "1px solid #f0f0f0",
            borderRadius: 8,
          }}
        >
          <Table
            dataSource={filteredItems}
            rowKey="id"
            size="small"
            pagination={false}
            loading={loading}
            onRow={(r) => ({
              onClick: () => setSelectedProduct(r),
            })}
            columns={[
              {
                title: "Item",
                dataIndex: "item_name",
              },
              activeTab === "submitted"
                ? {
                    title: "Submitted By",
                    render: (_, r) => (
                      <>
                        {r.teams.length > 0
                          ? r.teams.map((t, i) => (
                              <Tag key={i} color="blue">
                                {t}
                              </Tag>
                            ))
                          : "-"}
                      </>
                    ),
                  }
                : {
                    title: "Status",
                    render: (_, r) => (
                      <Tag color={statusColors[r.status]}>
                        {r.status.toUpperCase()}
                      </Tag>
                    ),
                  },
            ]}
          />
        </div>

        {/* ---------------- DETAILS BELOW TABLE ---------------- */}
        <Divider />

        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: "#fff",
            paddingTop: 10,
            marginTop: 10,
            borderTop: "1px solid #f0f0f0",
            zIndex: 10,
          }}
        >
          {selectedProduct ? (
            <>
              <Title level={5}>{selectedProduct.item_name}</Title>

              <Row style={{ fontWeight: 600, marginBottom: 10 }}>
                <Col span={6}>Batch</Col>
                <Col span={4}>System</Col>
                <Col span={4}>Count</Col>
                <Col span={4}>Diff</Col>
              </Row>

              {selectedProduct.systemUnits.map((u) => {
                const diff =
                  Number(u.count_quantity || 0) - Number(u.sys_quantity || 0);

                return (
                  <Row key={u.id} style={{ marginBottom: 6 }}>
                    <Col span={6}>{u.count_batch_no || u.sys_batch_no}</Col>
                    <Col span={4}>{u.sys_quantity}</Col>
                    <Col span={4}>{u.count_quantity}</Col>
                    <Col span={4}>
                      <Text type={diff === 0 ? "success" : "danger"}>
                        {diff}
                      </Text>
                    </Col>
                  </Row>
                );
              })}

              <Divider />

              <Row gutter={16}>
                <Col span={8}>
                  <Card size="small">
                    <Text>System</Text>
                    <div>{totals.sys}</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <Text>Count</Text>
                    <div>{totals.count}</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <Text>Difference</Text>
                    <div>{totals.diff}</div>
                  </Card>
                </Col>
              </Row>

              <Divider />

              <Row gutter={10}>
                <Col span={12}>
                  <Button
                    type="primary"
                    block
                    onClick={handleVerify}
                    disabled={selectedProduct.status !== "submitted"}
                  >
                    VERIFY
                  </Button>
                </Col>

                <Col span={12}>
                  <Button
                    block
                    onClick={handleGDLUpdate}
                    disabled={selectedProduct.status !== "verified"}
                  >
                    GDL UPDATE
                  </Button>
                </Col>
              </Row>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Text type="secondary">Select an item to verify</Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
