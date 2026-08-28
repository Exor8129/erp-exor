"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Table,
  Button,
  Tag,
  Space,
  Card,
  Typography,
  message,
  Empty,
  Drawer,
  Descriptions,
  Divider,
  Progress,
} from "antd";
import {
  SyncOutlined,
  BugOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import { supabase } from "../../lib/supabase";

const { Text, Title } = Typography;

const COMPARE_FIELDS = [
  { dbField: "item_name", tallyField: "itemName", label: "Name" },
  { dbField: "hsn", tallyField: "hsn", label: "HSN" },
  { dbField: "tax", tallyField: "tax", label: "Tax" },
];

const SyncManager = () => {
  const [dbItems, setDbItems] = useState([]);
  const [tallyXmlResponse, setTallyXmlResponse] = useState("");
  const [tallyServerUrl] = useState("http://127.0.0.1:9000");

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [, setStatusMessage] = useState("Initializing...");

  // Inspector Drawer State
  const [debugDrawerVisible, setDebugDrawerVisible] = useState(false);
  const [dbItemIndex, setDbItemIndex] = useState(0);

  // Sync All State
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  // ---------- Parse Tally XML ----------
  const parseTallyXml = useCallback((xmlString) => {
    if (!xmlString || !xmlString.trim()) return [];

    try {
      const cleanedXml = xmlString.replace(/&#\d+;/g, "");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(cleanedXml, "text/xml");
      const stockItemNodes = xmlDoc.getElementsByTagName("STOCKITEM");
      const items = [];

      Array.from(stockItemNodes).forEach((node) => {
        const itemName =
          node.getAttribute("NAME") ||
          node.getElementsByTagName("NAME")[0]?.textContent?.trim() ||
          "";

        const guid = (node.getElementsByTagName("GUID")[0]?.textContent || "")
          .trim()
          .toLowerCase();

        const alterIdRaw =
          node.getElementsByTagName("ALTERID")[0]?.textContent || "0";
        const alterId = parseInt(alterIdRaw.trim(), 10) || 0;

        const masterId =
          node.getElementsByTagName("MASTERID")[0]?.textContent?.trim() || "";

        let hsn = "";
        const hsnList = node.getElementsByTagName("HSNDETAILS.LIST");
        if (hsnList.length > 0) {
          const latestHsnNode = hsnList[hsnList.length - 1];
          hsn = (
            latestHsnNode.getElementsByTagName("HSNCODE")[0]?.textContent || ""
          ).trim();
        } else {
          hsn = (
            node.getElementsByTagName("HSNCODE")[0]?.textContent || ""
          ).trim();
        }

        let tax = "";
        let cgst = 0;
        let sgst = 0;

        const gstDetailsList = node.getElementsByTagName("GSTDETAILS.LIST");
        const activeGstNode =
          gstDetailsList.length > 0
            ? gstDetailsList[gstDetailsList.length - 1]
            : node;

        const rateDetailNodes =
          activeGstNode.getElementsByTagName("RATEDETAILS.LIST");

        Array.from(rateDetailNodes).forEach((rateNode) => {
          const dutyHead = (
            rateNode.getElementsByTagName("GSTRATEDUTYHEAD")[0]?.textContent ||
            ""
          )
            .trim()
            .toUpperCase();

          const rateVal =
            parseFloat(
              (
                rateNode.getElementsByTagName("GSTRATE")[0]?.textContent || "0"
              ).trim()
            ) || 0;

          if (dutyHead === "IGST" && rateVal > 0) {
            tax = rateVal.toString();
          } else if (dutyHead === "CGST") {
            cgst = rateVal;
          } else if (dutyHead === "SGST/UTGST" || dutyHead === "SGST") {
            sgst = rateVal;
          }
        });

        if (!tax && (cgst > 0 || sgst > 0)) {
          tax = (cgst + sgst).toString();
        }

        const uom =
          node.getElementsByTagName("BASEUNITS")[0]?.textContent?.trim() || "";

        items.push({
          itemName,
          guid,
          alterId,
          masterId,
          hsn,
          tax,
          uom,
        });
      });

      return items;
    } catch (e) {
      console.error("XML Parsing Exception:", e);
      return [];
    }
  }, []);

  // Compute parsed items list from XML
  const parsedTallyItems = useMemo(() => {
    return parseTallyXml(tallyXmlResponse);
  }, [tallyXmlResponse, parseTallyXml]);

  // ---------- Fetch DB Records & Request Full Tally Data ----------
  const runAutoSync = useCallback(async () => {
    setLoading(true);
    setStatusMessage("Fetching database records starting from item #1...");

    try {
      const PAGE_SIZE = 1000;
      let fetchedDbItems = [];
      let from = 0;

      while (true) {
        const { data: page, error: dbError } = await supabase
          .from("item_master")
          .select("*")
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (dbError) throw new Error(`DB Fetch Error: ${dbError.message}`);
        if (!page) throw new Error("No data returned from database");

        fetchedDbItems = fetchedDbItems.concat(page);
        if (page.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      setDbItems(fetchedDbItems);
      setStatusMessage(
        `Loaded ${fetchedDbItems.length} items from DB. Querying Tally...`
      );

      const response = await fetch("/api/tally/tally-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tallyUrl: tallyServerUrl,
          maxAlterId: 0,
        }),
      });

      const responseText = await response.text();
      let result;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid JSON response. HTTP ${response.status}`);
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch from Tally server");
      }

      setTallyXmlResponse(result.xml);
      setStatusMessage("Full database comparison ready!");
    } catch (err) {
      console.error("Sync error:", err);
      setStatusMessage(`Error: ${err.message}`);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tallyServerUrl]);

  useEffect(() => {
    runAutoSync();
  }, [runAutoSync]);

  // ---------- Build Database-First Comparison List ----------
  const dbComparisonList = useMemo(() => {
    const tallyMapByGuid = new Map();
    parsedTallyItems.forEach((item) => {
      if (item.guid) {
        tallyMapByGuid.set(String(item.guid).trim().toLowerCase(), item);
      }
    });

    return dbItems.map((dbRecord, index) => {
      const normalizedGuid = String(dbRecord.guid || "").trim().toLowerCase();
      const tallyMatch = tallyMapByGuid.get(normalizedGuid);

      const issues = [];
      if (tallyMatch) {
        COMPARE_FIELDS.forEach(({ dbField, tallyField, label }) => {
          const dbVal = String(dbRecord[dbField] ?? "").trim();
          const tallyVal = String(tallyMatch[tallyField] ?? "").trim();

          if (tallyVal === "") return;

          if (dbVal === "") {
            issues.push({
              field: label,
              type: "Missing in DB",
              dbValue: dbVal,
              tallyValue: tallyVal,
            });
          } else if (dbVal !== tallyVal) {
            issues.push({
              field: label,
              type: "Mismatch",
              dbValue: dbVal,
              tallyValue: tallyVal,
            });
          }
        });
      }

      return {
        dbIndex: index + 1,
        dbRecord,
        tallyMatch,
        hasIssues: issues.length > 0,
        alterIdDiff: tallyMatch
          ? Number(tallyMatch.alterId) !== Number(dbRecord.alter_id)
          : false,
        issues,
      };
    });
  }, [dbItems, parsedTallyItems]);

  // Sync single item
  const handleSyncItems = async (itemsToSync) => {
    if (itemsToSync.length === 0) return;
    setSyncing(true);

    try {
      const upsertPayload = itemsToSync.map((item) => ({
        guid: item.tallyMatch.guid,
        item_name: item.tallyMatch.itemName,
        alter_id: item.tallyMatch.alterId,
        hsn: item.tallyMatch.hsn,
        tax: item.tallyMatch.tax,
        status: true,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("item_master")
        .upsert(upsertPayload, { onConflict: "guid" });

      if (error) throw new Error(error.message);

      message.success(`Successfully synced ${itemsToSync.length} item(s)!`);
      await runAutoSync();
    } catch (err) {
      console.error("Database Sync Error:", err);
      message.error(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Sync All Function using Batched Upserts
  const handleSyncAll = async () => {
    if (!parsedTallyItems || parsedTallyItems.length === 0) return;

    setIsSyncingAll(true);
    setSyncProgress({ current: 0, total: parsedTallyItems.length });

    const BATCH_SIZE = 50; // Increased batch size for optimal Supabase payload throughput
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < parsedTallyItems.length; i += BATCH_SIZE) {
      const batch = parsedTallyItems.slice(i, i + BATCH_SIZE);

      const upsertPayload = batch.map((item) => ({
        guid: item.guid,
        item_name: item.itemName,
        alter_id: item.alterId,
        hsn: item.hsn,
        tax: item.tax,
        status: true,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("item_master")
        .upsert(upsertPayload, { onConflict: "guid" });

      if (error) {
        console.error("Batch sync error:", error);
        failureCount += batch.length;
      } else {
        successCount += batch.length;
      }

      const currentCompleted = Math.min(i + BATCH_SIZE, parsedTallyItems.length);
      setSyncProgress({ current: currentCompleted, total: parsedTallyItems.length });
    }

    setIsSyncingAll(false);
    message.info(`Sync Complete. Success: ${successCount}, Failed: ${failureCount}`);
    await runAutoSync();
  };

  const openInspectorAtIndex = (index) => {
    setDbItemIndex(index);
    setDebugDrawerVisible(true);
  };

  const activeInspection = dbComparisonList[dbItemIndex];

  return (
    <Card
      style={{ maxWidth: 1200, margin: "24px auto 48px auto" }}
      styles={{ body: { padding: 24 } }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Tally Sync Manager
          </Title>
          <Text type="secondary">
            Total Database Records: <Text code>{dbItems.length}</Text> | Tally Items Parsed:{" "}
            <Text code>{parsedTallyItems.length}</Text>
          </Text>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            onClick={handleSyncAll}
            loading={isSyncingAll}
            disabled={parsedTallyItems.length === 0}
          >
            Sync All Tally Items ({parsedTallyItems.length})
          </Button>
          <Button
            icon={<BugOutlined />}
            onClick={() => openInspectorAtIndex(0)}
            disabled={dbComparisonList.length === 0}
          >
            Inspect DB #1
          </Button>
          <Button
            icon={<SyncOutlined spin={loading} />}
            onClick={runAutoSync}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Sync All Progress Bar */}
      {isSyncingAll && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Syncing Tally data to Supabase ({syncProgress.current} / {syncProgress.total})...
          </Text>
          <Progress
            percent={Math.round((syncProgress.current / syncProgress.total) * 100)}
            status="active"
          />
        </div>
      )}

      {/* Main Table */}
      <Table
        dataSource={dbComparisonList}
        rowKey={(r) => r.dbRecord.id}
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="small"
        bordered
        columns={[
          {
            title: "#",
            dataIndex: "dbIndex",
            width: 60,
          },
          {
            title: "Database Product Name",
            key: "item_name",
            render: (_, r, idx) => (
              <a
                onClick={(e) => {
                  e.preventDefault();
                  openInspectorAtIndex(idx);
                }}
              >
                <Text strong style={{ color: "#1677ff" }}>
                  {r.dbRecord.item_name}
                </Text>
              </a>
            ),
          },
          {
            title: "GUID",
            dataIndex: ["dbRecord", "guid"],
            width: 220,
            render: (g) => (
              <Text code style={{ fontSize: 11 }}>
                {g}
              </Text>
            ),
          },
          {
            title: "DB AlterID vs Tally",
            key: "alterId",
            width: 180,
            render: (_, r) =>
              r.tallyMatch ? (
                <span>
                  <Text>{r.dbRecord.alter_id}</Text> ➔{" "}
                  <Text strong type={r.alterIdDiff ? "warning" : "success"}>
                    {r.tallyMatch.alterId}
                  </Text>
                </span>
              ) : (
                <Tag color="red">Not Found in Tally XML</Tag>
              ),
          },
          {
            title: "Status / Differences",
            key: "status",
            render: (_, r) =>
              !r.tallyMatch ? (
                <Tag color="default">Missing in Tally</Tag>
              ) : r.issues.length > 0 ? (
                <Tag color="volcano">{r.issues.length} Mismatch(es)</Tag>
              ) : (
                <Tag color="green">In Sync</Tag>
              ),
          },
          {
            title: "Inspect",
            key: "action",
            width: 80,
            render: (_, __, idx) => (
              <Button
                type="link"
                icon={<BugOutlined />}
                onClick={() => openInspectorAtIndex(idx)}
              />
            ),
          },
        ]}
      />

      {/* ---------- INSPECTOR DRAWER ---------- */}
      <Drawer
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingRight: 24,
            }}
          >
            <span>Database Inspector</span>
            {dbComparisonList.length > 0 && (
              <Tag color="blue">
                Item {dbItemIndex + 1} of {dbComparisonList.length}
              </Tag>
            )}
          </div>
        }
        width={650}
        open={debugDrawerVisible}
        onClose={() => setDebugDrawerVisible(false)}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Space>
              <Button
                icon={<StepBackwardOutlined />}
                disabled={dbItemIndex === 0}
                onClick={() => setDbItemIndex((prev) => prev - 1)}
              >
                Previous
              </Button>
              <Button
                icon={<StepForwardOutlined />}
                disabled={dbItemIndex >= dbComparisonList.length - 1}
                onClick={() => setDbItemIndex((prev) => prev + 1)}
              >
                Next
              </Button>
            </Space>

            {activeInspection?.tallyMatch && (
              <Button
                type="primary"
                loading={syncing}
                onClick={() => handleSyncItems([activeInspection])}
              >
                Sync Current Item
              </Button>
            )}
          </div>
        }
      >
        {activeInspection ? (
          <div>
            <Title level={4} style={{ marginBottom: 4 }}>
              #{activeInspection.dbIndex}. {activeInspection.dbRecord.item_name}
            </Title>
            <Text code style={{ fontSize: 12 }}>
              GUID: {activeInspection.dbRecord.guid}
            </Text>

            <Divider style={{ margin: "16px 0" }} />

            <Card
              size="small"
              title="Status Summary"
              style={{ marginBottom: 16, background: "#fafafa" }}
            >
              {!activeInspection.tallyMatch ? (
                <Tag color="red">No matching record in Tally XML</Tag>
              ) : activeInspection.issues.length === 0 ? (
                <Tag color="green">Fully Matches Tally</Tag>
              ) : (
                <Space direction="vertical" style={{ width: "100%" }}>
                  {activeInspection.issues.map((issue, i) => (
                    <div key={i} style={{ fontSize: 13 }}>
                      <strong>{issue.field}:</strong>{" "}
                      <Text delete type="danger">
                        {issue.dbValue || "(empty)"}
                      </Text>{" "}
                      ➔ <Text type="success">{issue.tallyValue}</Text>
                    </div>
                  ))}
                </Space>
              )}
            </Card>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Card size="small" title="Database Record">
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Name">
                    {activeInspection.dbRecord.item_name || "(empty)"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Alter ID">
                    {activeInspection.dbRecord.alter_id}
                  </Descriptions.Item>
                  <Descriptions.Item label="HSN">
                    {activeInspection.dbRecord.hsn || "(empty)"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tax">
                    {activeInspection.dbRecord.tax || "(empty)"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card size="small" title="Tally Match Output">
                {activeInspection.tallyMatch ? (
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Name">
                      {activeInspection.tallyMatch.itemName || "(empty)"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Alter ID">
                      {activeInspection.tallyMatch.alterId}
                    </Descriptions.Item>
                    <Descriptions.Item label="HSN">
                      {activeInspection.tallyMatch.hsn || "(empty)"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Tax">
                      {activeInspection.tallyMatch.tax || "(empty)"}
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Text type="secondary">Not found in Tally XML response</Text>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <Empty description="No database items found" />
        )}
      </Drawer>
    </Card>
  );
};

export default SyncManager;