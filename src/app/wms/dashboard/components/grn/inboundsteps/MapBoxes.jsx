"use client";

import React, {
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Button, Spin, message, Form, Badge, Modal } from "antd";
import {
  UnorderedListOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { supabase } from "../../../../../lib/supabase";

import PackingControlDrawer from "./utils/MapBoxes/Drawer";
import ConfigureItemModal from "./utils/MapBoxes/ConfigureItemModal";
import ActiveContainerBanner from "./utils/MapBoxes/ActiveContainerBanner";
import ScannerControlBar from "./utils/MapBoxes/ScannerControlBar";
import MappedItemsTable from "./utils/MapBoxes/MappedItemsTable";
import useBarcodeScanner from "./utils/MapBoxes/useBarcodeScanner";

const MapBoxes = forwardRef(({ grnId, grnData }, ref) => {
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grnItems, setGrnItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [mappedItems, setMappedItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Saved Containers & Active Container State
  const [allContainers, setAllContainers] = useState([]);
  const [savedContainers, setSavedContainers] = useState([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [activeContainer, setActiveContainer] = useState(null);

  // Modal & Drawer States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingRowId, setEditingRowId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Autocomplete Suggestions & Global Quantities
  const [batchOptions, setBatchOptions] = useState([]);
  const [serialOptions, setSerialOptions] = useState([]);
  const [globalMappedQtyMap, setGlobalMappedQtyMap] = useState({});

  const debounceTimerRef = useRef(null);
  const lastLookupRef = useRef({
    key: null,
    time: 0,
  });

  // Summary list calculation for items
  const pendingSummaryList = grnItems.map((item) => {
    const targetQty =
      Number(item.expected_qty) > 0
        ? Number(item.expected_qty)
        : Number(item.received_qty || 0);

    const packed = globalMappedQtyMap[item.id] || 0;
    const pending = Math.max(0, targetQty - packed);
    const percent =
      targetQty > 0 ? Math.min(100, Math.round((packed / targetQty) * 100)) : 0;

    return {
      ...item,
      expected_qty: targetQty,
      packed_qty: packed,
      pending_qty: pending,
      percent,
    };
  });
  const totalPendingCount = pendingSummaryList.reduce(
    (acc, curr) => acc + curr.pending_qty,
    0,
  );

  // Compute unmapped/unscanned containers count
  const unmappedContainersCount = Math.max(
    0,
    allContainers.length - savedContainers.length,
  );

  // --- VALIDATION LOGIC ---
  useImperativeHandle(ref, () => ({
    validate: async () => {
      if (allContainers.length === 0) {
        message.error("No containers/boxes exist for this GRN.");
        return false;
      }

      if (unmappedContainersCount > 0) {
        message.error(
          `Mapping incomplete! There are still ${unmappedContainersCount} container(s) remaining to be scanned/mapped.`,
        );
        return false;
      }

      return true;
    },
  }));

  // 1. Fetch GRN Items
  const fetchGrnItems = useCallback(async () => {
    const activeGrnId = grnId || grnData?.id;
    if (!activeGrnId) return;

    try {
      setLoadingItems(true);

      const { data: rawGrnItems, error: grnError } = await supabase
        .schema("purchase")
        .from("grn_items")
        .select(
          `
          id,
          grn_id,
          po_item_id,
          received_qty,
          item_id,
          purchase_order_items!po_item_id (
            id,
            product_id,
            product_name,
            product_code,
            rate,
            unit
          )
        `,
        )
        .eq("grn_id", activeGrnId);

      if (grnError) throw grnError;
      if (!rawGrnItems || rawGrnItems.length === 0) {
        setGrnItems([]);
        return;
      }

      const productIds = rawGrnItems
        .map((row) => row.purchase_order_items?.product_id)
        .filter(Boolean);

      let itemMasterMap = {};

      if (productIds.length > 0) {
        const { data: masterData, error: masterError } = await supabase
          .from("item_master")
          .select("id, item_name")
          .in("id", productIds);

        if (!masterError && masterData) {
          itemMasterMap = masterData.reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
          }, {});
        }
      }

      const formatted = rawGrnItems.map((row) => {
        const poItem = row.purchase_order_items || {};
        const masterItem = itemMasterMap[poItem.product_id] || {};

        return {
          id: row.id,
          item_id: row.item_id,
          grn_id: row.grn_id,
          po_item_id: row.po_item_id,
          expected_qty: Number(row.expected_qty || 0),
          received_qty: Number(row.received_qty || 0),
          unit_price: Number(poItem.rate || 0),
          product_id: poItem.product_id || null,
          item_name:
            masterItem.item_name || poItem.product_name || "Unnamed Item",
          item_code: poItem.product_code || "N/A",
          barcode: masterItem.barcode || poItem.product_code || "",
        };
      });

      setGrnItems(formatted);
    } catch (err) {
      console.error("Error fetching GRN items:", err);
      message.error(`Failed to load GRN items: ${err.message}`);
    } finally {
      setLoadingItems(false);
    }
  }, [grnId, grnData]);

  // 2. Fetch All Containers & Saved Containers
const fetchSavedContainersAndTotals = useCallback(async () => {
  const activeGrnId = grnId || grnData?.id;

  if (!activeGrnId) return;

  try {
    setLoadingContainers(true);

    // ============================================================
    // STEP 1: FETCH ALL CONTAINERS FOR THIS GRN
    // ============================================================

    const {
      data: totalContainersData,
      error: containerErr,
    } = await supabase
      .schema("purchase")
      .from("containers")
      .select("id, barcode, status, grn_id")
      .eq("grn_id", activeGrnId);

    if (containerErr) throw containerErr;

    setAllContainers(totalContainersData || []);

    // ============================================================
    // STEP 2: FETCH CONTAINER ITEMS + THEIR DETAILS
    // ============================================================

    const {
      data: cItems,
      error: cItemsErr,
    } = await supabase
      .schema("purchase")
      .from("container_items")
      .select(
        `
        id,
        container_id,
        grn_item_id,
        item_id,
        containers!inner (
          id,
          barcode,
          grn_id
        ),
        container_item_details (
          id,
          qty
        )
      `,
      )
      .eq("containers.grn_id", activeGrnId);

    if (cItemsErr) throw cItemsErr;

    // ============================================================
    // STEP 3: BUILD SAVED CONTAINER MAP
    // ============================================================

    const savedContainerMap = {};

    // ============================================================
    // STEP 4: BUILD TOTAL MAPPED QTY BY GRN ITEM
    // ============================================================

    const totalsByGrnItem = {};

    (cItems || []).forEach((row) => {
      // ----------------------------------------------------------
      // Save container information
      // ----------------------------------------------------------

      if (row.containers) {
        savedContainerMap[row.containers.id] =
          row.containers;
      }

      // ----------------------------------------------------------
      // Calculate quantity from container_item_details.qty
      // ----------------------------------------------------------

      const grnItemId = row.grn_item_id;

      const totalQty = (
        row.container_item_details || []
      ).reduce(
        (sum, detail) =>
          sum + Number(detail.qty || 0),
        0
      );

      totalsByGrnItem[grnItemId] =
        (totalsByGrnItem[grnItemId] || 0) +
        totalQty;
    });

    // ============================================================
    // STEP 5: UPDATE STATE
    // ============================================================

    setSavedContainers(
      Object.values(savedContainerMap)
    );

    setGlobalMappedQtyMap(
      totalsByGrnItem
    );
  } catch (err) {
    console.error(
      "Error fetching containers:",
      err
    );
  } finally {
    setLoadingContainers(false);
  }
}, [grnId, grnData]);

  useEffect(() => {
    fetchGrnItems();
    fetchSavedContainersAndTotals();
  }, [fetchGrnItems, fetchSavedContainersAndTotals]);

  // 3. Fetch Items assigned to Active Container (Grouped Batch-Wise)
  const fetchContainerItems = useCallback(
  async (containerId) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .schema("purchase")
        .from("container_items")
        .select(
          `
          id,
          grn_item_id,
          remarks,
          container_item_details (
            id,
            batch_number,
            serial_number,
            expiry_date,
            mrp,
            qty
          )
        `,
        )
        .eq("container_id", containerId);

      if (error) throw error;

      if (!data || data.length === 0) {
        setMappedItems([]);
        return;
      }

      const batchGroupedMapped = [];

      data.forEach((cItem) => {
        const masterGrnItem = grnItems.find(
          (g) => g.id === cItem.grn_item_id,
        );

        if (!masterGrnItem) return;

        const details = cItem.container_item_details || [];

        // ---------------------------------------------------------
        // NO DETAIL RECORDS
        // ---------------------------------------------------------
        if (details.length === 0) {
          batchGroupedMapped.push({
            ...masterGrnItem,

            row_key: `saved_${cItem.id}_default`,
            container_item_id: cItem.id,

            item_id: masterGrnItem.item_id,

            received_qty: 0,
            rejected_qty: 0,

            remarks: cItem.remarks || "",

            serial_number: "",
            batch_number: "",

            expiry_date: null,
            mrp: masterGrnItem.unit_price || null,

            details_list: [],
            batch_detail_ids: [],
          });

          return;
        }

        // ---------------------------------------------------------
        // GROUP DETAIL RECORDS BY BATCH
        // ---------------------------------------------------------
        const batches = {};

        details.forEach((detail) => {
          const batchKey =
            detail.batch_number?.trim() || "NO_BATCH";

          if (!batches[batchKey]) {
            batches[batchKey] = {
              batch_number: detail.batch_number || "",
              expiry_date: detail.expiry_date || null,
              mrp: detail.mrp != null ? Number(detail.mrp) : null,

              total_qty: 0,

              serials: [],
              detail_ids: [],
            };
          }

          // Quantity now comes ONLY from container_item_details.qty
          batches[batchKey].total_qty += Number(detail.qty || 0);

          if (detail.serial_number) {
            batches[batchKey].serials.push(detail.serial_number);
          }

          batches[batchKey].detail_ids.push(detail.id);
        });

        // ---------------------------------------------------------
        // CREATE ONE DISPLAY ROW PER BATCH
        // ---------------------------------------------------------
        Object.entries(batches).forEach(([batchKey, batchData]) => {
          batchGroupedMapped.push({
            ...masterGrnItem,

            row_key: `saved_${cItem.id}_batch_${batchKey}`,

            container_item_id: cItem.id,

            item_id: masterGrnItem.item_id,

            // Quantity comes from container_item_details
            received_qty: batchData.total_qty,

            rejected_qty: 0,

            remarks: cItem.remarks || "",

            serial_number: batchData.serials.join(", "),

            batch_number: batchData.batch_number,

            expiry_date: batchData.expiry_date,

            mrp: batchData.mrp,

            details_list: details,

            batch_detail_ids: batchData.detail_ids,
          });
        });
      });

      setMappedItems(batchGroupedMapped);
    } catch (err) {
      console.error("Error fetching items for container:", err);

      message.error(
        `Failed to load container items: ${err.message}`,
      );
    } finally {
      setLoading(false);
    }
  },
  [grnItems],
);

  const lookupBatchOrSerialDetails = async (field, value) => {
    const trimmedValue = value?.trim();

    if (!trimmedValue) return;

    const lookupKey = `${field}:${trimmedValue.toLowerCase()}`;
    const now = Date.now();

    if (
      lastLookupRef.current.key === lookupKey &&
      now - lastLookupRef.current.time < 800
    ) {
      console.log("Duplicate lookup blocked:", lookupKey);
      return;
    }

    lastLookupRef.current = {
      key: lookupKey,
      time: now,
    };

    try {
      const query = supabase
        .schema("purchase")
        .from("container_item_details")
        .select("batch_number, serial_number, expiry_date, mrp")
        .not("expiry_date", "is", null);

      if (field === "batch") {
        query.eq("batch_number", trimmedValue);
      } else if (field === "serial") {
        query.eq("serial_number", trimmedValue);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw error;

      if (data) {
        const updates = {};

        if (data.expiry_date) {
          updates.expiry_date = dayjs(data.expiry_date);
        }

        if (data.mrp !== null && data.mrp !== undefined) {
          updates.mrp = Number(data.mrp);
        }

        form.setFieldsValue(updates);

        if (data.expiry_date || data.mrp !== null) {
          message.info(
            `Prefilled MRP & Expiry from DB for ${field}: "${trimmedValue}"`,
          );
        }
      }
    } catch (err) {
      console.error("Error looking up batch/serial:", err);
    }
  };

  const handleBatchChange = (val) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      lookupBatchOrSerialDetails("batch", val);
    }, 300);
  };

  const handleSerialChange = (val) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      lookupBatchOrSerialDetails("serial", val);
    }, 300);
  };

  const fetchBatchAndSerialOptions = async () => {
    try {
      const { data, error } = await supabase
        .schema("purchase")
        .from("container_item_details")
        .select("batch_number, serial_number")
        .limit(100);

      if (!error && data) {
        const batches = Array.from(
          new Set(data.map((d) => d.batch_number).filter(Boolean)),
        ).map((b) => ({ value: b }));
        const serials = Array.from(
          new Set(data.map((d) => d.serial_number).filter(Boolean)),
        ).map((s) => ({ value: s }));

        setBatchOptions(batches);
        setSerialOptions(serials);
      }
    } catch (err) {
      console.error("Error fetching options:", err);
    }
  };

  const handleOpenModal = (itemOrRow, existingMappedRow = null) => {
    // 1. Determine if the first parameter is an already mapped row or a raw GRN item
    const mappedRow =
      existingMappedRow || (itemOrRow.row_key ? itemOrRow : null);
    const itemToEdit = mappedRow
      ? grnItems.find((g) => g.id === mappedRow.id) || mappedRow
      : itemOrRow;

    setEditingItem(itemToEdit);
    setEditingRowId(mappedRow ? mappedRow.row_key : null);

    // 2. Reset form before setting new values to ensure clean state
    form.resetFields();

    // 3. Extract mapped details safely
    if (mappedRow) {
      const isSerialized = Boolean(
        mappedRow.serial_number && mappedRow.serial_number !== "N/A",
      );

      form.setFieldsValue({
        received_qty: mappedRow.received_qty ?? 1,
        rejected_qty: mappedRow.rejected_qty ?? 0,
        batch_number:
          mappedRow.batch_number === "N/A"
            ? ""
            : (mappedRow.batch_number ?? ""),
        serial_number: mappedRow.serial_number ?? "",
        expiry_date: mappedRow.expiry_date
          ? dayjs(mappedRow.expiry_date)
          : null,
        mrp: mappedRow.mrp ?? itemToEdit.unit_price ?? null,
        reject_reason: mappedRow.reject_reason ?? "",
        is_serialized: isSerialized,
        // If passing array of serialized items into ConfigureItemModal
        items:
          mappedRow.details_list?.length > 0
            ? mappedRow.details_list.map((d) => ({
                serial_number: d.serial_number,
                batch_number: d.batch_number,
                mfg_date: d.expiry_date ? dayjs(d.expiry_date) : null,
                mrp: d.mrp,
              }))
            : [],
      });
    } else {
      // Default values for new entry
      form.setFieldsValue({
        received_qty: 1,
        rejected_qty: 0,
        batch_number: "",
        serial_number: "",
        expiry_date: null,
        mrp: itemToEdit.unit_price ?? null,
        reject_reason: "",
      });
    }

    fetchBatchAndSerialOptions();
    setIsModalOpen(true);
  };

  // 4. Process Scanned Barcode
  const processScannedBarcode = useCallback(
    async (scannedCode) => {
      const code = scannedCode?.trim()?.toUpperCase();
      if (!code) return;

      const activeGrnId = grnId || grnData?.id;

      try {
        const { data: containerData, error: containerError } = await supabase
          .schema("purchase")
          .from("containers")
          .select("id, barcode, status, grn_id")
          .eq("grn_id", activeGrnId)
          .eq("barcode", code)
          .maybeSingle();

        if (containerError) throw containerError;

        if (containerData) {
          setActiveContainer(containerData);
          message.success(
            `Active Container Selected: ${containerData.barcode}`,
          );
          await fetchContainerItems(containerData.id);
          return;
        }

        const matchedItem = grnItems.find(
          (item) =>
            item.item_code?.toUpperCase() === code ||
            item.barcode?.toUpperCase() === code,
        );

        if (matchedItem) {
          if (!activeContainer) {
            message.warning(
              "Scan a container barcode first before mapping items!",
            );
            return;
          }
          handleOpenModal(matchedItem);
        } else {
          message.error(
            `No matching container or item found for barcode: "${code}"`,
          );
        }
      } catch (err) {
        console.error("Error handling barcode scan:", err);
        message.error(`Scan error: ${err.message}`);
      }
    },
    [grnId, grnData, grnItems, activeContainer, fetchContainerItems],
  );

  useBarcodeScanner(processScannedBarcode);


