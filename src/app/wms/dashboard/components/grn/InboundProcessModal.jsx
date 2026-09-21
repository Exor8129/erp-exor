"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal, Descriptions, Tag, Button, Steps, message } from "antd";
import {
  PrinterOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  BarcodeOutlined,
  SolutionOutlined,
  CodeSandboxOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

import PrintLabels from "./inboundsteps/PrintLabels";
import MapBoxes from "./inboundsteps/MapBoxes";
import DiscrepancySummary from "./inboundsteps/DiscrepancySummary";
import PutawayBinAllocation from "./inboundsteps/PutawayBinAllocation";
import { updateGrnTableStatus } from "../../../../lib/services/grnTableStatusUpdate";
import { updatePoTableStatus } from "@/app/lib/services/updatePoTableStatus";

const INBOUND_STEPS = [
  { title: "Labeling", content: "Print & Attach", icon: <BarcodeOutlined /> },
  { title: "Mapping", content: "Map Boxes to Items", icon: <CodeSandboxOutlined /> },
  { title: "Summary", content: "Shortage & Discrepancy", icon: <FileTextOutlined /> },
  { title: "Putaway", content: "Bin Allocation", icon: <SolutionOutlined /> },
  { title: "Completed", content: "Stock Updated", icon: <CheckCircleOutlined /> },
];

const PO_STATUS_MAP = {
  0: "IB-LABEL",
  1: "IB-MAP",
  2: "IB-SUM",
  3: "IB-PUT",
  4: "COMPLETED",
};

export default function InboundProcessModal({
  open,
  onClose,
  grn,
  onPrintLabels,
  poid,
  poStatus, // optional: pass poStatus directly from parent if available
  children,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const stepRef = useRef(null);

  // Sync initial step based on PO or GRN status when modal opens
  useEffect(() => {
    if (!open) return;
    // Check poStatus prop first, fallback to grn status fields
    const rawStatus = (poStatus || grn?.po_status || grn?.status || "").toUpperCase();

    switch (rawStatus) {
      // Step 0: Labeling
      case "IB-LABEL":
      case "LABELING":
      case "LABELS_PRINTED":
      case "UNLOADED":
      case "RECEIVED":
        setCurrentStep(0);
        break;

      // Step 1: Mapping
      case "IB-MAP":
      case "MAPPING":
        setCurrentStep(1);
        break;

      // Step 2: Summary
      case "IB-SUM":
      case "SUMMARY":
      case "DISCREPANCY":
        setCurrentStep(2);
        break;

      // Step 3: Putaway
      case "IB-PUT":
      case "PUTAWAY":
        setCurrentStep(3);
        break;

      // Step 4: Completed
      case "COMPLETED":
        setCurrentStep(4);
        break;

      default:
        setCurrentStep(0);
    }
  }, [open, grn, poStatus]);

const handleNextStep = async () => {
  if (currentStep === INBOUND_STEPS.length - 1) {
    onClose?.();
    return;
  }

  // 1. Step validation
  if (stepRef.current?.validate) {
    try {
      setIsValidating(true);
      const isValid = await stepRef.current.validate();
      setIsValidating(false);

      if (!isValid) return;
    } catch (error) {
      setIsValidating(false);
      message.error(error?.message || "Validation failed for this step.");
      return;
    }
  }

  const nextStepIndex = currentStep + 1;
  const nextPoStatus = PO_STATUS_MAP[nextStepIndex];
  const nextGrnStatus = INBOUND_STEPS[nextStepIndex]?.title; // or use nextPoStatus if both tables share codes
  const targetGrnId = grn?.id || grn?.grn_id;

  try {
    // 2. Update GRN status (single call)
    if (targetGrnId) {
      const { success, error: statusError } = await updateGrnTableStatus(targetGrnId, nextPoStatus);
      if (!success) {
        message.error("Failed to update GRN status: " + (statusError?.message || "Unknown error"));
        return;
      }
    } else {
      message.error("GRN ID is missing.");
      return;
    }

    // 3. Update PO status
    if (poid && nextPoStatus) {
      await updatePoTableStatus(poid, nextPoStatus);
    }

    // 4. Advance step
    setCurrentStep(nextStepIndex);
  } catch (err) {
    message.error("Failed to update step progress.");
  }
};

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <PrintLabels ref={stepRef} grnId={grn?.id} grnData={grn} />;
      case 1:
        return <MapBoxes ref={stepRef} grnId={grn?.id} grnData={grn} />;
      case 2:
        return <DiscrepancySummary ref={stepRef} grnId={grn?.id} grnData={grn} />;
      case 3:
        return <PutawayBinAllocation ref={stepRef} grnId={grn?.id} grnData={grn} />;
      case 4:
        return (
          <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircleOutlined className="text-4xl text-emerald-600 mb-2" />
            <h3 className="font-semibold text-emerald-900">Inbound Completed</h3>
            <p className="text-sm text-emerald-700">
              Inventory stock levels have been successfully updated in the system.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const testHandler=()=>{
    console.log("GRN DATAS:",grn);
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800">
          <InboxOutlined className="text-emerald-600 text-lg" />
          <span className="font-semibold">Inbound Processing</span>
          {grn?.grn_no && (
            <Tag color="blue" className="ml-2 font-mono">
              {grn.grn_no}
            </Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      width={1100}
      destroyOnHidden
      centered
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="print"
          icon={<PrinterOutlined />}
          onClick={() => onPrintLabels?.(grn)}
          disabled={!grn}
        >
          Print Labels
        </Button>,

      ]}
    >
      <div className="flex flex-col gap-6 py-2">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <Descriptions
            title={
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                General Information
              </span>
              
            }
            bordered
            size="small"
            column={{ xs: 1, sm: 2, md: 3 }}
            styles={{
              label: { fontWeight: "bold", color: "#64748b" },
              content: { color: "#1e293b" },
            }}
          >
            <Descriptions.Item label="GRN No.">
              <span className="font-mono font-medium">{grn?.grn_no || "-"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Invoice No.">
              <span className="font-mono">{grn?.invoice_no || "-"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={grn?.status === "COMPLETED" ? "green" : "orange"}>
                {grn?.status || "IN PROGRESS"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Boxes Received">
              <span className="font-semibold text-slate-700">
                {grn?.boxes_received ?? 0} Box(es)
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="PO Number">
              <span className="font-mono">{grn?.po_number || "-"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Supplier">
              <span className="truncate block max-w-45">
                {grn?.vendor_name || "-"}
              </span>
            </Descriptions.Item>
          </Descriptions>
        </div>
        <Button onClick={testHandler}>Test</Button>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <Steps
            current={currentStep}
            size="small"
            items={INBOUND_STEPS.map((item) => ({
              title: item.title,
              content: item.content,
              icon: item.icon,
            }))}
          />
        </div>

        <div className="w-full">
          {children ? children : renderStepContent()}
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <div>
          {currentStep > 0 && currentStep < INBOUND_STEPS.length - 1 && (
            <Button
              onClick={handlePrevStep}
              disabled={isValidating}
              icon={<ArrowLeftOutlined />}
            >
              Previous Step
            </Button>
          )}
        </div>

        <Button
          type="primary"
          loading={isValidating}
          onClick={handleNextStep}
          className="bg-emerald-600 hover:bg-emerald-500 min-w-35"
        >
          {currentStep === INBOUND_STEPS.length - 1 ? (
            "Finish Inbound"
          ) : (
            <>
              Proceed to Next Step <ArrowRightOutlined />
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}