"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

import HeaderCard from "../components/HeaderCard";
import SummaryCards from "../components/SummaryCards";
import GRNItemsTable from "../components/GRNItemsTable.jsx";
import TotalSummary from "../components/TotalSummary";
import FooterActions from "../components/FooterActions";
import GRNModal from "../components/GRNModal";

export default function GRNPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState(null);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (id) fetchPO();
  }, [id]);

  const fetchPO = async () => {
    try {
      setLoading(true);

// =========================
// PO HEADER
// =========================
// 1. Fetch the raw purchase order from the purchase schema
const { data: poData, error: poError } = await supabase
  .schema("purchase")
  .from("purchase_orders")
  .select("*") 
  .eq("id", id)
  .single();

if (poError) throw poError;

// 2. Fetch the vendor details from the public schema using the supplier_id
if (poData?.supplier_id) {
  const { data: vendorData, error: vendorError } = await supabase
    .from("vendors") // Defaults to public schema automatically
    .select("vendor_name")
    .eq("id", poData.supplier_id)
    .single();

  if (!vendorError && vendorData) {
    // Dynamically inject it into the object so your HeaderCard can read it
    poData.vendors = {
      vendor_name: vendorData.vendor_name
    };
  }
}

setPo(poData);
      // =========================
      // PO ITEMS
      // =========================
      const { data: itemData, error: itemError } = await supabase
        .schema("purchase")
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", id)
        .order("created_at");

      if (itemError) throw itemError;

      // =========================
      // GRN DATA (ALL RECEIPTS)
      // =========================
      const { data: grnData, error: grnFetchError } = await supabase
        .schema("purchase")
        .from("grn")
        .select("*")
        .eq("po_id", id);

      if (grnFetchError) throw grnFetchError;

      let grnItems = [];

      // Only query items if historical GRN records actually exist
      if (grnData && grnData.length > 0) {
        const { data: fetchedGrnItems, error: grnItemsError } = await supabase
          .schema("purchase")
          .from("grn_items")
          .select("*")
          .in(
            "grn_id",
            grnData.map((g) => g.id),
          );

        if (grnItemsError) throw grnItemsError;
        grnItems = fetchedGrnItems || [];
      }

      // =========================
      // GROUP + COMPUTE
      // =========================
// =========================
// GROUP + COMPUTE (Inside your main GRNPage component)
// =========================
const mappedItems = itemData.map((item) => {
  const relatedGrnItems = grnItems.filter(
    (r) => r.po_item_id === item.id
  );

  // Calculate total received quantity
  const totalReceivedQty = relatedGrnItems.reduce(
    (sum, r) => sum + Number(r.received_qty || 0),
    0
  );

  const historyWithDates = relatedGrnItems.map((childItem) => {
    const parentHeader = grnData.find(
      (g) => g.id === childItem.grn_id
    );

    return {
      ...childItem,
      grn_no: parentHeader?.grn_no || null,
      received_date: parentHeader?.received_date || null,
      invoice_date: parentHeader?.invoice_date || null,
    };
  });

  return {
    ...item,
    ordered_qty: Number(item.qty || 0),
    unit: item.unit || "Nos",
    total_received_qty: totalReceivedQty,
    balance_qty: Number(item.qty || 0) - totalReceivedQty,
    grn_history: historyWithDates,
  };
});

      setItems(mappedItems);
    } catch (err) {
      console.error("GRN Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SUMMARY CARDS
  // =========================
  const summary = useMemo(() => {
    let pending = 0;
    let partial = 0;
    let complete = 0;
    let over = 0;

    items.forEach((item) => {
      if (item.total_received_qty === 0) pending++;
      else if (item.total_received_qty < item.ordered_qty) partial++;
      else if (item.total_received_qty === item.ordered_qty) complete++;
      else over++;
    });

    return { pending, partial, complete, over };
  }, [items]);

  const handleSaveDraft = async () => {
    console.log("GRN Draft");
    alert("Draft Saved");
  };

  const handleFinalize = async () => {
    alert("Finalize GRN");
  };

  if (loading) {
    return <div className="p-6">Loading GRN...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-2">
          <HeaderCard po={po} />
        </div>

        <div className="mb-2">
          <SummaryCards
            missingCount={summary.pending}
            partialCount={summary.partial}
            addedCount={summary.over}
            attentionCount={summary.complete}
            onAddClick={() => setIsModalOpen(true)}
          />
        </div>

        <div className="mb-2">
          <GRNItemsTable items={items} />
        </div>

        <div className="mb-2">
          <TotalSummary />
        </div>

        <GRNModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          po={po}
          items={items}
          setItems={setItems}
        />

        <FooterActions
          onBack={() => router.back()}
          onSaveDraft={handleSaveDraft}
          onFinalize={handleFinalize}
        />
      </div>
    </div>
  );
}