const handleModalSave = async (payload) => {
  try {
    if (!activeContainer?.id || !editingItem?.id) {
      throw new Error("Please select a container and item.");
    }

    const containerId = activeContainer.id;
    const grnItemId = editingItem.id;
    const itemId = editingItem.item_id || null;

    // ============================================================
    // STEP 0: DETERMINE WHETHER THIS IS A NEW ENTRY OR AN EDIT
    // ============================================================

    const isEditing = Boolean(editingRowId);

    const existingMappedRow = isEditing
      ? mappedItems.find((row) => row.row_key === editingRowId)
      : null;

    if (isEditing && !existingMappedRow) {
      throw new Error(
        "The existing entry could not be found. Please refresh and try again."
      );
    }

    const receivedQty = payload.is_serialized
      ? payload.items.length
      : Number(payload.received_qty || 1);

    if (!Number.isFinite(receivedQty) || receivedQty <= 0) {
      throw new Error("Please enter a valid quantity greater than zero.");
    }

    // ============================================================
    // STEP 1: PREPARE BATCH
    // ============================================================

    const newBatch = payload.is_serialized
      ? null
      : payload.batch_number?.trim() || null;

    const oldBatch =
      existingMappedRow?.batch_number?.trim() || null;

    const isBatchChanged =
      isEditing && oldBatch !== newBatch;

    // ============================================================
    // STEP 2: CHECK FOR DUPLICATE BATCH
    // ============================================================

    if (
      !payload.is_serialized &&
      newBatch &&
      (!isEditing || isBatchChanged)
    ) {
      const { data: duplicateDetails, error: checkError } =
        await supabase
          .schema("purchase")
          .from("container_item_details")
          .select(
            `
            id,
            qty,
            container_items!inner(
              grn_item_id,
              container_id
            )
          `
          )
          .eq("container_id", containerId)
          .eq("batch_number", newBatch)
          .eq("container_items.grn_item_id", grnItemId);

      if (checkError) throw checkError;

      if (duplicateDetails?.length > 0) {
        const existingQty = duplicateDetails.reduce(
          (sum, row) => sum + Number(row.qty || 0),
          0
        );

        const confirmed = await new Promise((resolve) => {
          Modal.confirm({
            title: "Duplicate Batch Detected",
            icon: (
              <ExclamationCircleOutlined className="text-amber-500" />
            ),
            content: (
              <div className="space-y-2 pt-1 text-slate-600">
                <p>
                  Item{" "}
                  <strong>"{editingItem.item_name}"</strong> with Batch
                  Number <strong>"{newBatch}"</strong> is already available
                  in container{" "}
                  <strong>{activeContainer.barcode}</strong> with a quantity
                  of <strong>{existingQty}</strong>.
                </p>

                <p className="font-medium text-slate-800">
                  Are you sure you want to add{" "}
                  <strong>+{receivedQty}</strong> more to this batch?
                </p>
              </div>
            ),
            okText: "Yes, Add Quantity",
            cancelText: "Cancel Entry",
            okButtonProps: {
              className: "bg-blue-600",
            },
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });

        if (!confirmed) {
          message.info("Entry canceled by user.");
          return;
        }
      }
    }

    // ============================================================
    // STEP 3: FIND OR CREATE PARENT CONTAINER ITEM
    // ============================================================
    //
    // container_items no longer stores quantity.
    // It only represents the relationship:
    //
    // container -> GRN item
    //
    // Quantity is stored in container_item_details.qty.
    // ============================================================

    const { data: existingContainerItem, error: fetchError } =
      await supabase
        .schema("purchase")
        .from("container_items")
        .select("id")
        .eq("container_id", containerId)
        .eq("grn_item_id", grnItemId)
        .maybeSingle();

    if (fetchError) throw fetchError;

    let parentContainerItemId;

    if (existingContainerItem) {
      parentContainerItemId = existingContainerItem.id;

      // Keep item_id synchronized with the parent mapping.
      const { error: updateParentError } = await supabase
        .schema("purchase")
        .from("container_items")
        .update({
          item_id: itemId,
        })
        .eq("id", parentContainerItemId);

      if (updateParentError) throw updateParentError;
    } else {
      // Create parent mapping only.
      const { data: newItem, error: insertError } =
        await supabase
          .schema("purchase")
          .from("container_items")
          .insert({
            container_id: containerId,
            grn_item_id: grnItemId,
            item_id: itemId,
          })
          .select("id")
          .single();

      if (insertError) throw insertError;

      parentContainerItemId = newItem.id;
    }

    // ============================================================
    // STEP 4: PREPARE EXPIRY DATE
    // ============================================================

    let formattedExpiryDate = null;

    if (payload.expiry_date) {
      formattedExpiryDate = payload.expiry_date.format
        ? payload.expiry_date.format("YYYY-MM-DD")
        : payload.expiry_date;
    }

    // ============================================================
    // STEP 5: SAVE SERIALIZED ITEMS
    // ============================================================

    if (payload.is_serialized) {
      const existingDetailIds =
        existingMappedRow?.batch_detail_ids || [];

      // ----------------------------------------------------------
      // EDIT SERIALIZED ENTRY
      // ----------------------------------------------------------

      if (isEditing) {
        if (existingDetailIds.length !== payload.items.length) {
          throw new Error(
            "The number of serial records has changed. " +
              "Please keep the same number of serials while editing."
          );
        }

        for (let i = 0; i < payload.items.length; i++) {
          const item = payload.items[i];
          const detailId = existingDetailIds[i];

          const { error: detailError } = await supabase
            .schema("purchase")
            .from("container_item_details")
            .update({
              container_item_id: parentContainerItemId,
              batch_number: item.batch_number || null,
              serial_number: item.serial_number,
              expiry_date: item.expiry_date || null,
              mrp:
                item.mrp !== undefined &&
                item.mrp !== null &&
                item.mrp !== ""
                  ? Number(item.mrp)
                  : null,
              qty: 1,
              item_id: itemId,
              container_id: containerId,
            })
            .eq("id", detailId)
            .eq("container_id", containerId);

          if (detailError) throw detailError;
        }
      }

      // ----------------------------------------------------------
      // NEW SERIALIZED ENTRY
      // ----------------------------------------------------------

      else {
        const detailPayloads = payload.items.map((item) => ({
          container_item_id: parentContainerItemId,
          batch_number: item.batch_number || null,
          serial_number: item.serial_number,
          expiry_date: item.expiry_date || null,
          mrp:
            item.mrp !== undefined &&
            item.mrp !== null &&
            item.mrp !== ""
              ? Number(item.mrp)
              : null,
          qty: 1,
          item_id: itemId,
          container_id: containerId,
        }));

        const { error: detailError } = await supabase
          .schema("purchase")
          .from("container_item_details")
          .insert(detailPayloads);

        if (detailError) throw detailError;
      }
    }

    // ============================================================
    // STEP 6: SAVE BULK ITEM
    // ============================================================

    else {
      // ----------------------------------------------------------
      // EDIT EXISTING BULK ENTRY
      // ----------------------------------------------------------

      if (isEditing) {
        const detailIds =
          existingMappedRow?.batch_detail_ids || [];

        if (detailIds.length === 0) {
          throw new Error(
            "Existing batch detail ID not found. Please refresh and try again."
          );
        }

        // Update the first detail row.
        const primaryDetailId = detailIds[0];

        const { error: detailError } = await supabase
          .schema("purchase")
          .from("container_item_details")
          .update({
            container_item_id: parentContainerItemId,
            batch_number: newBatch,
            serial_number: null,
            expiry_date: formattedExpiryDate,
            mrp:
              payload.mrp !== undefined &&
              payload.mrp !== null &&
              payload.mrp !== ""
                ? Number(payload.mrp)
                : null,
            qty: receivedQty,
            item_id: itemId,
            container_id: containerId,
          })
          .eq("id", primaryDetailId)
          .eq("container_id", containerId);

        if (detailError) throw detailError;

        // If this batch was previously represented by
        // multiple detail rows, remove the extra rows.
        if (detailIds.length > 1) {
          const extraDetailIds = detailIds.slice(1);

          const { error: deleteError } = await supabase
            .schema("purchase")
            .from("container_item_details")
            .delete()
            .in("id", extraDetailIds)
            .eq("container_id", containerId);

          if (deleteError) throw deleteError;
        }
      }

      // ----------------------------------------------------------
      // NEW BULK ENTRY
      // ----------------------------------------------------------

      else {
        const { error: detailError } = await supabase
          .schema("purchase")
          .from("container_item_details")
          .insert({
            container_item_id: parentContainerItemId,
            batch_number: newBatch,
            serial_number: null,
            expiry_date: formattedExpiryDate,
            mrp:
              payload.mrp !== undefined &&
              payload.mrp !== null &&
              payload.mrp !== ""
                ? Number(payload.mrp)
                : null,
            qty: receivedQty,
            item_id: itemId,
            container_id: containerId,
          });

        if (detailError) throw detailError;
      }
    }

    // ============================================================
    // STEP 7: SUCCESS
    // ============================================================

    message.success(
      isEditing
        ? "Item configuration updated successfully!"
        : `${receivedQty} item(s) configured successfully!`
    );

    setIsModalOpen(false);
    setEditingItem(null);
    setEditingRowId(null);
    form.resetFields();

    await fetchContainerItems(containerId);
    await fetchSavedContainersAndTotals();
  } catch (err) {
    console.error(
      "Error saving container item details:",
      err
    );

    message.error(
      err.message || "Failed to save item configuration."
    );
  }
};

const handleSaveContainerItems = async () => {
  if (!activeContainer) {
    message.error("No container selected!");
    return;
  }

  if (!mappedItems || mappedItems.length === 0) {
    message.warning("No items added to save.");
    return;
  }

  try {
    setSaving(true);

    // ============================================================
    // STEP 1: DELETE EXISTING MAPPINGS
    // ============================================================

    const { error: deleteErr } = await supabase
      .schema("purchase")
      .from("container_items")
      .delete()
      .eq("container_id", activeContainer.id);

    if (deleteErr) throw deleteErr;

    // ============================================================
    // STEP 2: CREATE ONE PARENT PER GRN ITEM
    // ============================================================

    const parentMap = new Map();

    for (const item of mappedItems) {
      const grnItemId = item.id;

      if (!grnItemId) {
        console.warn(
          "Skipping item without GRN item ID:",
          item
        );
        continue;
      }

      if (!parentMap.has(grnItemId)) {
        parentMap.set(grnItemId, {
          container_id: activeContainer.id,
          grn_item_id: grnItemId,
          item_id:
            item.item_id ||
            item.product_id ||
            null,
          remarks: item.remarks || null,
        });
      }
    }

    const parentPayload = Array.from(
      parentMap.values()
    );

    if (parentPayload.length === 0) {
      throw new Error(
        "No valid items found to save."
      );
    }

    // ============================================================
    // STEP 3: INSERT PARENT CONTAINER ITEMS
    // ============================================================

    const {
      data: insertedParents,
      error: parentError,
    } = await supabase
      .schema("purchase")
      .from("container_items")
      .insert(parentPayload)
      .select("id, grn_item_id");

    if (parentError) throw parentError;

    // ============================================================
    // STEP 4: CREATE PARENT ID MAP
    // ============================================================

    const parentIdMap = insertedParents.reduce(
      (acc, parent) => {
        acc[parent.grn_item_id] = parent.id;
        return acc;
      },
      {}
    );

    // ============================================================
    // STEP 5: PREPARE DETAIL ROWS
    // ============================================================

    const detailsPayload = [];

    for (const item of mappedItems) {
      const parentId =
        parentIdMap[item.id];

      if (!parentId) {
        console.warn(
          "Parent container item not found for:",
          item
        );
        continue;
      }

      // ----------------------------------------------------------
      // If this mapped row contains multiple saved detail rows,
      // preserve each individual detail.
      // ----------------------------------------------------------

      if (
        Array.isArray(item.details_list) &&
        item.details_list.length > 0
      ) {
        for (const detail of item.details_list) {
          detailsPayload.push({
            container_item_id: parentId,
            item_id:
              detail.item_id ||
              item.item_id ||
              item.product_id ||
              null,
            batch_number:
              detail.batch_number || null,
            serial_number:
              detail.serial_number || null,
            expiry_date:
              detail.expiry_date || null,
            mrp:
              detail.mrp !== undefined &&
              detail.mrp !== null &&
              detail.mrp !== ""
                ? Number(detail.mrp)
                : null,
            qty: Number(detail.qty || 0),
            container_id: activeContainer.id,
          });
        }

        continue;
      }

      // ----------------------------------------------------------
      // Normal mapped row
      // ----------------------------------------------------------

      const qty = Number(
        item.received_qty ??
          item.packed_qty ??
          item.quantity ??
          0
      );

      if (qty <= 0) {
        console.warn(
          "Skipping item with invalid quantity:",
          item
        );
        continue;
      }

      // Serialized item:
      // serial_number may contain multiple serials separated
      // by commas.
      const serials = item.serial_number
        ? item.serial_number
            .split(",")
            .map((serial) => serial.trim())
            .filter(Boolean)
        : [];

      if (serials.length > 0) {
        serials.forEach((serial) => {
          detailsPayload.push({
            container_item_id: parentId,
            item_id:
              item.item_id ||
              item.product_id ||
              null,
            batch_number:
              item.batch_number || null,
            serial_number: serial,
            expiry_date:
              item.expiry_date || null,
            mrp:
              item.mrp !== undefined &&
              item.mrp !== null &&
              item.mrp !== ""
                ? Number(item.mrp)
                : null,
            qty: 1,
            container_id: activeContainer.id,
          });
        });
      } else {
        // Bulk item
        detailsPayload.push({
          container_item_id: parentId,
          item_id:
            item.item_id ||
            item.product_id ||
            null,
          batch_number:
            item.batch_number || null,
          serial_number: null,
          expiry_date:
            item.expiry_date || null,
          mrp:
            item.mrp !== undefined &&
            item.mrp !== null &&
            item.mrp !== ""
              ? Number(item.mrp)
              : null,
          qty,
          container_id: activeContainer.id,
        });
      }
    }

    // ============================================================
    // STEP 6: INSERT DETAIL ROWS
    // ============================================================

    if (detailsPayload.length === 0) {
      throw new Error(
        "No valid item details found to save."
      );
    }

    const { error: detailError } =
      await supabase
        .schema("purchase")
        .from("container_item_details")
        .insert(detailsPayload);

    if (detailError) throw detailError;

    // ============================================================
    // STEP 7: SUCCESS
    // ============================================================

    message.success(
      `Successfully saved all items to container ${activeContainer.barcode}`
    );

    await fetchContainerItems(
      activeContainer.id
    );

    await fetchSavedContainersAndTotals();
  } catch (err) {
    console.error(
      "Error saving container details:",
      err
    );

    message.error(
      `Failed to save container items: ${err.message}`
    );
  } finally {
    setSaving(false);
  }
};

  const handleRemoveItem = async (rowKey) => {
    const itemToRemove = mappedItems.find((m) => m.row_key === rowKey);
    if (!itemToRemove) return;

    try {
      // If specific batch detail records exist, delete them first
      if (itemToRemove.batch_detail_ids?.length > 0) {
        const { error: detailDelError } = await supabase
          .schema("purchase")
          .from("container_item_details")
          .delete()
          .in("id", itemToRemove.batch_detail_ids);

        if (detailDelError) throw detailDelError;

        // Check if parent container_item has any details left
        const { data: remainingDetails } = await supabase
          .schema("purchase")
          .from("container_item_details")
          .select("id")
          .eq("container_item_id", itemToRemove.container_item_id);

        // If no details remain, delete parent container_items record
        if (!remainingDetails || remainingDetails.length === 0) {
          await supabase
            .schema("purchase")
            .from("container_items")
            .delete()
            .eq("id", itemToRemove.container_item_id);
        }
      } else if (itemToRemove.container_item_id) {
        const { error } = await supabase
          .schema("purchase")
          .from("container_items")
          .delete()
          .eq("id", itemToRemove.container_item_id);

        if (error) throw error;
      }

      message.success("Batch entry removed.");
      await fetchSavedContainersAndTotals();
      if (activeContainer) {
        await fetchContainerItems(activeContainer.id);
      }
    } catch (err) {
      console.error("Error removing row:", err);
      message.error("Failed to delete batch record.");
    }
  };

  if (loadingItems) {
    return (
      <div className="p-12 text-center">
        <Spin description="Loading GRN items..." />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-1">
      {/* HEADER ACTION BAR */}
      <div className="flex justify-between items-center bg-slate-100 p-2 rounded-lg border border-slate-200 shadow-sm">
        <div className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
          Scan & Map Items
        </div>
        <Button
          icon={<UnorderedListOutlined />}
          onClick={() => setIsDrawerOpen(true)}
          className="bg-white border-slate-300 shadow-xs hover:border-slate-400"
        >
          View Pending & Saved Containers{" "}
          <Badge
            count={unmappedContainersCount}
            overflowCount={999}
            style={{
              backgroundColor:
                unmappedContainersCount > 0 ? "#f59e0b" : "#10b981",
            }}
          />
        </Button>
      </div>

      {/* ACTIVE CONTAINER BANNER */}
      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <ActiveContainerBanner
          activeContainer={activeContainer}
          saving={saving}
          onSave={handleSaveContainerItems}
          onDeselect={() => {
            setActiveContainer(null);
            setMappedItems([]);
          }}
        />
      </div>

      {/* SCANNER READY INDICATOR & MANUAL SELECTOR */}
      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <ScannerControlBar
          grnItems={grnItems}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          activeContainer={activeContainer}
          onConfigure={handleOpenModal}
          onManualBarcodeSubmit={processScannedBarcode}
        />
      </div>

      {/* MAPPED ITEMS TABLE */}
      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <MappedItemsTable
          mappedItems={mappedItems}
          loading={loading}
          activeContainer={activeContainer}
          onEdit={handleOpenModal}
          onRemove={handleRemoveItem}
        />
      </div>

      {/* DRAWER FOR PENDING & SAVED CONTAINERS */}
      <PackingControlDrawer
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        totalPendingCount={totalPendingCount}
        pendingSummaryList={pendingSummaryList}
        savedContainers={savedContainers}
        loadingContainers={loadingContainers}
        fetchSavedContainersAndTotals={fetchSavedContainersAndTotals}
        activeContainer={activeContainer}
        setActiveContainer={setActiveContainer}
        fetchContainerItems={fetchContainerItems}
        poRef={grnData?.po_id || "N/A"}
      />

      {/* CONFIGURE / EDIT MODAL */}
      <ConfigureItemModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        handleModalSave={handleModalSave}
        form={form}
        editingItem={editingItem}
        batchOptions={batchOptions}
        serialOptions={serialOptions}
        handleBatchChange={handleBatchChange}
        handleSerialChange={handleSerialChange}
        lookupBatchOrSerialDetails={lookupBatchOrSerialDetails}
        activeContainer={activeContainer}
      />
    </div>
  );
});

MapBoxes.displayName = "MapBoxes";

export default MapBoxes;
