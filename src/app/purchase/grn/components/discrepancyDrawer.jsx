"use client";

import {
  Drawer,
  Button,
  Space,
  Select,
  Input,
  InputNumber,
  Segmented,
  Tag,
} from "antd";
import {
  AlertTriangle,
  Ticket,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useState, useEffect, useMemo } from "react";

const { TextArea } = Input;

export const DISCREPANCY_CATEGORIES = {
  QUANTITY: {
    label: "Quantity Discrepancy",
    reasons: [
      { value: "SHORTAGE", label: "Shortage" },
      { value: "EXCESS", label: "Excess" },
    ],
  },
  PRODUCT: {
    label: "Product Mismatch",
    reasons: [
      { value: "NON_ORDERED_ITEM", label: "Non-Ordered Item" },
      { value: "WRONG_ITEM", label: "Wrong Item" },
      { value: "SUBSTITUTION", label: "Substitution" },
      { value: "WRONG_VARIANT", label: "Wrong Variant" },
      { value: "WRONG_BRAND", label: "Wrong Brand" },
    ],
  },
  CONDITION: {
    label: "Condition / Damage",
    reasons: [
      { value: "PRODUCT_DAMAGED", label: "Product Damaged" },
      { value: "PACKAGING_DAMAGED", label: "Packaging Damaged" },
      { value: "SEAL_BROKEN", label: "Seal Broken" },
      { value: "STERILE_PACKAGING_COMPROMISED", label: "Sterile Packaging Compromised" },
      { value: "MISSING_COMPONENT", label: "Missing Component" },
      { value: "WET_MOISTURE_DAMAGE", label: "Wet / Moisture Damage" },
    ],
  },
  QUALITY: {
    label: "Quality & Compliance",
    reasons: [
      { value: "SPECIFICATION_MISMATCH", label: "Specification Mismatch" },
      { value: "FAILED_INSPECTION", label: "Failed Inspection" },
      { value: "EXPIRED", label: "Expired" },
      { value: "NEAR_EXPIRY", label: "Near Expiry" },
      { value: "BATCH_LOT_ISSUE", label: "Batch / Lot Issue" },
      { value: "STERILITY_ISSUE", label: "Sterility Issue" },
      { value: "QUALITY_REJECTION", label: "Quality Rejection" },
    ],
  },
};

const DOCUMENT_TYPES = [
  { value: "TAX_INVOICE", label: "Tax Invoice" },
  { value: "DELIVERY_CHALLAN", label: "Delivery Challan (DC)" },
  { value: "COA_TEST_REPORT", label: "Certificate of Analysis / COA" },
  { value: "LR_WAYBILL", label: "LR / Transporter Bilty" },
  { value: "PACKING_LIST", label: "Packing Slip / List" },
  { value: "E_WAY_BILL", label: "E-Way Bill" },
  { value: "OTHER", label: "Other Document" },
];

const SEVERITY_TABS = [
  { label: "Low", value: "LOW" },
  { label: "Normal", value: "NORMAL" },
  { label: "High", value: "HIGH" },
  { label: "Critical", value: "CRITICAL" },
];

const getCardDscNo = (baseDscNo, cardIndex) => {
  if (!baseDscNo) return `DSC-${1001 + cardIndex}`;

  const match = baseDscNo.match(/(\d+)$/);
  if (match) {
    const rawNumber = match[1];
    const prefix = baseDscNo.slice(0, match.index);
    const nextNumber = parseInt(rawNumber, 10) + cardIndex;
    return `${prefix}${String(nextNumber).padStart(rawNumber.length, "0")}`;
  }

  return `${baseDscNo}-${cardIndex + 1}`;
};

const createEmptySubIssue = () => ({
  id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  category: "QUANTITY",
  reason: "SHORTAGE",
  severity: "NORMAL",
  qty: null,
  remarks: "",
});

