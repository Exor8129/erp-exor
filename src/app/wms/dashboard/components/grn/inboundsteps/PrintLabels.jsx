"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Spin,
  Button,
  message,
  Tag,
  Divider,
  InputNumber,
  Select,
} from "antd";
import {
  PrinterOutlined,
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  ScissorOutlined,
} from "@ant-design/icons";
import bwipjs from "bwip-js";
import { supabase } from "../../../../../lib/supabase";
import BarcodeLabelModal from "@/app/components/BarcodeLabelModal";

// ====================================================================
// 1. SINGLE SOURCE OF TRUTH: BOX LABEL TEMPLATE
// ====================================================================
function BoxLabel({ grnNo, container, boxIndex, totalBoxes }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && container?.barcode) {
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: "code128",
          text: container.barcode,
          scale: 2,
          height: 12, // Height in mm
          includetext: false,
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  }, [container?.barcode]);

  if (!container) return null;

  const barcodeParts = container?.barcode ? container.barcode.split("-") : [];
  const isSplit = barcodeParts[0] === "SPT";

  return (
    <div className="label-card border border-black box-border bg-white select-none p-3 flex flex-col justify-between">
      {/* TOP SECTION */}
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="flex flex-col text-left space-y-0.5">
          <span className="font-bold text-lg leading-tight tracking-wide">
            {grnNo || "GRN"}
          </span>
          <div className="text-xs">
            <span className="font-normal text-slate-600">Barcode : </span>
            <span className="font-bold font-mono text-black">
              {container.barcode}
            </span>
          </div>
          <div className="text-xs">
            <span className="font-mono text-[10px] font-bold border border-black px-2 py-0.5 rounded">
              BOX {boxIndex} / {totalBoxes}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 px-2 py-1 ">
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-bold font-mono ${
              isSplit
                ? "bg-amber-50 border-amber-600 text-amber-700"
                : "bg-slate-50 border-slate-700 text-slate-800"
            }`}
          >
            {isSplit ? (
              <>
                <ScissorOutlined className="text-sm text-amber-600" />
                <span>SPLIT BOX</span>
              </>
            ) : (
              <AppstoreOutlined className="text-sm text-slate-700" />
            )}
          </div>
        </div>
      </div>

      <Divider className="my-1.5 border-black" />

      {/* BOTTOM SECTION: BARCODE */}
      <div className="flex flex-col items-center justify-center">
        <canvas ref={canvasRef} style={{ height: "42px", maxWidth: "100%" }} />
        <span className="font-mono text-xs font-bold tracking-widest mt-1">
          {container.barcode}
        </span>
      </div>
    </div>
  );
}

// ====================================================================
// 2. MAIN COMPONENT WITH FORWARDREF & IMPERATIVE HANDLE
// ====================================================================
const PrintLabels = forwardRef(({ grnId, grnData }, ref) => {
  const [loading, setLoading] = useState(false);
  const [containers, setContainers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [containersToPrint, setContainersToPrint] = useState([]);
  const totalBoxes = grnData?.boxes_received || 0;
  
  // Modal State Management
  const [labelType, setLabelType] = useState("master");
  const [singleBarcode, setSingleBarcode] = useState(null);

  // ------------------------------------------------------------------
  // IMPERATIVE HANDLE VALIDATION
  // ------------------------------------------------------------------
  useImperativeHandle(ref, () => ({
    validate: async () => {
      if (containers.length === 0) {
        message.warning(
          "Please generate container barcode labels before proceeding.",
        );
        return false;
      }

      const unprintedCount = containers.filter((c) => !c.printed).length;
      if (unprintedCount > 0) {
        message.warning(
          `Please print all barcode labels (${unprintedCount} box label(s) pending) before proceeding.`,
        );
        return false;
      }

      return true;
    },
  }));

  // Fetch containers from Supabase
  const loadContainers = useCallback(async () => {
    if (!grnId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema("purchase")
        .from("containers")
        .select(`id, barcode, printed, printed_at, grn_id`)
        .eq("grn_id", grnId)
        .order("barcode", { ascending: true });

      if (error) throw error;
      setContainers(data || []);
      setCurrentIndex(0);
    } catch (err) {
      console.error("Error fetching containers:", err);
      message.error("Failed to load box containers.");
    } finally {
      setLoading(false);
    }
  }, [grnId]);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  const handleOpenBarcodeModal = (type, barcode = null) => {
    if (!grnId) {
      message.warning("GRN ID is missing.");
      return;
    }
    setLabelType(type);
    setSingleBarcode(barcode);
    setIsModalVisible(true);
  };

  // Execute printing and update Supabase
  const executePrint = async (targetContainers) => {
    if (!targetContainers || targetContainers.length === 0) return;

    const targetContainerIds = targetContainers.map((c) => c.id);

    try {
      setContainersToPrint(targetContainers);

      await supabase
        .schema("purchase")
        .from("containers")
        .update({
          printed: true,
          printed_at: new Date().toISOString(),
        })
        .in("id", targetContainerIds);

      setContainers((prev) =>
        prev.map((c) =>
          targetContainerIds.includes(c.id)
            ? { ...c, printed: true, printed_at: new Date().toISOString() }
            : c,
        ),
      );

      setTimeout(() => {
        window.print();
      }, 300);
    } catch (err) {
      console.error("Error updating print state:", err);
      message.error("Failed to update container print status.");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Spin description="Loading container barcodes..." />
      </div>
    );
  }

  const activeContainer = containers[currentIndex];

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-2">
      {containers.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-4">
          <div>
            <h4 className="font-bold text-amber-900 text-base m-0">
              No Barcodes Generated
            </h4>
            <p className="text-sm text-amber-700 mt-1 m-0">
              This GRN has <strong>{totalBoxes}</strong> received box(es). Click
              below to create barcodes.
            </p>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            disabled={totalBoxes === 0}
            className="bg-emerald-600 hover:bg-emerald-500"
            onClick={() => handleOpenBarcodeModal("master")}
          >
            Generate {totalBoxes} Barcode(s)
          </Button>
        </div>
      ) : (
        <>
          {/* Action Header */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 no-print">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold text-slate-500">
                Container Barcodes:
              </span>
              <Tag color="blue" className="font-mono font-bold">
                {containers.length} Box(es)
              </Tag>
              {activeContainer?.printed ? (
                <Tag icon={<CheckCircleOutlined />} color="green">
                  PRINTED
                </Tag>
              ) : (
                <Tag color="orange">PENDING</Tag>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                icon={<PrinterOutlined />}
                onClick={() => handleOpenBarcodeModal("master-ind", activeContainer?.barcode)}
                className="bg-white"
                disabled={!activeContainer}
              >
                Print Current
              </Button>

              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={() => handleOpenBarcodeModal("master")}
                className="bg-emerald-600 hover:bg-emerald-500"
                disabled={containers.length === 0}
              >
                Print All ({containers.length})
              </Button>
            </div>
          </div>

          {/* Screen Label Preview */}
          <div className="flex flex-col items-center justify-center no-print my-4">
            <div className="shadow-lg border border-slate-200 rounded-lg p-2 bg-slate-100">
              <BoxLabel
                grnNo={grnData?.grn_no}
                container={activeContainer}
                boxIndex={currentIndex + 1}
                totalBoxes={containers.length}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Preview Mode (Actual print dimensions: 100mm × 50mm)
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-3 bg-slate-50 p-2.5 rounded-full border border-slate-200 max-w-md mx-auto no-print">
            <Button
              type="text"
              shape="circle"
              icon={<LeftOutlined />}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            />

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Box</span>
              <InputNumber
                min={1}
                max={containers.length}
                value={currentIndex + 1}
                onChange={(val) => {
                  if (val && val >= 1 && val <= containers.length) {
                    setCurrentIndex(val - 1);
                  }
                }}
                size="small"
                className="w-16 text-center font-mono font-bold"
                controls={false}
              />
              <span className="text-slate-400 text-xs">of</span>
              <span className="font-mono text-slate-600 font-semibold text-xs">
                {containers.length}
              </span>
            </div>

            <Button
              type="text"
              shape="circle"
              icon={<RightOutlined />}
              onClick={() =>
                setCurrentIndex((prev) =>
                  Math.min(containers.length - 1, prev + 1),
                )
              }
              disabled={currentIndex === containers.length - 1}
            />

            <Divider
              orientation="vertical"
              className="h-6 my-0 border-slate-300"
            />

            <Select
              size="small"
              value={currentIndex}
              onChange={(val) => setCurrentIndex(val)}
              className="w-36 font-mono text-xs"
              placeholder="Jump to..."
              options={containers.map((c, i) => {
                const barcodeParts = c.barcode ? c.barcode.split("-") : [];
                return {
                  value: i,
                  label: `Box ${i + 1} (${barcodeParts[barcodeParts.length - 1]})`,
                };
              })}
            />
          </div>

          {/* Dynamic Print Render Target */}
          <div className="print-only">
            {containersToPrint.map((c) => {
              const originalIndex = containers.findIndex(
                (item) => item.id === c.id,
              );
              const displayIndex = originalIndex !== -1 ? originalIndex + 1 : 1;

              return (
                <div key={c.id} className="print-page">
                  <BoxLabel
                    grnNo={grnData?.grn_no}
                    container={c}
                    boxIndex={displayIndex}
                    totalBoxes={containers.length}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      <BarcodeLabelModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          loadContainers();
        }}
        grnId={grnId}
        labelType={labelType}
        boxCount={totalBoxes}
        singleBarcode={singleBarcode}
      />

      {/* Media Queries */}
      <style jsx global>{`
        .label-card {
          width: 100mm !important;
          height: 50mm !important;
          max-width: 100mm !important;
          max-height: 50mm !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }

        @media screen {
          .print-only {
            display: none !important;
          }
        }

        @media print {
          html,
          body {
            width: 100mm !important;
            height: 50mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .no-print {
            display: none !important;
          }

          .print-only,
          .print-only * {
            visibility: visible !important;
          }

          .print-only {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100mm !important;
            height: 50mm !important;
          }

          .print-page {
            width: 100mm !important;
            height: 50mm !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
            display: block !important;
          }

          @media {
            size: 100mm 50mm landscape !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
});

PrintLabels.displayName = "PrintLabels";

export default PrintLabels;