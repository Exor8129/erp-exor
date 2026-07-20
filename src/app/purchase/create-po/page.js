"use client";

import { useEffect, useState, useMemo } from "react"; // Added useMemo here
import PoHeader from "./utils/header";
import PartySelection from "./utils/partyselection";
import ProductSelection from "./utils/itemselection";
import { supabase } from "../../lib/supabase";
import PaymentRequestCard from "./utils/paymentrequest";
import { Switch } from "antd";
import POFooter from "./utils/footer";
import ShippingAddress from "./utils/shippingaddress";
import { useRouter } from "next/navigation";

const createEmptyRow = () => ({
  id: `${Date.now()}-${Math.random()}`,
  productId: null,
  productName: "",
  qty: 1,
  unit: "",
  purchaseUom: "",
  conversionFactor: 1,
  hsn: "",
  tax: "",
  rate: 0,
});

export default function CreatePOPage({
  mode = "create", // 'create' or 'edit'
  poId = null, // If editing, the ID of the PO to load
}) {
  const router = useRouter();
  // Mounting Guard State
  const [mounted, setMounted] = useState(false);

  // PoHeader States
  const [poNumber, setPoNumber] = useState("Loading...");
  const [poDate, setPoDate] = useState("");

  // PartySelection States
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  //  tracking

  // ProductSelection States
  const [productOptions, setProductOptions] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);
  const [items, setItems] = useState([]);
  const [tempProductModalOpen, setTempProductModalOpen] = useState(false);

  const [tempProductRowId, setTempProductRowId] = useState(null);

  const [tempProduct, setTempProduct] = useState({
    name: "",
    hsn: "",
    tax: 0,
    unit: "Nos",
  });

  // PaymentRequest States
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);

  // Shipping Address States
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState(null);

  // Live Financial Calculations
  const liveGrandTotal = useMemo(() => {
    const total = items.reduce((sum, item) => {
      if (!item.productId) return sum;

      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const taxRate = Number(item.tax || 0);

      const baseAmount = qty * rate;

      return sum + baseAmount * (1 + taxRate / 100);
    }, 0);

    return Math.round(total);
  }, [items]);

  const totalItems = useMemo(() => {
    return items.filter((item) => item.productId).length;
  }, [items]);

  const totalQty = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [items]);

  // Lookup for Vendor Name
  const selectedVendorName = selectedVendor?.name || "No Vendor Selected";

  const resetForm = () => {
    setSelectedVendor(null);
    setSelectedShippingAddress(null);
    setShowPaymentRequest(false);

    const initialRow = createEmptyRow();
    setItems([initialRow]);
    setActiveRowId(initialRow.id);

    // Generate new PO Number
    loadPoNumber();

    // Reset date
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();

    setPoDate(`${day}-${month}-${year}`);
  };

  const loadPoNumber = async () => {
    try {
      const currentYear = new Date().getFullYear();

      const { data, error } = await supabase
        .schema("purchase")
        .from("purchase_orders")
        .select("po_number")
        .like("po_number", `PO-${currentYear}-%`);

      if (error) throw error;

      const lastNumber =
        data?.length > 0
          ? Math.max(
              ...data.map((row) => {
                const parts = row.po_number.split("-");
                return Number(parts[2]) || 0;
              }),
            )
          : 2000;

      setPoNumber(`PO-${currentYear}-${lastNumber + 1}`);
    } catch (err) {
      console.error(err);
      setPoNumber("PO-ERROR");
    }
  };

  // Fetch PO number sequence
  useEffect(() => {
    if (mode === "create") {
      loadPoNumber();
    }
  }, [mode]);

