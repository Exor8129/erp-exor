"use client";

import React, { useState, useEffect } from "react";
import {
  Input,
  Card,
  Space,
  Typography,
  Table,
  Tag,
  Button,
  message,
  Segmented,
} from "antd";
import { SearchOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { supabase } from "../../../lib/supabase";
import InboundProcessModal from "../components/grn/InboundProcessModal";
import jsPDF from "jspdf";
import bwipjs from "bwip-js";
import { updateGrnTableStatus } from "../../../lib/services/grnTableStatusUpdate";

const { Title, Text } = Typography;

// Custom Centered Loader Wrapper Component
const CardioLoader = () => {
  useEffect(() => {
    async function registerLoader() {
      const { cardio } = await import("ldrs");
      cardio.register();
    }
    registerLoader();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 0",
        width: "100%",
      }}
    >
      <l-cardio size="50" stroke="4" speed="2" color="#1677ff" />
    </div>
  );
};

export default function InboundManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [grnList, setGrnList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);

  // Fetch GRNs joined with public.vendors using vendor_name
  // Fetch GRNs joined with vendors and purchase_orders safely
  const fetchGrns = async (query = "") => {
    setLoading(true);

    try {
      // 1. Fetch GRNs with proper CSV formatting (comma added after created_at)
      let grnQuery = supabase
        .schema("purchase")
        .from("grn")
        .select(
          `
        id,
        grn_no,
        supplier_id,
        po_id,
        invoice_no,
        boxes_received,
        received_date,
        transporter_name,
        vehicle_number,
        status,
        notes,
        created_at
      `,
        )
        .order("created_at", { ascending: false });

      if (query.trim()) {
        grnQuery = grnQuery.or(
          `grn_no.ilike.%${query}%,invoice_no.ilike.%${query}%`,
        );
      }

      const { data: grns, error: grnError } = await grnQuery;

      if (grnError) throw grnError;

      if (!grns || grns.length === 0) {
        setGrnList([]);
        return;
      }

      // 2. Collect IDs for manual relational lookup (prevents PostgREST cross-schema FK errors)
      const supplierIds = [
        ...new Set(grns.map((g) => g.supplier_id).filter(Boolean)),
      ];
      const poIds = [...new Set(grns.map((g) => g.po_id).filter(Boolean))];

      // 3. Fetch Vendors (from public schema) & Purchase Orders (from purchase schema) concurrently
      const [vendorsRes, posRes] = await Promise.all([
        supplierIds.length > 0
          ? supabase
              .from("vendors")
              .select("id, vendor_name")
              .in("id", supplierIds)
          : { data: [] },
        poIds.length > 0
          ? supabase
              .schema("purchase")
              .from("purchase_orders")
              .select("id, po_number")
              .in("id", poIds)
          : { data: [] },
      ]);

      if (vendorsRes.error) throw vendorsRes.error;
      if (posRes.error) throw posRes.error;

      // 4. Create lookup maps
      const vendorMap = {};
      (vendorsRes.data || []).forEach((v) => {
        vendorMap[v.id] = v.vendor_name;
      });

      const poMap = {};
      (posRes.data || []).forEach((p) => {
        poMap[p.id] = p.po_number;
      });

      // 5. Merge data cleanly
      const finalData = grns.map((grn) => ({
        ...grn,
        vendor_name: vendorMap[grn.supplier_id] || "-",
        po_number: poMap[grn.po_id] || "-",
      }));

      setGrnList(finalData);
      console.log("GRN STATUS:", grns[2]?.status);
    } catch (err) {
      console.error(err);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchGrns();
  }, []);

  // Handle Search submit
  const handleSearch = (value) => {
    fetchGrns(value);
  };

  const filteredData =
    statusFilter === "all"
      ? grnList
      : grnList.filter((item) => item.status?.toLowerCase() === "pending");

