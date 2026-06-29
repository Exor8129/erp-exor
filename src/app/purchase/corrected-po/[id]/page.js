"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

import HeaderCard from "../components/HeaderCard";
import SummaryCards from "../components/SummaryCards";
import CorrectionTable from "../components/CorrectionTable";
import TotalSummary from "../components/TotalSummary";
import FooterActions from "../components/FooterActions";

export default function CorrectedPOPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (id) {
      fetchPO();
    }
  }, [id]);

  const fetchPO = async () => {
    try {
      setLoading(true);

      const { data: poData, error: poError } = await supabase
        .schema("purchase")
        .from("purchase_orders")
        .select("*")
        .eq("id", id)
        .single();

      if (poError) throw poError;

      setPo(poData);

      const { data: itemData, error: itemError } = await supabase
        .schema("purchase")
        .from("purchase_order_items")
        .select("*")
        .eq("po_id", id)
        .order("created_at");

      if (itemError) throw itemError;

      // Inside fetchPO in CorrectedPOPage
      const mappedItems = itemData.map((item) => {
        const factor = Number(item.conversion_factor ?? 1);
        const qty = Number(item.qty || 0);

        return {
          ...item,
          ordered_qty: qty,

          // Split the received tracking fields
          received_qty: qty, // Full parent units (e.g., Cases)
          received_loose_qty: 0, // Open loose units (e.g., Packs)

          attention: false,
          unit: item.unit || "Nos",
          conversion_factor: factor,
        };
      });

      setItems(mappedItems);

      setItems(mappedItems);

      setItems(mappedItems);
    } catch (err) {
      console.error("Fetch PO Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    let missing = 0;
    let partial = 0;
    let added = 0;
    let attention = 0;

    items.forEach((item) => {
      if (item.attention) attention++;

      if (item.ordered_qty > 0 && item.received_qty === 0) {
        missing++;
      } else if (item.received_qty < item.ordered_qty) {
        partial++;
      } else if (item.ordered_qty === 0 && item.received_qty > 0) {
        added++;
      }
    });

    return {
      missing,
      partial,
      added,
      attention,
    };
  }, [items]);

  const originalTotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + Number(item.ordered_qty) * Number(item.rate),
      0,
    );
  }, [items]);

  const correctedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const factor = item.conversion_factor || 1;
      const parentQty = Number(item.received_qty || 0);
      const looseQty = Number(item.received_loose_qty || 0);

      // Total quantity normalized into parent unit notation
      const totalReceivedInParentUnits = parentQty + looseQty / factor;
      const rate = Number(item.rate || 0);

      return sum + totalReceivedInParentUnits * rate;
    }, 0);
  }, [items]);

  const handleSaveDraft = async () => {
    console.log("Draft Items:", items);
    alert("Draft Saved");
  };

  const handleFinalize = async () => {
    alert("Finalize Later");
  };

  if (loading) {
    return <div className="p-6">Loading Purchase Order...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <HeaderCard po={po} />

        <SummaryCards
          missingCount={summary.missing}
          partialCount={summary.partial}
          addedCount={summary.added}
          attentionCount={summary.attention}
        />

        <CorrectionTable items={items} setItems={setItems} />

        <TotalSummary
          originalTotal={originalTotal}
          correctedTotal={correctedTotal}
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
