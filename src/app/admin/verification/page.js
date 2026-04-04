"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import {
  Card,
  Row,
  Col,
  Table,
  Typography,
  Tag,
  Select,
  Input,
  Modal,
  InputNumber,
  message,
  Tabs,
  Badge,
  Button,
} from "antd";

const { Text } = Typography;
const { confirm } = Modal;

export default function VerificationPage() {
  const [cycleId, setCycleId] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [lastSync, setLastSync] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [pinnedItems, setPinnedItems] = useState([]);

  const [sortConfig, setSortConfig] = useState({
    field: "sl_no",
    order: "asc", // "asc" | "desc"
  });

  const [filters, setFilters] = useState({
    team: null,
    status: null,
  });

  const [resolution, setResolution] = useState({
    sellable: 0,
  });

  // -----------------------------
  // STATUS LOGIC
  // -----------------------------
  const getItemStatus = (units) => {
    if (units.every((u) => u.status === "gdl_updated")) return "gdl_updated";
    if (units.every((u) => u.status === "verified")) return "verified";
    if (units.every((u) => u.status === "submitted")) return "submitted";

    // ✅ treat editable as pending
    if (units.some((u) => u.status === "editable")) return "pending";

    return "pending";
  };

  useEffect(() => {
    if (!cycleId) return;

    let isFetching = false;

    const interval = setInterval(async () => {
      if (document.hidden) return; // ⛔ pause if tab inactive
      if (isFetching) return;

      isFetching = true;
      await fetchInventory(cycleId, false); // 👈 only updates
      isFetching = false;
    }, 2000); // ✅ 2 sec (safe + fast)

    return () => clearInterval(interval);
  }, [cycleId]);

  //// -----------------------------
  // CONFIRMATION DIALOGS
  // -----------------------------

  const showConfirm = ({ title, content, onOk }) => {
    confirm({
      title,
      content,
      okText: "Yes",
      cancelText: "No",
      okType: "primary",
      centered: true,
      onOk,
    });
  };

  const handleEditBatchConfirm = (record) => {
    confirm({
      title: "Edit Batch",
      content: `Unlock this batch for editing?`,
      okText: "Yes",
      cancelText: "Cancel",
      centered: true,

      onOk: () => handleEditBatch(record),
    });
  };

  const handleVerifyConfirm = () => {
    confirm({
      title: "Confirm Verification",
      content: `Are you sure you want to verify "${selectedProduct?.item_name}"?`,
      okText: "Yes, Verify",
      cancelText: "Cancel",
      okType: "primary",
      centered: true,

      onOk: () => handleVerify(),
    });
  };

  const handleRecountConfirm = () => {
    confirm({
      title: "Confirm Recount",
      content: `⚠️ This will reset all counted data for "${selectedProduct?.item_name}".
This action cannot be undone.`,
      okText: "Yes, Reset",
      cancelText: "Cancel",
      okType: "danger",
      centered: true,

      onOk: () => {
        return handleRecount(); // ✅ call your existing function
      },
    });
  };

  // -----------------------------
  // FETCH CYCLES
  // -----------------------------
  const fetchCycles = async () => {
    const { data } = await supabase
      .from("count_cycles")
      .select("id")
      .order("id", { ascending: false });

    setCycles(data || []);
  };

  // -----------------------------
  // FETCH INVENTORY
  // -----------------------------

  const fetchInventory = async (selectedCycleId, isInitial = false) => {
    if (!selectedCycleId) return;

    try {
      let allData = [];
      let from = 0;
      const pageSize = 500; // 🔥 important

      while (true) {
        let query = supabase
          .from("cycle_items")
          .select(
            `
      id,
      item_id,
      sl_no,
      status,
      sys_batch_no,
      count_batch_no,
      sys_quantity,
      count_quantity,
      updated_at,
      rate,
      item_master (item_name),
      teams (username, team_leader)
    `,
          )
          .eq("cycle_id", selectedCycleId)
          .range(from, from + pageSize - 1);

        // incremental only after first load
        if (!isInitial && lastSync) {
          query = query.gt("updated_at", lastSync);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) break;

        allData = [...allData, ...data];

        if (data.length < pageSize) break;

        from += pageSize;
      }

      // -----------------------------
      // Complaint Data (only if changes)
      // -----------------------------
      const { data: complaintData } = await supabase
        .from("complaint_item")
        .select("item_id, sellable, repacking")
        .eq("status", "pending");

      const complaintMap = (complaintData || []).reduce((acc, curr) => {
        const total = Number(curr.sellable || 0) + Number(curr.repacking || 0);

        acc[curr.item_id] = (acc[curr.item_id] || 0) + total;

        return acc;
      }, {});
      // -----------------------------
      // MERGE WITH EXISTING PRODUCTS
      // -----------------------------
      setProducts((prev) => {
        const map = new Map();

        prev.forEach((p) => {
          map.set(p.id, {
            ...p,
            systemUnits: [...p.systemUnits],
            teams: new Set(p.teams || []),
          });
        });

        allData.forEach((curr) => {
          const itemId = curr.item_id;

          let existing = map.get(itemId);

          if (!existing) {
            existing = {
              id: itemId,
              sl_no: curr.sl_no,
              item_name: curr.item_master?.item_name,
              systemUnits: [],
              teams: new Set(),
              complaintQty: complaintMap[itemId] || 0,
            };
          }

          // 🔥 REPLACE unit instead of push
          const index = existing.systemUnits.findIndex((u) => u.id === curr.id);

          if (index >= 0) {
            existing.systemUnits[index] = curr;
          } else {
            existing.systemUnits.push(curr);
          }

          if (curr.teams) {
            existing.teams.add(curr.teams.username || curr.teams.team_leader);
          }

          existing.complaintQty = complaintMap[itemId] || 0;

          map.set(itemId, existing);
        });

        return Array.from(map.values()).map((item) => ({
          ...item,
          status: getItemStatus(item.systemUnits),
          teams: Array.from(item.teams),
        }));
      });

      setLastSync(new Date().toISOString());
    } catch (err) {
      console.error(err);
      message.error("Error loading data");
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const getValueColor = (value) => {
    if (value > 0) return "success"; // green
    if (value < 0) return "danger"; // red
    return "secondary"; // gray (or "success" if you want green for zero)
  };

  // -----------------------------
  // FILTERING
  // -----------------------------
  const filteredItems = useMemo(() => {
    let data = [...products];

    // -----------------------------
    // TAB FILTER (status)
    // -----------------------------
    if (activeTab !== "all") {
      data = data.filter((p) => p.status === activeTab);
    }

    // -----------------------------
    // SEARCH FILTER
    // -----------------------------
    if (searchText) {
      const text = searchText.toLowerCase();

      data = data.filter(
        (p) =>
          p.item_name?.toLowerCase().includes(text) ||
          p.sl_no?.toString().toLowerCase().includes(text) ||
          p.teams?.some((t) => t.toLowerCase().includes(text)),
      );
    }

    // -----------------------------
    // EXTRA FILTERS
    // -----------------------------
    if (filters.team) {
      data = data.filter((p) => p.teams?.includes(filters.team));
    }

    if (filters.status) {
      data = data.filter((p) => p.status === filters.status);
    }

    // -----------------------------
    // 🔥 REMOVE duplicates with pinned
    // -----------------------------
    const nonPinnedData = data.filter(
      (d) => !pinnedItems.some((p) => p.id === d.id),
    );

    // -----------------------------
    // SORTING HELPERS
    // -----------------------------
    const getSysQty = (r) =>
      r.systemUnits.reduce((s, u) => s + Number(u.sys_quantity || 0), 0);

    const getCountQty = (r) =>
      r.systemUnits.reduce((s, u) => s + Number(u.count_quantity || 0), 0) +
      Number(r.complaintQty || 0);

    const getDiff = (r) => getCountQty(r) - getSysQty(r);

    const getPL = (r) => {
      const rate = r.systemUnits[0]?.rate || 0;
      return getDiff(r) * rate;
    };

    // -----------------------------
    // SORT FUNCTION
    // -----------------------------
    const sortFn = (a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortConfig.field) {
        case "sl_no":
          valA = Number(a.sl_no);
          valB = Number(b.sl_no);
          break;

        case "diff":
          valA = getDiff(a);
          valB = getDiff(b);
          break;

        case "pl":
          valA = getPL(a);
          valB = getPL(b);
          break;

        default:
          return 0;
      }

      if (sortConfig.order === "asc") return valA - valB;
      return valB - valA;
    };

    // -----------------------------
    // APPLY SORTING
    // -----------------------------
    let sortedData = [...nonPinnedData];

    if (sortConfig.field) {
      sortedData.sort(sortFn);
    }

    // -----------------------------
    // FINAL MERGE (PINNED ON TOP)
    // -----------------------------
    const finalData = [...pinnedItems, ...sortedData];

    return finalData;
  }, [products, activeTab, searchText, filters, sortConfig, pinnedItems]);

  // -----------------------------
  // BATCH GROUPING
  // -----------------------------

  const currentProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProduct?.id);
  }, [products, selectedProduct]);

  const batchData = useMemo(() => {
    if (!currentProduct) return [];

    const grouped = currentProduct.systemUnits.reduce((acc, curr) => {
      const batch = curr.count_batch_no || curr.sys_batch_no || "NO BATCH";

      if (!acc[batch]) {
        acc[batch] = { batch, sys: 0, count: 0, ids: [], isEditable: false };
      }

      acc[batch].sys += Number(curr.sys_quantity || 0);
      acc[batch].count += Number(curr.count_quantity || 0);
      acc[batch].ids.push(curr.id);

      if (curr.status === "editable") {
        acc[batch].isEditable = true;
      }

      return acc;
    }, {});

    return Object.values(grouped)
      .map((b) => {
        const safeSys = Math.abs(b.sys); // ✅ FIX

        return {
          ...b,
          diff: b.count - safeSys, // ✅ FIXED CALCULATION
        };
      })
      .filter((b) => !(b.sys === 0 && b.count === 0));
  }, [currentProduct]);

  // -----------------------------
  // TABLE COLUMNS
  // -----------------------------
  const columns = [
    {
      title: "Sl No",
      dataIndex: "sl_no",
      width: 80,
    },
    {
      title: "Item Name",
      dataIndex: "item_name",
    },
    {
      title: "Counted By",
      render: (_, r) => r.teams?.map((t, i) => <Tag key={i}>{t}</Tag>) || "-",
    },
    {
      title: "System Qty",
      render: (_, r) =>
        r.systemUnits.reduce((s, u) => s + Number(u.sys_quantity || 0), 0),
    },
    {
      title: "Counted Qty",
      render: (_, r) =>
        r.systemUnits.reduce((s, u) => s + Number(u.count_quantity || 0), 0),
    },
    {
      title: "Complaints",
      dataIndex: "complaintQty",
    },
    {
      title: "Difference",
      render: (_, r) => {
        const sys = r.systemUnits.reduce(
          (s, u) => s + Number(u.sys_quantity || 0),
          0,
        );

        const count = r.systemUnits.reduce(
          (s, u) => s + Number(u.count_quantity || 0),
          0,
        );
        // const adjustedSys = Math.abs(sys);
        // const diff = count + (r.complaintQty || 0) - adjustedSys;
        const diff = count + (r.complaintQty || 0) - sys;

        return <Text type={getValueColor(diff)}>{diff}</Text>;
      },
    },
    {
      title: "Rate",
      render: (_, r) => r.systemUnits[0]?.rate || 0,
    },

    {
      title: "System Value",
      render: (_, r) => {
        const rate = r.systemUnits[0]?.rate || 0;

        const sysQty = r.systemUnits.reduce(
          (s, u) => s + Number(u.sys_quantity || 0),
          0,
        );

        return (sysQty * rate).toFixed(2);
      },
    },

    {
      title: "Count Value",
      render: (_, r) => {
        const rate = r.systemUnits[0]?.rate || 0;

        const countQty =
          r.systemUnits.reduce((s, u) => s + Number(u.count_quantity || 0), 0) +
          Number(r.complaintQty || 0);

        return (countQty * rate).toFixed(2);
      },
    },

    {
      title: "P/L",
      render: (_, r) => {
        const rate = r.systemUnits[0]?.rate || 0;

        const sysQty = r.systemUnits.reduce(
          (s, u) => s + Number(u.sys_quantity || 0),
          0,
        );

        const countQty =
          r.systemUnits.reduce((s, u) => s + Number(u.count_quantity || 0), 0) +
          Number(r.complaintQty || 0);

        const diffValue = (countQty - sysQty) * rate;

        return (
          <Text strong type={getValueColor(diffValue)}>
            ₹ {diffValue.toFixed(2)}
          </Text>
        );
      },
    },
    {
      title: "Pin",
      render: (_, record) => {
        const isPinned = pinnedItems.some((p) => p.id === record.id);

        return (
          <Button
            size="small"
            type={isPinned ? "default" : "primary"}
            onClick={(e) => {
              e.stopPropagation();

              if (isPinned) {
                setPinnedItems((prev) =>
                  prev.filter((p) => p.id !== record.id),
                );
              } else {
                setPinnedItems((prev) => [...prev, record]);
              }
            }}
          >
            {isPinned ? "Unpin" : "📌 Pin"}
          </Button>
        );
      },
    },
  ];

  const statusCounts = useMemo(() => {
    const counts = {
      all: products.length,
      pending: 0,
      submitted: 0,
      verified: 0,
      gdl_updated: 0,
    };

    products.forEach((p) => {
      if (counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    });

    return counts;
  }, [products]);

  const summary = useMemo(() => {
    let systemValue = 0;
    let countedValue = 0;
    let gain = 0;
    let loss = 0;

    filteredItems.forEach((r) => {
      const rate = r.systemUnits[0]?.rate || 0;

      const sysQty = r.systemUnits.reduce(
        (s, u) => s + Number(u.sys_quantity || 0),
        0,
      );

      const countQty =
        r.systemUnits.reduce((s, u) => s + Number(u.count_quantity || 0), 0) +
        Number(r.complaintQty || 0);

      const sysVal = sysQty * rate;
      const countVal = countQty * rate;
      const diff = countVal - sysVal;

      systemValue += sysVal;
      countedValue += countVal;

      if (diff > 0) gain += diff;
      if (diff < 0) loss += Math.abs(diff);
    });

    return {
      systemValue,
      countedValue,
      net: countedValue - systemValue,
      gain,
      loss,
    };
  }, [filteredItems]);

  const isFinal = statusCounts.pending === 0 && statusCounts.submitted === 0;

  const handleVerify = async () => {
    try {
      if (!selectedProduct) {
        message.error("No product selected");
        return;
      }

      // -----------------------------
      // 1️⃣ VERIFY ONLY NON-VERIFIED ITEMS
      // -----------------------------
      const { error: verifyError } = await supabase
        .from("cycle_items")
        .update({ status: "verified" })
        .eq("item_id", selectedProduct.id)
        .eq("cycle_id", cycleId)
        .neq("status", "verified"); // ✅ IMPORTANT

      if (verifyError) throw verifyError;

      // -----------------------------
      // 2️⃣ HANDLE COMPLAINT STOCK
      // -----------------------------
      const complaintQty = Number(selectedProduct.complaintQty || 0);

      if (complaintQty > 0) {
        const rate = selectedProduct.systemUnits[0]?.rate || 0;

        const { error: insertError } = await supabase
          .from("cycle_items")
          .insert([
            {
              cycle_id: cycleId,
              item_id: selectedProduct.id,
              sl_no: selectedProduct.sl_no,

              // 🔥 SYSTEM ENTRY
              status: "verified", // ✅ keep consistent
              count_batch_no: "COMPLAINT",

              count_quantity: complaintQty,
              rate: rate,

              team_id: 7, // complaint team
            },
          ]);

        if (insertError) throw insertError;

        // -----------------------------
        // 3️⃣ UPDATE COMPLAINT STATUS
        // -----------------------------
        const { error: complaintError } = await supabase
          .from("complaint_item")
          .update({
            status: "processed",
            updated_at: new Date().toISOString(),
          })
          .eq("item_id", selectedProduct.id)
          .eq("status", "pending");

        if (complaintError) throw complaintError;
      }

      // -----------------------------
      // SUCCESS
      // -----------------------------
      message.success("Verified & complaint adjusted");

      setModalOpen(false);
      fetchInventory(cycleId, true);
    } catch (err) {
      console.error(err);
      message.error("Verification failed");
    }
  };

  const handleRecount = async () => {
    try {
      setLoading(true);

      // 1️⃣ Remove complaint-generated entries
      const { error: deleteError } = await supabase
        .from("cycle_items")
        .delete()
        .eq("cycle_id", cycleId)
        .eq("item_id", selectedProduct.id)
        .eq("count_batch_no", "COMPLAINT");

      if (deleteError) throw deleteError;

      // 2️⃣ Reset cycle items
      const { error: updateError } = await supabase
        .from("cycle_items")
        .update({
          status: "recount",
          count_quantity: null,
        })
        .eq("cycle_id", cycleId)
        .eq("item_id", selectedProduct.id);

      if (updateError) throw updateError;

      // 3️⃣ Reset complaints (if already processed)
      const { error: complaintError } = await supabase
        .from("complaint_item")
        .update({ status: "pending" })
        .eq("item_id", selectedProduct.id)
        .eq("status", "processed");

      if (complaintError) throw complaintError;

      message.success("Recount initiated");

      setModalOpen(false);
      fetchInventory(cycleId, true);
    } catch (err) {
      console.error(err);
      message.error("Recount failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEditBatch = async (record) => {
    try {
      // 🔥 STEP 1: CHECK if already editable in DB
      const { data: existing, error: checkError } = await supabase
        .from("cycle_items")
        .select("id")
        .in("id", record.ids)
        .eq("status", "editable");

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        message.warning("⚠️ This batch is already under editing");
        return; // ⛔ STOP duplicate approval
      }

      // 🔥 STEP 2: UPDATE only if safe
      const { error } = await supabase
        .from("cycle_items")
        .update({ status: "editable" })
        .in("id", record.ids)
        .neq("status", "editable"); // extra safety

      if (error) throw error;

      message.success("Batch set to editable");

      await fetchInventory(cycleId, true);

      // refresh selected product
      setSelectedProduct((prev) => {
        if (!prev) return prev;
        const updated = products.find((p) => p.id === prev.id);
        return updated || prev;
      });
    } catch (err) {
      console.error(err);
      message.error("Failed to update batch");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Card>
        {/* SELECT CYCLE */}
        <Select
          style={{ width: "100%", marginBottom: 12 }}
          placeholder="Select Cycle"
          value={cycleId}
          onChange={(val) => {
            setCycleId(val);
            setProducts([]);
            setLastSync(null);
            fetchInventory(val, true); // 👈 full load
          }}
          options={cycles.map((c) => ({
            value: c.id,
            label: `Cycle #${c.id}`,
          }))}
        />

        {/* FILTER */}
        <Row gutter={10} style={{ marginBottom: 10 }}>
          <Col span={24}>
            <Input
              placeholder="Search Item / Team"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
        </Row>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          style={{ marginBottom: 12 }}
          items={[
            {
              key: "all",
              label: (
                <span>
                  {" "}
                  All{" "}
                  <Badge
                    count={statusCounts.all}
                    color="brown"
                    overflowCount={Number.MAX_SAFE_INTEGER}
                  ></Badge>
                </span>
              ),
            },
            {
              key: "pending",
              label: (
                <span>
                  Pending{" "}
                  <Badge
                    count={statusCounts.pending}
                    color="Red"
                    overflowCount={Number.MAX_SAFE_INTEGER}
                  ></Badge>
                </span>
              ),
            },
            {
              key: "submitted",
              label: (
                <span>
                  Finished Counting{" "}
                  <Badge
                    count={statusCounts.submitted}
                    color="orange"
                    overflowCount={Number.MAX_SAFE_INTEGER}
                  ></Badge>
                </span>
              ),
            },
            {
              key: "verified",
              label: (
                <span>
                  Verified{" "}
                  <Badge
                    count={statusCounts.verified}
                    color="green"
                    overflowCount={Number.MAX_SAFE_INTEGER}
                  ></Badge>
                </span>
              ),
            },
            {
              key: "gdl_updated",
              label: (
                <span>
                  GDL Updated
                  <Badge
                    count={statusCounts.gdl_updated}
                    overflowCount={Number.MAX_SAFE_INTEGER}
                  ></Badge>
                </span>
              ),
            },
          ]}
        />
        <Row gutter={10} style={{ marginBottom: 10 }}>
          <Col span={8}>
            <Select
              placeholder="Filter by Team"
              allowClear
              style={{ width: "100%" }}
              onChange={(val) => setFilters((prev) => ({ ...prev, team: val }))}
              options={[...new Set(products.flatMap((p) => p.teams || []))].map(
                (t) => ({ label: t, value: t }),
              )}
            />
          </Col>

          <Col span={8}>
            <Select
              placeholder="Sort By"
              allowClear
              style={{ width: "100%" }}
              onChange={(val) =>
                setSortConfig((prev) => ({
                  ...prev,
                  field: val,
                }))
              }
              options={[
                { label: "Sl No", value: "sl_no" },
                { label: "Difference", value: "diff" },
                { label: "P/L", value: "pl" },
              ]}
            />
          </Col>

          <Col span={8}>
            <Select
              placeholder="Order"
              allowClear
              style={{ width: "100%" }}
              onChange={(val) =>
                setSortConfig((prev) => ({
                  ...prev,
                  order: val,
                }))
              }
              options={[
                { label: "Ascending", value: "asc" },
                { label: "Descending", value: "desc" },
              ]}
            />
          </Col>
        </Row>

        <Button
          onClick={() => {
            setFilters({ team: null, status: null });

            // ✅ Default sorting applied
            setSortConfig({
              field: "sl_no",
              order: "asc",
            });

            setSearchText("");
            setActiveTab("all");
          }}
        >
          Reset Filters
        </Button>
        <Button
          onClick={() => setPinnedItems([])}
          disabled={pinnedItems.length === 0}
        >
          Clear Pins
        </Button>

        {/* TABLE */}
        <Table
          dataSource={filteredItems}
          rowKey="id"
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowClassName={(record) =>
    pinnedItems.some((p) => p.id === record.id) ? "pinned-row" : ""
  }
          onRow={(record) => ({
            onClick: () => {
              // // ✅ allow only these statuses
              // if (!["submitted", "verified"].includes(record.status)) {
              //   message.warning("Complete counting before opening details");
              //   return;
              // }

              setSelectedProduct(record);
              setResolution({ sellable: 0 });
              setModalOpen(true);
            },
          })}
        />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div
          style={{
            background: isFinal ? "#f6ffed" : "#fffbe6",
            border: isFinal ? "1px solid #b7eb8f" : "1px solid #ffe58f",
            padding: "10px 12px",
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          <Text strong type={isFinal ? "success" : "warning"}>
            {isFinal ? "✅ Finalized Data" : "⚠️ Provisional Data"}
          </Text>

          <div style={{ fontSize: 12, color: "#666" }}>
            {isFinal
              ? "All items are counted. This P/L reflects final inventory valuation."
              : "P/L is based only on counted items. Complete counting for accurate final results."}
          </div>
        </div>
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <div>System Stock Value</div>
              <Text strong>₹ {summary.systemValue.toFixed(2)}</Text>
            </Card>
          </Col>

          <Col span={6}>
            <Card size="small">
              <div>Physical Stock Value</div>
              <Text strong>₹ {summary.countedValue.toFixed(2)}</Text>
            </Card>
          </Col>

          <Col span={6}>
            <Card size="small">
              <div>Total Gain</div>
              <Text type="success" strong>
                ₹ {summary.gain.toFixed(2)}
              </Text>
            </Card>
          </Col>

          <Col span={6}>
            <Card size="small">
              <div>Total Loss</div>
              <Text type="danger" strong>
                ₹ {summary.loss.toFixed(2)}
              </Text>
            </Card>
          </Col>
        </Row>

        <Card size="small" style={{ marginTop: 12 }}>
          <div style={{ fontSize: 16 }}>
            Net Inventory P/L:{" "}
            <Text strong type={getValueColor(summary.net)}>
              ₹ {summary.net.toFixed(2)}
            </Text>
          </div>

          <div style={{ marginTop: 6, color: "#888" }}>
            {summary.net >= 0
              ? "Extra stock found (Inventory Gain)"
              : "Stock shortage detected (Inventory Loss)"}
          </div>
        </Card>
      </Card>

      {/* MODAL */}
      <Modal
        title={selectedProduct?.item_name}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={900}
        footer={[
          <Button
            key="recount"
            disabled={["all", "pending"].includes(activeTab)}
            onClick={handleRecountConfirm}
          >
            🔁 Recount
          </Button>,

          <Button
            key="verify"
            type="primary"
            onClick={handleVerifyConfirm}
            disabled={
              selectedProduct?.status === "verified" ||
              ["all", "pending"].includes(activeTab)
            }
          >
            ✅ Verify
          </Button>,
        ]}
      >
        {selectedProduct && (
          <>
            {/* SUMMARY */}
            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col span={6}>
                <Card size="small">
                  System:
                  <div>
                    {selectedProduct.systemUnits.reduce(
                      (s, u) => s + Number(u.sys_quantity || 0),
                      0,
                    )}
                  </div>
                </Card>
              </Col>

              <Col span={6}>
                <Card size="small">
                  Count:
                  <div>
                    {selectedProduct.systemUnits.reduce(
                      (s, u) => s + Number(u.count_quantity || 0),
                      0,
                    )}
                  </div>
                </Card>
              </Col>

              <Col span={6}>
                <Card size="small">
                  Complaint:
                  <div>{selectedProduct.complaintQty}</div>
                </Card>
              </Col>

              <Col span={6}>
                <Card size="small">
                  Diff:
                  <div>
                    {selectedProduct.systemUnits.reduce(
                      (s, u) => s + Number(u.count_quantity || 0),
                      0,
                    ) +
                      (selectedProduct.complaintQty || 0) -
                      selectedProduct.systemUnits.reduce(
                        (s, u) => s + Number(u.sys_quantity || 0),
                        0,
                      )}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* BATCH TABLE */}
            <Table
              dataSource={batchData}
              rowKey="batch"
              pagination={false}
              size="small"
              columns={[
                { title: "Batch", dataIndex: "batch" },
                { title: "System", dataIndex: "sys" },
                { title: "Count", dataIndex: "count" },
                {
                  title: "Diff",
                  dataIndex: "diff",
                  render: (d) => <Text type={getValueColor(d)}>{d}</Text>,
                },
                {
                  title: "Actions",
                  render: (_, record) => {
                    const isVerified = selectedProduct?.status === "verified";

                    return (
                      <Button
                        size="small"
                        type={
                          isVerified
                            ? "default"
                            : record.isEditable
                              ? "default"
                              : "primary"
                        }
                        danger={record.isEditable}
                        disabled={
                          !["all", "pending"].includes(activeTab) ||
                          record.isEditable ||
                          isVerified
                        }
                        onClick={() => handleEditBatchConfirm(record)}
                      >
                        {isVerified
                          ? "🔒 No Edit (Verified)"
                          : record.isEditable
                            ? "⚠️ Already Editable"
                            : "✏️ Edit"}
                      </Button>
                    );
                  },
                },
              ]}
            />

            {/* RESOLUTION */}
            {/* <Card size="small" style={{ marginTop: 12 }}>
              Sellable:
              <InputNumber
                min={0}
                value={resolution.sellable}
                onChange={(v) => setResolution({ sellable: v || 0 })}
                style={{ width: "100%" }}
              />
              <div style={{ marginTop: 8 }}>
                Total: <b>{resolution.sellable}</b> /{" "}
                {selectedProduct.complaintQty}
              </div>
            </Card> */}
          </>
        )}
      </Modal>
    </div>
  );
}
