"use client";

import { useEffect, useState, useMemo } from "react"; // Added useMemo here
import PoHeader from "./utils/header";
import PartySelection from "./utils/partyselection";
import ProductSelection from "./utils/itemselection";
import { supabase } from "../../lib/supabase";
import PaymentRequestCard from "./utils/paymentrequest";
import { Switch } from "antd";
import POFooter from "./utils/footer";

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

export default function CreatePOPage() {
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

  // Fetch PO number sequence
  useEffect(() => {
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

    loadPoNumber();
  }, []);

  // Hydrate Client Data & Initial Records Safely
  useEffect(() => {
    setMounted(true);
    fetchSuppliers();
    fetchProducts();

    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    setPoDate(`${day}-${month}-${year}`);

    const initialRow = createEmptyRow();
    setItems([initialRow]);
    setActiveRowId(initialRow.id);
  }, []);

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
        purchase_unit,
        conversion_factor,
        hsn,
        tax
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
      code: item.alter_id
        ? String(item.alter_id)
        : item.guid || `ITEM-${item.id}`,
      unit: item.uom || "Nos",
      purchaseUnit: item.purchase_unit || item.uom || "Nos",
      conversionFactor: item.conversion_factor || 1,
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
    const newRow = {
      ...createEmptyRow(),
      ...(initialProduct
        ? {
            productId: initialProduct.id,
            productName: initialProduct.name,
            unit: initialProduct.unit,
            purchaseUom: initialProduct.purchaseUnit,
            conversionFactor: initialProduct.conversionFactor || 1,
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

  const addNewRowIfNeeded = (currentId) => {
    const currentIndex = items.findIndex((item) => item.id === currentId);
    const isLastRow = currentIndex === items.length - 1;

    if (isLastRow) {
      const newRow = createEmptyRow();
      setItems((prev) => [...prev, newRow]);
      setActiveRowId(newRow.id);
    }
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

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800 space-y-4">
      <PoHeader poNumber={poNumber} poDate={poDate} />

      <PartySelection
        suppliers={suppliers}
        loadingSuppliers={loadingSuppliers}
        value={selectedVendor}
        onChange={setSelectedVendor}
      />

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
      />
    </div>
  );
}