const handleProcessInbound = async (record) => {
  console.log(record);

  const { success, error } = await updateGrnTableStatus(
    record.id,
    "Inbound Processing"
  );

  if (!success) {
    message.error(
      "Failed to update GRN status: " +
        (error?.message || "Unknown error")
    );
    return;
  }

  // Refresh GRN list so the new status appears immediately
  await fetchGrns(searchTerm);

  // Now open inbound modal
  setSelectedGRN({
    ...record,
    status: "Inbound Processing",
  });

  setModalOpen(true);
};

  // Table Columns aligned with purchase.grn + public.vendors
  const columns = [
    {
      title: "GRN Number",
      dataIndex: "grn_no",
      key: "grn_no",
      render: (text) => (
        <Text strong style={{ color: "#1677ff" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Supplier Name",
      dataIndex: "vendor_name",
      key: "supplier_name",
      render: (name) => name || <Text type="secondary">—</Text>,
    },
    {
      title: "Invoice No",
      dataIndex: "invoice_no",
      key: "invoice_no",
      render: (text) => text || <Text type="secondary">—</Text>,
    },
    {
      title: "Boxes Received",
      dataIndex: "boxes_received",
      key: "boxes_received",
      width: 140,
      align: "center",
      render: (boxes) => <Tag color="blue">{boxes ?? 0} Boxes</Tag>,
    },
    {
      title: "Transporter",
      dataIndex: "transporter_name",
      key: "transporter_name",
      render: (text) => text || <Text type="secondary">—</Text>,
    },
    {
      title: "Received Date",
      dataIndex: "received_date",
      key: "received_date",
      width: 130,
      render: (date) => (date ? new Date(date).toLocaleDateString() : "—"),
    },
    {
  title: "Status",
  dataIndex: "status",
  key: "status",
  width: 120,
  align: "center",
  render: (status) => {
    const statusConfig = {
      Pending: {
        color: "orange",
        label: "Pending",
      },
      RECEIVED: {
        color: "green",
        label: "Received",
      },
      PROCESSING: {
        color: "blue",
        label: "Processing",
      },
      CANCELLED: {
        color: "red",
        label: "Cancelled",
      },
    };

    const config = statusConfig[status] || {
      color: "default",
      label: status || "Unknown",
    };

    return <Tag color={config.color}>{config.label}</Tag>;
  },
    },
    {
      title: "Action",
      key: "action",
      width: 150,
      align: "center",
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<ArrowRightOutlined />}
          onClick={() => handleProcessInbound(record)}
        >
          Start Inbound
        </Button>
      ),
    },
  ];

  const generateBarcode = async (barcodeText) => {
    const canvas = document.createElement("canvas");

    bwipjs.toCanvas(canvas, {
      bcid: "code128", // Barcode type
      text: barcodeText, // Existing barcode from DB
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: "center",
    });

    return canvas.toDataURL("image/png");
  };

  const handlePrintLabels = async (grn) => {
    try {
      // Fetch containers
      const { data: containers, error } = await supabase
        .schema("purchase")
        .from("containers")
        .select(
          `
        id,
        container_code,
        barcode,
        container_type
      `,
        )
        .eq("grn_id", grn.id)
        .order("container_code");

      if (error) throw error;

      if (!containers.length) {
        message.warning("No containers found for this GRN.");
        return;
      }

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [50, 100], // Height, Width (mm)
      });

      for (let i = 0; i < containers.length; i++) {
        const container = containers[i];

        // Every label after the first goes on a new page
        if (i > 0) {
          pdf.addPage([50, 100], "landscape");
        }

        const barcodeImage = await generateBarcode(container.barcode);

        // Optional border
        pdf.rect(2, 2, 96, 46);

        // GRN
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(grn.grn_no, 5, 8);

        // Container
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.text(`Container : ${container.container_code}`, 5, 15);

        // Type
        pdf.text(`Type : ${container.container_type}`, 5, 21);

        // Barcode
        pdf.addImage(barcodeImage, "PNG", 5, 24, 90, 16);

        // Barcode text
        pdf.setFontSize(10);
        pdf.text(container.barcode, 25, 45);
      }

      // Mark containers as printed
      await supabase
        .schema("purchase")
        .from("containers")
        .update({
          printed: true,
          printed_at: new Date().toISOString(),
        })
        .eq("grn_id", grn.id);

      pdf.autoPrint();
      window.open(pdf.output("bloburl"));

      message.success("Labels generated successfully.");
    } catch (err) {
      console.error(err);
      message.error(err.message);
    }
  };

  return (
    <div
      style={{
        padding: "24px",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {/* Header & Search Card */}
        <Card variant={false} style={{ width: "100%" }}>
          <Space orientation="vertical" size="small" style={{ width: "100%" }}>
            <Title level={3} style={{ marginBottom: 0 }}>
              Inbound Receiving & Inspection
            </Title>
            <Text type="secondary">
              Search for a Goods Receipt Note (GRN) or scan a container barcode
              to process items.
            </Text>

            {/* Right-aligned Compact Search Input */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                width: "100%",
                marginTop: 8,
              }}
            >
              <Input.Search
                placeholder="Search GRN / Invoice..."
                allowClear
                enterButton="Search"
                size="small"
                prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={handleSearch}
                style={{ width: "100%", maxWidth: 280 }}
              />
            </div>
          </Space>
        </Card>

        {/* GRN Database Table Card */}
        <Card
          title="Goods Receipt Notes (GRN)"
          variant={false}
          style={{ width: "100%" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end", // or "flex-start"
              marginBottom: 16,
            }}
          >
            <Segmented
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: "All", value: "all" },
                { label: "Pending", value: "pending" },
                { label: "Inbound", value: "Inbound" },
                { label: "Completed", value: "Completed" },
              ]}
            />
          </div>
          {loading ? (
            <CardioLoader />
          ) : (
            <Table
              dataSource={filteredData}
              columns={columns}
              rowKey="id"
              size="small"
              scroll={{ y: 350 }}
              pagination={{ pageSize: 10 }}
              bordered
            />
          )}
        </Card>
      </Space>

      <InboundProcessModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedGRN(null);
        }}
        grn={selectedGRN}
        onPrintLabels={handlePrintLabels}
      />
    </div>
  );
}