const createEmptyItemCard = () => ({
  id: `item_card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  isCustomItem: false,
  poItemId: null,
  customName: "",
  unit: "Nos",
  issues: [createEmptySubIssue()],
});

export default function DiscrepancyDrawer({
  open,
  onClose,
  submitting,
  handleConfirm,
  po,
  items: initialItems = [],
}) {
  const [grnDscNo, setGrnDscNo] = useState(null);
  const [grnList, setGrnList] = useState([]);
  const [loadingGrns, setLoadingGrns] = useState(false);
  const [selectedGrnId, setSelectedGrnId] = useState(null);

  const [poItems, setPoItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [grnItemMap, setGrnItemMap] = useState({}); // Stores { [po_item_id]: received_qty }

  const [activeMode, setActiveMode] = useState("ITEMS");
  const [itemEntries, setItemEntries] = useState([createEmptyItemCard()]);
  const [docEntries, setDocEntries] = useState([]);
  const [generalRemarks, setGeneralRemarks] = useState("");

  useEffect(() => {
    if (open && po?.id) {
      fetchNextGrnDscNumber();
      fetchPOItems();
      fetchGrnData();
      setItemEntries([createEmptyItemCard()]);
      setDocEntries([]);
      setActiveMode("ITEMS");
      setGeneralRemarks("");
    } else {
      setSelectedGrnId(null);
      setGrnList([]);
      setPoItems([]);
      setGrnItemMap({});
    }
  }, [open, po?.id]);

  // Whenever the user selects a different GRN, fetch its specific line-item quantities
  useEffect(() => {
    if (selectedGrnId) {
      fetchGrnItems(selectedGrnId);
    } else {
      setGrnItemMap({});
    }
  }, [selectedGrnId]);

  const availableItems = useMemo(() => {
    return poItems.length > 0 ? poItems : initialItems;
  }, [poItems, initialItems]);

  const fetchNextGrnDscNumber = async () => {
    try {
      const { data, error } = await supabase.rpc("next_grn_dsc_no");
      if (error) throw error;
      setGrnDscNo(data);
    } catch (err) {
      console.error("Failed to load sequence:", err);
    }
  };

  const fetchPOItems = async () => {
    if (!po?.id) return;
    try {
      setLoadingItems(true);
      const { data, error } = await supabase
        .schema("purchase")
        .from("purchase_order_items")
        .select("id, product_name, unit, qty")
        .eq("po_id", po.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPoItems(data || []);
    } catch (err) {
      console.error("Error fetching PO items:", err);
      setPoItems(initialItems);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchGrnData = async () => {
    if (!po?.id) return;
    try {
      setLoadingGrns(true);
      const { data: grnData, error: grnError } = await supabase
        .schema("purchase")
        .from("grn")
        .select("id, grn_no, invoice_date, invoice_no, received_date, supplier_id")
        .eq("po_id", po.id)
        .order("created_at", { ascending: false });

      if (grnError) throw grnError;

      const supplierIds = [...new Set((grnData || []).map((g) => g.supplier_id).filter(Boolean))];
      let vendorMap = {};

      if (supplierIds.length > 0) {
        const { data: vendors, error: vendorError } = await supabase
          .from("vendors")
          .select("id, vendor_name")
          .in("id", supplierIds);

        if (!vendorError && vendors) {
          vendorMap = vendors.reduce((acc, v) => {
            acc[v.id] = v.vendor_name;
            return acc;
          }, {});
        }
      }

      const formatted = (grnData || []).map((item) => ({
        ...item,
        vendor_name: vendorMap[item.supplier_id] || "-",
      }));

      setGrnList(formatted);
      if (formatted.length > 0) {
        setSelectedGrnId(formatted[0].id);
      }
    } catch (err) {
      console.error("Fetch GRN Error:", err);
    } finally {
      setLoadingGrns(false);
    }
  };

  const fetchGrnItems = async (grnId) => {
    try {
      const { data, error } = await supabase
        .schema("purchase")
        .from("grn_items")
        .select("po_item_id, received_qty")
        .eq("grn_id", grnId);

      if (error) throw error;

      const qMap = {};
      (data || []).forEach((row) => {
        qMap[row.po_item_id] = Number(row.received_qty || 0);
      });
      setGrnItemMap(qMap);
    } catch (err) {
      console.error("Error fetching GRN items:", err);
      setGrnItemMap({});
    }
  };

  const handleAddItemCard = () => {
    setItemEntries((prev) => [...prev, createEmptyItemCard()]);
  };

  const handleRemoveItemCard = (cardIndex) => {
    if (itemEntries.length === 1) return;
    setItemEntries((prev) => prev.filter((_, idx) => idx !== cardIndex));
  };

  const handleSelectProduct = (cardIndex, value) => {
    setItemEntries((prev) => {
      const updated = [...prev];
      if (value === "__CUSTOM__") {
        updated[cardIndex].isCustomItem = true;
        updated[cardIndex].poItemId = null;
        updated[cardIndex].customName = "";
        updated[cardIndex].unit = "Nos";
      } else {
        const matched = availableItems.find((i) => i.id === value);
        const poQty = Number(matched?.qty || matched?.ordered_qty || 0);
        const grnQty = grnItemMap[value] !== undefined ? grnItemMap[value] : 0;
        const diffQty = Math.abs(poQty - grnQty);

        updated[cardIndex].isCustomItem = false;
        updated[cardIndex].poItemId = value;
        updated[cardIndex].customName = matched?.product_name || "";
        updated[cardIndex].unit = matched?.unit || "Nos";

        // Auto-populate default discrepancy quantity if a variance exists
        if (diffQty > 0 && updated[cardIndex].issues.length === 1 && !updated[cardIndex].issues[0].qty) {
          updated[cardIndex].issues[0].qty = diffQty;
          updated[cardIndex].issues[0].reason = grnQty < poQty ? "SHORTAGE" : "EXCESS";
        }
      }
      return updated;
    });
  };

  const handleAddSubIssue = (cardIndex) => {
    setItemEntries((prev) => {
      const updated = [...prev];
      updated[cardIndex].issues.push(createEmptySubIssue());
      return updated;
    });
  };

  const handleRemoveSubIssue = (cardIndex, issueIndex) => {
    setItemEntries((prev) => {
      const updated = [...prev];
      if (updated[cardIndex].issues.length === 1) return prev;
      updated[cardIndex].issues = updated[cardIndex].issues.filter((_, idx) => idx !== issueIndex);
      return updated;
    });
  };

  const handleUpdateSubIssue = (cardIndex, issueIndex, field, value) => {
    setItemEntries((prev) => {
      const updated = [...prev];
      const target = { ...updated[cardIndex].issues[issueIndex], [field]: value };

      if (field === "category") {
        target.reason = DISCREPANCY_CATEGORIES[value]?.reasons?.[0]?.value || null;
      }

      updated[cardIndex].issues[issueIndex] = target;
      return updated;
    });
  };

  const totalItemIssues = useMemo(() => {
    return itemEntries.reduce((sum, it) => sum + it.issues.length, 0);
  }, [itemEntries]);

  const handleSubmit = async () => {
    if (!selectedGrnId) return alert("Please select a target GRN.");

    const currentSupplierId = grnList.find((g) => g.id === selectedGrnId)?.supplier_id;
    if (!currentSupplierId) return alert("Supplier ID not found for the selected GRN.");

    if (activeMode === "ITEMS") {
      for (let i = 0; i < itemEntries.length; i++) {
        const card = itemEntries[i];
        const cardDscNo = getCardDscNo(grnDscNo, i);

        const resolvedName = card.isCustomItem
          ? card.customName
          : availableItems.find((x) => x.id === card.poItemId)?.product_name;

        if (!resolvedName?.trim()) {
          return alert(`${cardDscNo}: Please select or enter a product name.`);
        }

        for (let j = 0; j < card.issues.length; j++) {
          const issue = card.issues[j];
          const requiresQty = issue.category === "QUANTITY" || issue.reason === "PRODUCT_DAMAGED";
          if (requiresQty && (!issue.qty || Number(issue.qty) <= 0)) {
            return alert(`${cardDscNo} (Issue #${j + 1}): Please specify a valid quantity for ${issue.reason}.`);
          }
        }
      }
    }

    const insertRows = [];

    // Product lines
    itemEntries.forEach((card, cardIdx) => {
      const cardDscNo = getCardDscNo(grnDscNo, cardIdx);
      const matchedItem = availableItems.find((x) => x.id === card.poItemId);
      const productName = card.isCustomItem ? card.customName : matchedItem?.product_name;
      const unit = card.isCustomItem ? card.unit || "Nos" : matchedItem?.unit || "Nos";
      const expectedQty = card.isCustomItem ? null : Number(matchedItem?.qty || matchedItem?.ordered_qty || 0);

      card.issues.forEach((issue) => {
        const discQty = issue.qty !== null && issue.qty !== "" ? Number(issue.qty) : null;
        let actualQty = null;
        if (expectedQty !== null && discQty !== null) {
          if (issue.reason === "SHORTAGE") actualQty = Math.max(0, expectedQty - discQty);
          else if (issue.reason === "EXCESS") actualQty = expectedQty + discQty;
        }

        insertRows.push({
          discrepancy_no: cardDscNo,
          po_id: po?.id,
          grn_id: selectedGrnId,
          supplier_id: currentSupplierId,
          item_id: card.isCustomItem ? null : card.poItemId,
          category: issue.category,
          reason: issue.reason,
          expected_qty: expectedQty,
          actual_qty: actualQty,
          discrepancy_qty: discQty,
          status: "open",
          discrepancy_data: {
            product_name: productName,
            unit: unit,
            severity: issue.severity,
            remarks: issue.remarks || null,
            is_custom_item: card.isCustomItem,
            general_remarks: generalRemarks || null,
          },
        });
      });
    });

    // Document lines
    if (docEntries.length > 0) {
      docEntries.forEach((doc, docIdx) => {
        insertRows.push({
          discrepancy_no: `${grnDscNo || "DSC"}-DOC-${docIdx + 1}`,
          po_id: po?.id,
          grn_id: selectedGrnId,
          supplier_id: currentSupplierId,
          item_id: null,
          category: "DOCUMENTATION",
          reason: doc.type,
          expected_qty: null,
          actual_qty: null,
          discrepancy_qty: null,
          status: "open",
          discrepancy_data: {
            doc_ref_no: doc.refNo || null,
            doc_detail: doc.detail || null,
            general_remarks: generalRemarks || null,
          },
        });
      });
    }

    if (insertRows.length === 0) return alert("No discrepancies to submit.");

    try {
      const { data, error } = await supabase
        .schema("purchase")
        .from("discrepancies")
        .insert(insertRows)
        .select();

      if (error) throw error;
      alert(`Successfully booked ${data.length} discrepancy line(s).`);
      if (handleConfirm) handleConfirm(data);
      onClose();
    } catch (err) {
      console.error("Database Insert Error:", err);
      alert(err.message || "Failed to book discrepancies in database.");
    }
  };

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-start gap-2 text-slate-800">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-base font-semibold leading-tight block">
                Log Goods Discrepancies
              </span>
              <div className="text-xs font-normal text-slate-500 mt-0.5">
                PO: <span className="font-mono">{po?.po_number || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      }
      placement="right"
      size={760}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="primary"
            danger
            loading={submitting}
            onClick={handleSubmit}
            disabled={!selectedGrnId}
          >
            Confirm ({totalItemIssues} Issues)
          </Button>
        </Space>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3.5 bg-purple-50/70 border border-purple-100 rounded-lg">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-md">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-purple-600">
              Base Discrepancy Reference
            </div>
            <div className="text-lg font-mono font-bold text-purple-950 leading-tight">
              {grnDscNo || "Generating..."}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Target GRN <span className="text-red-500">*</span>
          </label>
          <Select
            className="w-full"
            placeholder="Select associated GRN"
            loading={loadingGrns}
            value={selectedGrnId}
            onChange={(val) => setSelectedGrnId(val)}
            options={grnList.map((g) => ({
              value: g.id,
              label: `${g.grn_no} (${g.vendor_name})`,
            }))}
          />
        </div>

        <Segmented
          block
          value={activeMode}
          onChange={(val) => setActiveMode(val)}
          options={[
            { label: `Item Discrepancies (${totalItemIssues})`, value: "ITEMS" },
            { label: `Document Issues (${docEntries.length})`, value: "DOCS" },
          ]}
        />

        {activeMode === "ITEMS" ? (
          <div className="space-y-4">
            {itemEntries.map((card, cardIdx) => {
              const cardDscNo = getCardDscNo(grnDscNo, cardIdx);

              return (
                <div
                  key={card.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Tag color="purple" className="font-mono font-bold text-xs px-2 py-0.5 m-0">
                        {cardDscNo}
                      </Tag>
                      <span className="text-xs font-semibold text-slate-700">
                        Product #{cardIdx + 1}
                      </span>
                    </div>

                    {itemEntries.length > 1 && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => handleRemoveItemCard(cardIdx)}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-slate-500" />
                      Select Product / Line Item <span className="text-red-500">*</span>
                    </label>

                    {/* Rich Item Selector with Quantities & Variance Highlight */}
                    <Select
                      className="w-full"
                      loading={loadingItems}
                      placeholder="Choose from PO items or add non-ordered item"
                      value={card.isCustomItem ? "__CUSTOM__" : card.poItemId}
                      onChange={(val) => handleSelectProduct(cardIdx, val)}
                      options={[
                        ...availableItems.map((it) => {
                          const poQty = Number(it.qty || it.ordered_qty || 0);
                          const grnQty = grnItemMap[it.id] !== undefined ? grnItemMap[it.id] : 0;
                          const diff = Math.abs(poQty - grnQty);
                          const hasVariance = diff > 0;
                          const isShortage = grnQty < poQty;

                          return {
                            value: it.id,
                            label: (
                              <div className="flex items-center justify-between gap-2 py-1">
                                <span className="font-medium text-xs text-slate-900 truncate">
                                  {it.product_name}
                                </span>

                                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                                  <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    P:{poQty} {it.unit || "Nos"}
                                  </span>
                                  <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    G:{grnQty} {it.unit || "Nos"}
                                  </span>

                                  {hasVariance ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-bold ${isShortage
                                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                                          : "bg-blue-100 text-blue-700 border border-blue-200"
                                        }`}
                                    >
                                      V:{diff} {it.unit || "Nos"}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                      V:0
                                    </span>
                                  )}
                                </div>
                              </div>
                            ),
                          };
                        }),
                        {
                          value: "__CUSTOM__",
                          label: (
                            <span className="text-amber-700 font-semibold text-xs">
                              + Non-PO Item / Manual Entry (Not in PO)
                            </span>
                          ),
                        },
                      ]}
                    />

                    {card.isCustomItem && (
                      <div className="grid grid-cols-12 gap-2 pt-1 bg-amber-50/50 p-2.5 rounded border border-amber-200/60">
                        <div className="col-span-9">
                          <label className="text-[11px] font-semibold text-amber-900 block mb-0.5">
                            Unordered Product Name <span className="text-red-500">*</span>
                          </label>
                          <Input
                            size="small"
                            placeholder="Enter description on box..."
                            value={card.customName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemEntries((prev) => {
                                const up = [...prev];
                                up[cardIdx].customName = val;
                                return up;
                              });
                            }}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="text-[11px] font-semibold text-amber-900 block mb-0.5">Unit</label>
                          <Input
                            size="small"
                            value={card.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemEntries((prev) => {
                                const up = [...prev];
                                up[cardIdx].unit = val;
                                return up;
                              });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pl-2 border-l-2 border-slate-200">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                      Reported Issues for this item ({card.issues.length})
                    </div>

                    {card.issues.map((issue, issueIdx) => (
                      <div
                        key={issue.id}
                        className="bg-slate-50 border border-slate-200/80 rounded-md p-3 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <Tag color="cyan" className="font-mono text-[10px]">
                            {cardDscNo}
                          </Tag>

                          <div className="flex items-center gap-2">
                            <Segmented
                              size="small"
                              value={issue.severity}
                              onChange={(val) =>
                                handleUpdateSubIssue(cardIdx, issueIdx, "severity", val)
                              }
                              options={SEVERITY_TABS.map((tab) => ({
                                label: <span className="text-[11px]">{tab.label}</span>,
                                value: tab.value,
                              }))}
                            />
                            {card.issues.length > 1 && (
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                onClick={() => handleRemoveSubIssue(cardIdx, issueIdx)}
                              />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                              Category
                            </label>
                            <Select
                              className="w-full"
                              size="small"
                              value={issue.category}
                              onChange={(val) =>
                                handleUpdateSubIssue(cardIdx, issueIdx, "category", val)
                              }
                              options={Object.entries(DISCREPANCY_CATEGORIES).map(([key, it]) => ({
                                value: key,
                                label: it.label,
                              }))}
                            />
                          </div>

                          <div className="col-span-5">
                            <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                              Reason
                            </label>
                            <Select
                              className="w-full"
                              size="small"
                              value={issue.reason}
                              onChange={(val) =>
                                handleUpdateSubIssue(cardIdx, issueIdx, "reason", val)
                              }
                              options={DISCREPANCY_CATEGORIES[issue.category]?.reasons || []}
                            />
                          </div>

                          <div className="col-span-3">
                            <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                              Quantity
                            </label>
                            <Space.Compact className="w-full">
                              <InputNumber
                                className="w-full"
                                size="small"
                                min={0.01}
                                placeholder="0"
                                value={issue.qty}
                                onChange={(val) =>
                                  handleUpdateSubIssue(cardIdx, issueIdx, "qty", val)
                                }
                              />

                              <div
                                className="flex items-center px-2 text-xs"
                                style={{
                                  border: "1px solid #d9d9d9",
                                  background: "#fafafa",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {card.unit || "Unit"}
                              </div>
                            </Space.Compact>

                          </div>
                        </div>

                        <Input
                          size="small"
                          placeholder="Notes for this issue..."
                          value={issue.remarks}
                          onChange={(e) =>
                            handleUpdateSubIssue(cardIdx, issueIdx, "remarks", e.target.value)
                          }
                        />
                      </div>
                    ))}

                    <Button
                      type="dashed"
                      size="small"
                      icon={<Plus className="w-3 h-3" />}
                      onClick={() => handleAddSubIssue(cardIdx)}
                      className="text-xs text-blue-600 border-blue-300"
                    >
                      Add Another Issue for this Product
                    </Button>
                  </div>
                </div>
              );
            })}

            <Button
              type="dashed"
              block
              icon={<Plus className="w-4 h-4" />}
              onClick={handleAddItemCard}
              className="border-dashed py-2"
            >
              Add Another Product
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {docEntries.map((doc, docIdx) => (
              <div
                key={docIdx}
                className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">
                    Doc Issue #{docIdx + 1}
                  </span>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() =>
                      setDocEntries((prev) => prev.filter((_, idx) => idx !== docIdx))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Document Type
                    </label>
                    <Select
                      className="w-full"
                      size="small"
                      value={doc.type}
                      onChange={(val) => {
                        const up = [...docEntries];
                        up[docIdx].type = val;
                        setDocEntries(up);
                      }}
                      options={DOCUMENT_TYPES}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Doc / Reference No
                    </label>
                    <Input
                      size="small"
                      placeholder="e.g. Challan #44"
                      value={doc.refNo}
                      onChange={(e) => {
                        const up = [...docEntries];
                        up[docIdx].refNo = e.target.value;
                        setDocEntries(up);
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Variance Details
                  </label>
                  <Input
                    size="small"
                    placeholder="e.g. Missing COA stamp, tax rate incorrect..."
                    value={doc.detail}
                    onChange={(e) => {
                      const up = [...docEntries];
                      up[docIdx].detail = e.target.value;
                      setDocEntries(up);
                    }}
                  />
                </div>
              </div>
            ))}

            <Button
              type="dashed"
              block
              icon={<Plus className="w-4 h-4" />}
              onClick={() =>
                setDocEntries((prev) => [
                  ...prev,
                  { type: "TAX_INVOICE", refNo: "", detail: "" },
                ])
              }
            >
              Add Document Issue
            </Button>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            General Ticket Remarks / Summary
          </label>
          <TextArea
            rows={2}
            placeholder="Overarching remarks regarding this shipment, vendor communications, or resolution instructions..."
            value={generalRemarks}
            onChange={(e) => setGeneralRemarks(e.target.value)}
          />
        </div>
      </div>
    </Drawer>
  );
}