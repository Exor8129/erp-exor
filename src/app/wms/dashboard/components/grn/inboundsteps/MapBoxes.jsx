"use client";

import React, {
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Button, Spin, message, Form, Badge } from "antd";
import { UnorderedListOutlined } from "@ant-design/icons";
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
  const [editingRowId, setEditingRowId] = useState(null); // FIX: Declared missing state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Autocomplete Suggestions & Global Quantities
  const [batchOptions, setBatchOptions] = useState([]);
  const [serialOptions, setSerialOptions] = useState([]);
  const [globalMappedQtyMap, setGlobalMappedQtyMap] = useState({});

  const debounceTimerRef = useRef(null);

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

      const { data: totalContainersData, error: containerErr } = await supabase
        .schema("purchase")
        .from("containers")
        .select("id, barcode, status, grn_id")
        .eq("grn_id", activeGrnId);

      if (containerErr) throw containerErr;
      setAllContainers(totalContainersData || []);

      const { data: cItems, error: cItemsErr } = await supabase
        .schema("purchase")
        .from("container_items")
        .select(
          `
          id,
          container_id,
          grn_item_id,
          accepted_qty,
          rejected_qty,
          containers!inner (
            id,
            barcode,
            grn_id
          )
        `,
        )
        .eq("containers.grn_id", activeGrnId);

      if (cItemsErr) throw cItemsErr;

      const savedContainerMap = {};
      const totalsByGrnItem = {};

      (cItems || []).forEach((row) => {
        if (row.containers) {
          savedContainerMap[row.containers.id] = row.containers;
        }

        const grnItemId = row.grn_item_id;
        const totalQty =
          Number(row.accepted_qty || 0) + Number(row.rejected_qty || 0);
        totalsByGrnItem[grnItemId] =
          (totalsByGrnItem[grnItemId] || 0) + totalQty;
      });

      setSavedContainers(Object.values(savedContainerMap));
      setGlobalMappedQtyMap(totalsByGrnItem);
    } catch (err) {
      console.error("Error fetching containers:", err);
    } finally {
      setLoadingContainers(false);
    }
  }, [grnId, grnData]);

  useEffect(() => {
    fetchGrnItems();
    fetchSavedContainersAndTotals();
  }, [fetchGrnItems, fetchSavedContainersAndTotals]);

  // 3. Fetch Items assigned to Active Container
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
          accepted_qty, 
          rejected_qty, 
          reject_reason, 
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

        if (data && data.length > 0) {
          const initialMapped = data
            .map((cItem) => {
              const masterGrnItem = grnItems.find(
                (g) => g.id === cItem.grn_item_id,
              );
              if (!masterGrnItem) return null;

              const primaryDetail = cItem.container_item_details?.[0] || {};

              return {
                ...masterGrnItem, // <--- This will now spread item_id directly from masterGrnItem
                row_key: `saved_${cItem.id}`,
                container_item_id: cItem.id,
                item_id: masterGrnItem.item_id, // <--- EXPLICITLY INCLUDED HERE
                received_qty:
                  Number(cItem.accepted_qty) + Number(cItem.rejected_qty),
                rejected_qty: Number(cItem.rejected_qty),
                reject_reason: cItem.reject_reason || "",
                remarks: cItem.remarks || "",
                serial_number: primaryDetail.serial_number || "",
                batch_number: primaryDetail.batch_number || "",
                expiry_date: primaryDetail.expiry_date || null,
                mrp: primaryDetail.mrp ? Number(primaryDetail.mrp) : null,
                details_list: cItem.container_item_details || [],
              };
            })
            .filter(Boolean);

          setMappedItems(initialMapped);
        } else {
          setMappedItems([]);
        }
      } catch (err) {
        console.error("Error fetching items for container:", err);
        message.error(`Failed to load container items: ${err.message}`);
      } finally {
        setLoading(false);
      }
    },
    [grnItems],
  );

  const lookupBatchOrSerialDetails = async (field, value) => {
    if (!value || !value.trim()) return;

    try {
      const query = supabase
        .schema("purchase")
        .from("container_item_details")
        .select("batch_number, serial_number, expiry_date, mrp")
        .not("expiry_date", "is", null);

      if (field === "batch") {
        query.eq("batch_number", value.trim());
      } else if (field === "serial") {
        query.eq("serial_number", value.trim());
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

        if (data.expiry_date || data.mrp) {
          message.info(
            `Prefilled MRP & Expiry from DB for ${field}: "${value}"`,
          );
        }
      }
    } catch (err) {
      console.error("Error looking up batch/serial:", err);
    }
  };

  const handleBatchChange = (val) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
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

  const handleOpenModal = (itemToEdit, existingMappedRow = null) => {
    setEditingItem(itemToEdit);
    setEditingRowId(existingMappedRow ? existingMappedRow.row_key : null);

    form.setFieldsValue({
      received_qty: existingMappedRow?.received_qty ?? 1,
      rejected_qty: existingMappedRow?.rejected_qty ?? 0,
      batch_number: existingMappedRow?.batch_number ?? "",
      serial_number: existingMappedRow?.serial_number ?? "",
      expiry_date: existingMappedRow?.expiry_date
        ? dayjs(existingMappedRow.expiry_date)
        : null,
      mrp: existingMappedRow?.mrp ?? itemToEdit.unit_price ?? null,
      reject_reason: existingMappedRow?.reject_reason ?? "",
    });

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

  // Collect serial numbers already added in current mapped items
  const existingSerials = mappedItems
    .map((item) => item.serial_number)
    .filter(Boolean);

  // Database lookup for existing serial number under the same item or globally
  const checkSerialExistsInDb = async (serialNumber) => {
    if (!serialNumber) return false;

    try {
      const { data, error } = await supabase
        .schema("purchase")
        .from("container_item_details")
        .select("id")
        .eq("serial_number", serialNumber.trim())
        .limit(1);

      if (error) {
        console.error("Error checking serial duplicate in DB:", error);
        return false;
      }

      return data && data.length > 0;
    } catch (err) {
      console.error("Database check failed:", err);
      return false;
    }
  };


  const handleModalSave = async (payload) => {
    console.log("Modal Save Payload:", payload);
    try {
      const containerId = activeContainer.id;
      const grnItemId = editingItem.id;
      const itemId = editingItem.item_id || null;

      const receivedQty = payload.is_serialized
        ? payload.items.length
        : Number(payload.received_qty || 1);

      // =========================================================================
      // STEP 1: UPSERT INTO `purchase.container_items`
      // =========================================================================
      const { data: existingContainerItem, error: fetchError } = await supabase
        .schema("purchase")
        .from("container_items")
        .select("id, accepted_qty")
        .eq("container_id", containerId)
        .eq("grn_item_id", grnItemId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let parentContainerItemId;

      if (existingContainerItem) {
        const updatedAcceptedQty =
          Number(existingContainerItem.accepted_qty || 0) + receivedQty;

        const { data: updatedItem, error: updateError } = await supabase
          .schema("purchase")
          .from("container_items")
          .update({
            accepted_qty: updatedAcceptedQty,
            item_id: itemId,
          })
          .eq("id", existingContainerItem.id)
          .select("id")
          .single();

        if (updateError) throw updateError;
        parentContainerItemId = updatedItem.id;
      } else {
        const { data: newItem, error: insertError } = await supabase
          .schema("purchase")
          .from("container_items")
          .insert({
            container_id: containerId,
            grn_item_id: grnItemId,
            accepted_qty: receivedQty,
            rejected_qty: 0,
            item_id: itemId,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        parentContainerItemId = newItem.id;
      }

      // =========================================================================
      // STEP 2: BULK INSERT INTO `purchase.container_item_details`
      // =========================================================================
      if (payload.is_serialized) {
        // Map every scanned serial along with its custom Batch Number, MRP, and Date
        const detailPayloads = payload.items.map((item) => ({
          container_item_id: parentContainerItemId,
          batch_number: item.batch_number || null,
          serial_number: item.serial_number,
          expiry_date: item.mfg_date,
          mrp: item.mrp ? Number(item.mrp) : null,
          qty: 1,
          item_id: itemId,
          container_id: activeContainer.id,

        }));

        const { error: detailError } = await supabase
          .schema("purchase")
          .from("container_item_details")
          .insert(detailPayloads);

        if (detailError) throw detailError;
      } else {
        // Non-serialized bulk insert logic
        let formattedExpiryDate = null;
        if (payload.expiry_date) {
          formattedExpiryDate = payload.expiry_date.format("YYYY-MM-DD");
        }

        const { error: detailError } = await supabase
          .schema("purchase")
          .from("container_item_details")
          .insert({
            container_item_id: parentContainerItemId,
            batch_number: payload.batch_number || null,
            serial_number: null,
            expiry_date: formattedExpiryDate,
            mrp: payload.mrp ? Number(payload.mrp) : null,
            qty: receivedQty,
            item_id: itemId,
            container_id: activeContainer.id,

          });

        if (detailError) throw detailError;
      }

      message.success(`${receivedQty} item(s) configured successfully!`);
      setIsModalOpen(false);
      form.resetFields();

      await fetchContainerItems(activeContainer.id);
      await fetchSavedContainersAndTotals();
    } catch (err) {
      console.error("Error saving container item details:", err);
      message.error(err.message || "Failed to save item configuration.");
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

      // 1. Delete existing container items (Cascade automatically deletes details)
      const { error: deleteErr } = await supabase
        .schema("purchase")
        .from("container_items")
        .delete()
        .eq("container_id", activeContainer.id);

      if (deleteErr) throw deleteErr;

      // 2. Consolidate mapped items by grn_item_id to prevent constraint violation
      const parentMap = new Map();

      for (const item of mappedItems) {
        const grnItemId = item.id;
        const received = Number(item.received_qty || 0);
        const rejected = Number(item.rejected_qty || 0);
        const accepted = Math.max(0, received - rejected);

        if (!parentMap.has(grnItemId)) {
          parentMap.set(grnItemId, {
            container_id: activeContainer.id,
            grn_item_id: grnItemId,
            item_id: item.item_id || item.product_id || null,
            accepted_qty: accepted,
            rejected_qty: rejected,
            reject_reason: item.reject_reason || null,
            remarks: item.remarks || null,
          });
        } else {
          // Aggregate quantities if the same grn_item_id appears multiple times
          const existing = parentMap.get(grnItemId);
          existing.accepted_qty += accepted;
          existing.rejected_qty += rejected;
        }
      }

      const parentPayload = Array.from(parentMap.values());

      // 3. Batch insert unique parent rows into container_items
      const { data: insertedParents, error: parentError } = await supabase
        .schema("purchase")
        .from("container_items")
        .insert(parentPayload)
        .select("id, grn_item_id");

      if (parentError) throw parentError;

      // Build lookup map: grn_item_id -> container_item.id
      const parentIdMap = insertedParents.reduce((acc, parent) => {
        acc[parent.grn_item_id] = parent.id;
        return acc;
      }, {});

      // 4. Prepare detailed rows (each split/batch record goes to container_item_details)
      const detailsPayload = mappedItems.map((item) => {
        const received = Number(item.received_qty || 0);
        const rejected = Number(item.rejected_qty || 0);
        const accepted = Math.max(0, received - rejected);

        return {
          container_item_id: parentIdMap[item.id],
          item_id: item.item_id || item.product_id || null,
          batch_number: item.batch_number || null,
          serial_number: item.serial_number || null,
          expiry_date: item.expiry_date || null,
          mrp: item.mrp ? Number(item.mrp) : null,
          qty: accepted > 0 ? accepted : 1,
        };
      });

      // 5. Batch insert into container_item_details
      const { error: detailError } = await supabase
        .schema("purchase")
        .from("container_item_details")
        .insert(detailsPayload);

      if (detailError) throw detailError;

      message.success(
        `Successfully saved all items to container ${activeContainer.barcode}`,
      );

      await fetchContainerItems(activeContainer.id);
      await fetchSavedContainersAndTotals();
    } catch (err) {
      console.error("Error saving container details:", err);
      message.error(`Failed to save container items: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // FIX: Match and remove using `row_key` instead of `id`
  const handleRemoveItem = async (rowKey) => {
    const itemToRemove = mappedItems.find((m) => m.row_key === rowKey);
    if (itemToRemove?.container_item_id) {
      try {
        const { error } = await supabase
          .schema("purchase")
          .from("container_items")
          .delete()
          .eq("id", itemToRemove.container_item_id);

        if (error) throw error;
        await fetchSavedContainersAndTotals();
      } catch (err) {
        console.error("Error removing row:", err);
        message.error("Failed to delete record.");
        return;
      }
    }
    setMappedItems((prev) => prev.filter((item) => item.row_key !== rowKey));
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
      editingItem={editingItem}
      form={form}
      handleModalSave={handleModalSave}
      batchOptions={batchOptions}
      serialOptions={serialOptions}
      handleBatchChange={handleBatchChange}
      handleSerialChange={handleSerialChange}
      lookupBatchOrSerialDetails={lookupBatchOrSerialDetails}
      existingSerials={existingSerials}
      checkSerialExistsInDb={checkSerialExistsInDb}
    />
  </div>
);
});

MapBoxes.displayName = "MapBoxes";

export default MapBoxes;
