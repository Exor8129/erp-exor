import React, { useState, useEffect } from "react";
import { Modal, Button, Spin, message, Divider } from "antd";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import { supabase } from "../lib/supabase";

// Generates barcode image with crisp, standard 1D thermal label parameters
const generateBarcodeImage = (container) => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const barcodeValue = container.barcode;

    JsBarcode(canvas, barcodeValue, {
      format: "CODE128",
      displayValue: false, // Number is rendered as vector text in jsPDF for cleaner print
      height: 40,
      width: 2,
      margin: 0,
    });

    resolve(canvas.toDataURL("image/png"));
  });
};

// Standardized single label layout renderer for 100mm x 50mm thermal labels
const drawLabelPage = async (pdf, container, grnNo, boxIndex = 1, totalBoxes = 1) => {
  const barcodeImage = await generateBarcodeImage(container);

  // Outer border boundary (2mm inset)
  pdf.rect(2, 2, 96, 46);

  // Header / GRN Number (Top-Left)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(grnNo || "GRN Label", 6, 8);

  // Small Box Count Indicator (Top-Right Corner for quick clarification)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139); // Slate-500 tint
  pdf.text(`BOX: ${boxIndex}/${totalBoxes}`, 94, 8, { align: "right" });
  pdf.setTextColor(0, 0, 0); // Reset back to default black

  // Metadata
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Barcode ID: ${container.barcode}`, 6, 13);

  // 70mm width x 25mm height centered horizontally on a 100mm label (x = (100 - 70) / 2 = 15)
  pdf.addImage(barcodeImage, "PNG", 15, 16, 70, 25);

  // Human-readable Barcode Text centered directly below bars
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(container.barcode, 50, 44, { align: "center" });
};

export default function BarcodeLabelModal({
  visible,
  onClose,
  grnId,
  labelType, // 'master', 'split', or 'master-ind'
  boxCount = 1,
  singleBarcode = null, // Used specifically for 'master-ind' workflow
  notes,
}) {
  const [loading, setLoading] = useState(false);
  const [containers, setContainers] = useState([]);
  const [fetchedGrnNo, setFetchedGrnNo] = useState("");
  const [boxesReceived, setBoxesReceived] = useState(0);
  const [caseType, setCaseType] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (visible && grnId) {
      fetchGrnDetails(grnId);
      caseSwitch(labelType);
    } else {
      setContainers([]);
      setFetchedGrnNo("");
      setPdfUrl(null);
    }
  }, [visible, grnId, labelType]);

  useEffect(() => {
    if (visible && fetchedGrnNo) {
      if (labelType === "master") {
        handleMasterWorkflow();
      } else if (labelType === "split") {
        handleSplitWorkflow(boxCount);
      } else if (labelType === "master-ind") {
        handleIndividualWorkflow();
      }
    }
  }, [visible, fetchedGrnNo, labelType, boxCount, singleBarcode]);

  const fetchGrnDetails = async (id) => {
    try {
      const { data, error } = await supabase
        .schema("purchase")
        .from("grn")
        .select("grn_no, boxes_received")
        .eq("id", id)
        .single();

      if (error) throw error;
      setFetchedGrnNo(data?.grn_no);
      setBoxesReceived(data?.boxes_received);
    } catch (error) {
      console.error("Error fetching GRN:", error);
      message.error("Could not fetch GRN details");
    }
  };

  const caseSwitch = (type) => {
    if (type === "master") setCaseType("Master Carton");
    else if (type === "split") setCaseType("Split Carton");
    else if (type === "master-ind") setCaseType("Individual Master Carton");
    else setCaseType("Unknown");
  };

  const handleMasterWorkflow = async () => {
    setLoading(true);
    try {
      let { data: existingContainers, error: fetchError } = await supabase
        .schema("purchase")
        .from("containers")
        .select("id, barcode, status, grn_id")
        .eq("grn_id", grnId);

      if (fetchError) throw fetchError;

      const masterContainers = (existingContainers || []).filter(
        (c) => c.barcode && c.barcode.startsWith("MST-")
      );

      if (masterContainers.length === 0) {
        const newContainersPayload = [];
        for (let i = 1; i <= boxCount; i++) {
          const paddedNumber = String(i).padStart(3, "0");
          newContainersPayload.push({
            grn_id: grnId,
            barcode: `MST-${fetchedGrnNo}-${paddedNumber}`,
            status: "PENDING",
          });
        }

        const { data: insertedData, error: insertError } = await supabase
          .schema("purchase")
          .from("containers")
          .insert(newContainersPayload)
          .select();

        if (insertError) throw insertError;

        const freshMaster = insertedData.filter(
          (c) => c.barcode && c.barcode.startsWith("MST-")
        );
        setContainers(freshMaster);
        await generatePDFPreview(freshMaster);
      } else {
        setContainers(masterContainers);
        await generatePDFPreview(masterContainers);
      }
    } catch (err) {
      console.error(err);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitWorkflow = async (count) => {
    if (!fetchedGrnNo || fetchedGrnNo.trim() === "") {
      message.error("GRN Number is missing.");
      return;
    }

    setLoading(true);
    try {
      const { data: existingContainers, error } = await supabase
        .schema("purchase")
        .from("containers")
        .select("id, barcode, status, grn_id")
        .eq("grn_id", grnId);

      if (error) throw error;

      const splitContainers = (existingContainers || []).filter((c) => {
        if (!c.barcode) return false;
        const parts = c.barcode.split("-");
        return parts[0] === "SPT" && c.barcode.includes(fetchedGrnNo);
      });

      let startNumber = 1;
      if (splitContainers.length > 0) {
        const latestBarcode = Math.max(
          ...splitContainers.map((c) => {
            const parts = c.barcode.split("-");
            return parseInt(parts[parts.length - 1], 10);
          })
        );
        startNumber = latestBarcode + 1;
      }

      const newEntries = [];
      for (let i = 0; i < count; i++) {
        const currentNumber = startNumber + i;
        const paddedNextNumber = currentNumber.toString().padStart(3, "0");
        const nextBarcode = `SPT-${fetchedGrnNo}-${paddedNextNumber}`;

        newEntries.push({
          grn_id: grnId,
          barcode: nextBarcode,
          status: "PENDING",
          notes: notes,
        });
      }

      const { data: insertedData, error: insertError } = await supabase
        .schema("purchase")
        .from("containers")
        .insert(newEntries)
        .select();

      if (insertError) throw insertError;

      setContainers(insertedData);
      await generatePDFPreview(insertedData);
      message.success(`${count} split labels generated.`);
    } catch (error) {
      console.error("Error:", error);
      message.error("Could not process split labels");
    } finally {
      setLoading(false);
    }
  };

  const handleIndividualWorkflow = async () => {
    if (!singleBarcode) {
      message.error("No barcode provided for individual printing.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema("purchase")
        .from("containers")
        .select("id, barcode, status, grn_id")
        .eq("grn_id", grnId)
        .eq("barcode", singleBarcode)
        .single();

      if (error) throw error;

      if (!data) {
        message.error("Container barcode not found in database.");
        setContainers([]);
        return;
      }

      const targetList = [data];
      setContainers(targetList);
      await generatePDFPreview(targetList);
    } catch (err) {
      console.error("Error handling individual container workflow:", err);
      message.error("Could not fetch target container details.");
    } finally {
      setLoading(false);
    }
  };

  const generatePDFPreview = async (containerList) => {
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [50, 100],
      });

      const total = containerList.length;

      for (let i = 0; i < total; i++) {
        if (i > 0) pdf.addPage([50, 100], "landscape");
        await drawLabelPage(pdf, containerList[i], fetchedGrnNo, i + 1, total);
      }

      const blob = pdf.output("blob");
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Preview generation error:", err);
      message.error("Failed to generate label preview.");
    }
  };

  const handlePrint = async () => {
    try {
      setLoading(true);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [50, 100],
      });

      const total = containers.length;

      for (let i = 0; i < total; i++) {
        if (i > 0) pdf.addPage([50, 100], "landscape");
        await drawLabelPage(pdf, containers[i], fetchedGrnNo, i + 1, total);
      }

      const containerIds = containers.map((c) => c.id);
      await supabase
        .schema("purchase")
        .from("containers")
        .update({
          printed: true,
          printed_at: new Date().toISOString(),
        })
        .in("id", containerIds);

      message.success("Labels updated & sent to printer.");
      pdf.autoPrint();
      window.open(pdf.output("bloburl"), "_blank");
      onClose();
    } catch (err) {
      console.error(err);
      message.error("Printing failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Print Barcode Labels (${labelType?.toUpperCase()}) — ${fetchedGrnNo}`}
      open={visible}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="back" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={!containers.length}
          onClick={handlePrint}
        >
          Print Labels
        </Button>,
      ]}
    >
      <div style={{ marginBottom: "10px" }}>
        <span>
          Box Type: <strong>{caseType}</strong>
        </span>{" "}
        |
        <span style={{ marginLeft: "15px" }}>
          GRN No: <strong>{fetchedGrnNo}</strong>
        </span>{" "}
        |
        {labelType === "master-ind" ? (
          <span style={{ marginLeft: "15px" }}>
            Target Barcode: <strong>{singleBarcode}</strong>
          </span>
        ) : (
          <span style={{ marginLeft: "15px" }}>
            Boxes Count: <strong>{boxCount}</strong>
          </span>
        )}
      </div>

      <Divider style={{ margin: "10px 0" }} />

      <Spin spinning={loading} tip="Processing containers & preview...">
        <div style={{ width: "100%", height: "400px", background: "#f5f5f5" }}>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Label Preview"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                color: "#8c8c8c",
              }}
            >
              {!loading && "No containers generated or found for preview"}
            </div>
          )}
        </div>
      </Spin>
    </Modal>
  );
}