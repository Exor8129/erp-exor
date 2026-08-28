import React, { useState, useEffect, useRef } from "react";
import { Card, Input, Select, Button, message, Spin } from "antd";
import { ScanOutlined } from "@ant-design/icons";
import { supabase } from "../../../../../../../lib/supabase"; 

export default function ScannerControlBar({
  grnItems = [],
  savedContainers = [],
  selectedItemId,
  setSelectedItemId,
  activeContainer,
  onConfigure,
  onManualBarcodeSubmit,
  isMappingStage = true, // 👈 Gate to enable global scanner only during mapping stage
}) {
  const [manualCode, setManualCode] = useState("");
  const [loadingScanType, setLoadingScanType] = useState(false);
  const inputRef = useRef(null);

  // Buffer and timer to catch global hardware barcode scans
  const scanBuffer = useRef("");
  const lastKeyTime = useRef(0);

  // =========================================================================
  // GLOBAL KEYDOWN LISTENER (Active ONLY during Mapping Stage)
  // =========================================================================
  useEffect(() => {
    // If not in mapping stage, do not register/listen globally
    if (!isMappingStage) return;

    const handleGlobalKeyDown = (e) => {
      const target = e.target;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;
      lastKeyTime.current = currentTime;

      // Hardware barcode scanners send characters very fast (< 50ms) followed by Enter
      if (e.key === "Enter") {
        if (scanBuffer.current.length > 2) {
          const scannedBarcode = scanBuffer.current.trim();
          scanBuffer.current = "";

          if (typeof onManualBarcodeSubmit === "function") {
            onManualBarcodeSubmit(scannedBarcode);
            setManualCode("");
            e.preventDefault();
            return;
          }
        }
        scanBuffer.current = "";
        return;
      }

      // Append standard characters
      if (e.key.length === 1) {
        if (timeDiff < 50 || !isInputFocused) {
          scanBuffer.current += e.key;
        } else {
          scanBuffer.current = e.key;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [onManualBarcodeSubmit, isMappingStage]);

  // Helper function to query item_master via grn_items
  const fetchScanTypeByGrnItemId = async (grnItemId) => {
    if (!grnItemId) return null;

    try {
      setLoadingScanType(true);

      const { data: grnItem, error: grnError } = await supabase
        .schema("purchase")
        .from("grn_items")
        .select(`
          id,
          item_id
        `)
        .eq("id", grnItemId)
        .single();

      if (grnError || !grnItem?.item_id) return null;
console.log("Fetched GRN Item:", grnItem);
      const { data: itemMaster, error: itemError } = await supabase
        .from("item_master")
        .select("scan_type")
        .eq("id", grnItem.item_id)
        .single();

      if (itemError) return null;

      return itemMaster?.scan_type || null;
    } catch (err) {
      console.error("Unexpected error fetching scan type:", err);
      return null;
    } finally {
      setLoadingScanType(false);
    }
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();

    if (!code) {
      message.warning("Please enter or scan a barcode / code first.");
      return;
    }

    if (typeof onManualBarcodeSubmit === "function") {
      onManualBarcodeSubmit(code);
      setManualCode("");
    } else {
      message.error("Internal configuration error: submit handler missing.");
    }
  };

  const handleItemSelect = async (grnItemId) => {
    if (!activeContainer) {
      message.warning("Scan or activate a container first!");
      return;
    }

    setSelectedItemId(grnItemId);
    console.log("GRN Items:", grnItems);

    const selectedGrnItem = grnItems.find((i) => i.id === grnItemId);
    if (!selectedGrnItem) return;

    const scanType = await fetchScanTypeByGrnItemId(grnItemId);
console.log("ScannerControlBar scanType:", scanType);
    const itemWithScanType = {
      ...selectedGrnItem,
      scan_type: scanType,
    };

    if (typeof onConfigure === "function") {
      onConfigure(itemWithScanType);
    }

    setSelectedItemId(null);
  };

  return (
    <Card size="small" className="border-emerald-200 bg-emerald-50/30">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Hands-free indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <ScanOutlined className="text-emerald-600 text-xl animate-pulse" />
          <div className="text-xs">
            <span className="font-bold text-slate-700 block">
              Hands-Free Scanning {isMappingStage ? "Active" : "Disabled"}
            </span>
            <span className="text-slate-500">
              {isMappingStage
                ? "Scan from anywhere on screen or enter barcode manually."
                : "Manual barcode entry mode active."}
            </span>
          </div>
        </div>

        {/* MANUAL INPUT & ITEM SELECTOR */}
        <div className="flex flex-1 flex-wrap lg:flex-nowrap items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Input
              ref={inputRef}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onPressEnter={handleManualSubmit}
              placeholder="Enter or scan barcode..."
              className="w-56 font-mono"
              allowClear
            />
            <Button
              type="primary"
              onClick={handleManualSubmit}
              className="bg-slate-700 hover:bg-slate-600"
            >
              Process
            </Button>
          </div>

          <span className="text-slate-300 hidden lg:inline shrink-0">|</span>

          {/* EXPANDED ITEM SELECTOR */}
          <div className="flex flex-1 items-center gap-2 min-w-70">
            <Select
              showSearch={{
                optionFilterProp: "label",
              }}
              placeholder="Select GRN Item..."
              value={selectedItemId}
              onChange={handleItemSelect}
              loading={loadingScanType}
              disabled={loadingScanType}
              className="w-full flex-1"
              options={grnItems.map((item) => ({
                key: `select-item-${item.id}`,
                value: item.id,
                label: `${item.item_name} (${item.item_code || "N/A"})`,
              }))}
            />
            {loadingScanType && <Spin size="small" />}
          </div>
        </div>
      </div>
    </Card>
  );
}