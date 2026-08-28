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
// import { content } from "html2canvas/dist/types/css/property-descriptors/content";
const INBOUND_STEPS = [
  { title: "Labeling", content: "Print & Attach", icon: <BarcodeOutlined /> },
  { title: "Mapping", content: "Map Boxes to Items", icon: <CodeSandboxOutlined /> },
  { title: "Summary", content: "Shortage & Discrepancy", icon: <FileTextOutlined /> },
  { title: "Putaway", content: "Bin Allocation", icon: <SolutionOutlined /> },
  { title: "Completed", content: "Stock Updated", icon: <CheckCircleOutlined /> },
];

export default function InboundProcessModal({
  open,
  onClose,
  grn,
  onPrintLabels,
  children,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  
  // Ref attached to current step component for validation
  const stepRef = useRef(null);

  useEffect(() => {
    if (!grn) return;

    switch (grn.status?.toUpperCase()) {
      case "UNLOADED":
      case "RECEIVED":
      case "LABELING":
      case "LABELS_PRINTED":
        setCurrentStep(0);
        break;
      case "MAPPING":
        setCurrentStep(1);
        break;
      case "SUMMARY":
        setCurrentStep(2);
        break;
      case "PUTAWAY":
        setCurrentStep(3);
        break;
      case "COMPLETED":
        setCurrentStep(4);
        break;
      default:
        setCurrentStep(0);
    }
  }, [grn]);

  // Dynamic step navigation with step-specific validation
const handleNextStep = async () => {
  if (currentStep === INBOUND_STEPS.length - 1) {
    onClose?.();
    return;
  }

  // 1. Execute step component validation if defined
  if (stepRef.current?.validate) {
    try {
      setIsValidating(true);
      const isValid = await stepRef.current.validate();
      setIsValidating(false);

      if (!isValid) return; // Stop if validation returns false
    } catch (error) {
      setIsValidating(false);
      message.error(error?.message || "Validation failed for this step.");
      return;
    }
  }

  // 2. Target the upcoming step
  const nextStepIndex = currentStep + 1;
  const nextStepObj = INBOUND_STEPS[nextStepIndex];

  // Retrieve the step name/title (e.g., nextStepObj.title or nextStepObj.name)
  const nextStatus = nextStepObj?.title || nextStepObj?.name || "Processing";

  // 3. Update status in database using the step name
  if (grn?.id) {
    const { success, error: statusError } = await updateGrnTableStatus(grn?.id, nextStatus);

    if (!success) {
      message.error("Failed to update status to " + nextStatus + ": " + (statusError?.message || "Unknown error"));
      return; // Stop step advancement if DB update fails
    }
  }

  // 4. Advance step if status update succeeded
  setCurrentStep(nextStepIndex);
};

const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return PrintLabels ? (
          <PrintLabels ref={stepRef} grnId={grn?.id} grnData={grn} />
        ) : null;

      case 1:
        return MapBoxes ? (
          <MapBoxes ref={stepRef} grnId={grn?.id} grnData={grn} />
        ) : null;

      case 2:
        return DiscrepancySummary ? (
          <DiscrepancySummary ref={stepRef} grnId={grn?.id} grnData={grn} />
        ) : null;

      case 3:
        return PutawayBinAllocation ? (
          <PutawayBinAllocation ref={stepRef} grnId={grn?.id} grnData={grn} />
        ) : null;

      case 4:
        return (
          <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircleOutlined className="text-4xl text-emerald-600 mb-2" />
            <h3 className="font-semibold text-emerald-900">
              Inbound Completed
            </h3>
            <p className="text-sm text-emerald-700">
              Inventory stock levels have been successfully updated in the system.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // Navigate back to the previous step
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

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
        {/* GRN Details */}
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

        {/* Steps Header */}
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

        {/* Dynamic Workspace */}
        <div className="w-full">
          {children ? children : renderStepContent()}
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        {/* Previous Step Button */}
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

        {/* Next / Finish Button */}
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