const loadPO = async () => {
    try {
      const { data: poHeader, error: headerError } = await supabase
        .schema("purchase")
        .from("purchase_orders")
        .select("*")
        .eq("id", poId)
        .single();

      if (headerError) throw headerError;

      const { data: poItems, error: itemError } = await supabase
        .schema("purchase")
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", poId);

      if (itemError) throw itemError;

      setPoNumber(poHeader.po_number);
      setPoDate(new Date(poHeader.created_at).toLocaleDateString("en-GB"));

      setShowPaymentRequest(poHeader.payment_required);

      setSelectedShippingAddress(
        shippingAddresses.find((x) => x.id === poHeader.shipping_address_id) ||
          null,
      );

      const supplier =
        suppliers.find((x) => x.id === poHeader.supplier_id) || null;

      setSelectedVendor(supplier);

      // =======================================================
      // FIXED: Map conversion fields into component row state
      // =======================================================
      setItems(
        poItems.map((item) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          qty: item.qty,
          rate: item.rate,
          tax: item.tax,
          hsn: item.product_code,
          
          // These two were missing from your state payload map:
          purchaseUom: item.unit || "", 
          conversionFactor: Number(item.conversion_factor ?? 1),
          
          // Also fetch available item master unit options for drop-downs if applicable
          conversions: productOptions.find((p) => p.id === item.product_id)?.conversions || []
        })),
      );
    } catch (err) {
      console.error("Error hydrating PO data for edit mode:", err);
    }
  };

  useEffect(() => {
    if (
      mode !== "edit" ||
      !poId ||
      suppliers.length === 0 ||
      shippingAddresses.length === 0
    ) {
      return;
    }

    loadPO();
  }, [mode, poId, suppliers, shippingAddresses]);

  // Hydrate Client Data & Initial Records Safely
  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
    document.body.style.overflow = "unset";
  }

    fetchSuppliers();
    fetchProducts();
    fetchShippingAddresses();

    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();

    setPoDate(`${day}-${month}-${year}`);

    if (mode === "create") {
      const initialRow = createEmptyRow();

      setItems([initialRow]);
      setActiveRowId(initialRow.id);
    }
  }, [mode]);

  // PartySelection Data Fetcher
  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    const { data, error } = await supabase
      .from("vendors")
      .select(
        `
        id,
        vendor_id,
        vendor_name,
        vendor_under,
        city,
        state,
        contact_person,
        mobile_number,
        credit_period
      `,
      )
      .eq("status", "Active")
      .in("vendor_under", ["Sundry Creditors", "Sundry Debtors"])
      .order("vendor_name", { ascending: true });

    if (error) {
      console.error("Supplier fetch error:", error);
      setLoadingSuppliers(false);
      return;
    }

    const formatted = (data || []).map((vendor) => ({
      id: vendor.id,
      name: vendor.vendor_name,
      code: vendor.vendor_id,
      location: [vendor.city, vendor.state].filter(Boolean).join(", "),
      contactPerson: vendor.contact_person,
      mobileNumber: vendor.mobile_number,
      creditPeriod: vendor.credit_period,
      vendorUnder: vendor.vendor_under,
    }));

    setSuppliers(formatted);
    setLoadingSuppliers(false);
  };

  // Shipping Address Data Fetcher

  const fetchShippingAddresses = async () => {
    try {
      setLoadingAddresses(true);

      const { data, error } = await supabase
        .from("company_addresses")
        .select("*")
        .eq("is_active", true)
        .order("address_name");

      if (error) throw error;

      const formatted = (data || []).map((row) => ({
        id: row.id,

        name: row.address_name,

        company: row.company_name,

        addressLine1: row.address_line1,

        addressLine2: row.address_line2,

        city: row.city,

        state: row.state,

        pincode: row.pincode,

        gstin: row.gstin,
      }));

      setShippingAddresses(formatted);
    } catch (err) {
      console.error("Shipping Address Fetch Error:", err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // ProductSelection Data Fetcher
  const fetchProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("item_master")
      .select(
        `
    id,
    item_name,
    guid,
    alter_id,
    uom,
    hsn,
    tax,

    item_unit_conversions(
        from_unit,
        to_unit,
        factor
    )
`,
      )
      .eq("status", true)
      .order("item_name", { ascending: true });

    if (error) {
      console.error("Product fetch error:", error);
      setLoadingProducts(false);
      return;
    }

    const formatted = (data || []).map((item) => ({
      id: item.id,
      name: item.item_name || "",
      code: String(item.id),

      // Base stock unit
      unit: item.uom || "Nos",

      // All available conversions
      conversions: item.item_unit_conversions || [],

      hsn: item.hsn || "",
      tax: item.tax || "",
    }));

    setProductOptions(formatted);
    setLoadingProducts(false);
  };
  const handleAddTemporaryProduct = () => {
    if (!tempProduct.name.trim()) return;

    const product = {
      id: `TEMP-${Date.now()}`,
      name: tempProduct.name,
      hsn: tempProduct.hsn,
      tax: tempProduct.tax,
      unit: tempProduct.unit,
      purchaseUnit: tempProduct.unit,
      conversionFactor: 1,
      temporary: true,
    };

    // FIX: Use tempProductRowId instead of the non-existent 'row.id'
    // If no specific row is being edited, update the activeRowId or add a new item
    const targetRowId = tempProductRowId || activeRowId;

    if (targetRowId) {
      updateItem(targetRowId, {
        productId: product.id,
        productName: product.name,
        hsn: product.hsn,
        tax: product.tax,
        unit: product.unit,
        purchaseUom: product.purchaseUnit,
        conversionFactor: 1,
      });
    } else {
      addItem(product);
    }

    // Reset temp form state
    setTempProduct({
      name: "",
      hsn: "",
      tax: 0,
      unit: "Nos",
    });

    setTempProductModalOpen(false);
  };

  // Grid Controls
  const addItem = (initialProduct = null) => {
    const firstConversion = initialProduct?.conversions?.[0];

    const newRow = {
      ...createEmptyRow(),

      ...(initialProduct
        ? {
            productId: initialProduct.id,
            productName: initialProduct.name,

            // Base stock unit
            unit: initialProduct.unit,

            // Store all available conversions for this product
            conversions: initialProduct.conversions || [],

            // Default purchase unit
            purchaseUom: firstConversion
              ? firstConversion.from_unit
              : initialProduct.unit,

            // Default conversion factor
            conversionFactor: firstConversion
              ? Number(firstConversion.factor)
              : 1,

            hsn: initialProduct.hsn,
            tax: initialProduct.tax || 0,
            rate: initialProduct.basePrice || 0,
          }
        : {}),
    };

    setItems((prev) => [...prev, newRow]);
    setActiveRowId(newRow.id);
  };

  const removeItem = (id) => {
    setItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (filtered.length === 0) {
        const replacement = createEmptyRow();
        setActiveRowId(replacement.id);
        return [replacement];
      }
      return filtered;
    });
  };

  const updateItem = (id, updates) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
        <div className="text-slate-400 text-sm font-medium animate-pulse">
          Initializing Procurement Grid...
        </div>
      </div>
    );
  }

  const savePO = async (status) => {
    console.log("STATUS BEING SAVED:", status);
    try {
      if (!selectedVendor?.id) {
        alert("Please select supplier");
        return null;
      }

      const validItems = items.filter((i) => i.productId);

      if (validItems.length === 0) {
        alert("Please add at least one item");
        return null;
      }

      let poData;

      // ==========================
      // CREATE MODE
      // ==========================
      if (mode === "create") {
        const { data, error } = await supabase
          .schema("purchase")
          .from("purchase_orders")
          .insert({
            po_number: poNumber,
            supplier_id: selectedVendor.id,
            shipping_address_id: selectedShippingAddress?.id || null,
            status,
            grand_total: liveGrandTotal,
            total_qty: totalQty,
            payment_required: showPaymentRequest,
            qty_only_mode: true,
          })
          .select()
          .single();

        if (error) throw error;

        poData = data;
      }

      // ==========================
      // EDIT MODE
      // ==========================
      else {
        const { data, error } = await supabase
          .schema("purchase")
          .from("purchase_orders")
          .update({
            supplier_id: selectedVendor.id,
            shipping_address_id: selectedShippingAddress?.id || null,
            status,
            grand_total: liveGrandTotal,
            total_qty: totalQty,
            payment_required: showPaymentRequest,
          })
          .eq("id", poId)
          .select()
          .single();

        if (error) throw error;

        poData = data;

        // Delete existing lines
        const { error: deleteError } = await supabase
          .schema("purchase")
          .from("purchase_order_items")
          .delete()
          .eq("po_id", poId);

        if (deleteError) throw deleteError;
      }

      // ==========================
      // SAVE ITEMS
      // ==========================
      const poItems = validItems.map((item) => ({
        po_id: mode === "edit" ? poId : poData.id,

        product_id: typeof item.productId === "number" ? item.productId : null,

        product_name: item.productName,

        product_code: item.hsn || null,

        unit: item.purchaseUom,

        qty: Number(item.qty || 0),

        // NEW
        conversion_factor: Number(item.conversionFactor || 1),

        // NEW
        stock_qty: Number(item.qty || 0) * Number(item.conversionFactor || 1),

        rate: Number(item.rate || 0),

        tax: Number(item.tax || 0),

        amount:
          Number(item.qty || 0) *
          Number(item.rate || 0) *
          (1 + Number(item.tax || 0) / 100),
      }));

      const { error: itemError } = await supabase
        .schema("purchase")
        .from("purchase_order_items")
        .insert(poItems);

      if (itemError) throw itemError;

      return poData;
    } catch (err) {
      console.error("FULL ERROR:", err);
      console.error("MESSAGE:", err?.message);
      console.error("DETAILS:", err?.details);
      console.error("HINT:", err?.hint);
      console.error("CODE:", err?.code);

      throw err;
    }
  };

  const handleSaveDraft = async () => {
    try {
      await savePO("draft");

      if (mode === "edit") {
        alert("Draft Updated");
        router.push("/purchase");
        return;
      }

      alert("Draft Saved");
      resetForm();
    } catch {
      alert("Unable to save draft");
    }
  };

  const handleCreatePO = async () => {
    try {
      await savePO(mode === "edit" ? "Updated" : "Created");

      if (mode === "edit") {
        alert("Purchase Order Updated");
        router.push("/purchase");
        return;
      }

      alert("Purchase Order Created");
      resetForm();
    } catch {
      alert(mode === "edit" ? "Unable to update PO" : "Unable to create PO");
    }
  };

  const handleCancel = () => {
    if (confirm("Discard current Purchase Order?")) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800 space-y-4">
      <PoHeader poNumber={poNumber} poDate={poDate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PartySelection
          suppliers={suppliers}
          loadingSuppliers={loadingSuppliers}
          value={selectedVendor}
          onChange={setSelectedVendor}
          refreshSuppliers={fetchSuppliers}
        />

        <ShippingAddress
          addresses={shippingAddresses}
          loading={loadingAddresses}
          value={selectedShippingAddress}
          onChange={setSelectedShippingAddress}
        />
      </div>

      <ProductSelection
        items={items}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        productOptions={productOptions}
        loadingProducts={loadingProducts}
        activeRowId={activeRowId}
        setActiveRowId={setActiveRowId}
        // ADD THESE MISSING PROPS:
        tempProductModalOpen={tempProductModalOpen}
        setTempProductModalOpen={setTempProductModalOpen}
        setTempProductRowId={setTempProductRowId}
        tempProduct={tempProduct}
        setTempProduct={setTempProduct}
        handleAddTemporaryProduct={handleAddTemporaryProduct}
      />
      <div className="flex items-center gap-3">
        <span>Payment Request Required</span>
        <Switch checked={showPaymentRequest} onChange={setShowPaymentRequest} />
      </div>

      {showPaymentRequest && (
        <PaymentRequestCard
          poNumber={poNumber}
          vendorName={selectedVendorName}
          totalAmount={liveGrandTotal}
          alreadyPaid={0}
          onSubmit={(payload) =>
            console.log("Submitting Request Signature: ", payload)
          }
        />
      )}

      <POFooter
        totalItems={totalItems}
        totalQty={totalQty}
        grandTotal={liveGrandTotal}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleCreatePO}
        onCancel={handleCancel}
        mode={mode}
      />
    </div>
  );
}
