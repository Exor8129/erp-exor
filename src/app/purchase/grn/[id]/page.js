"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Tag } from "antd";
import { AlertTriangle } from "lucide-react";
import { Helix } from "ldrs/react";
import "ldrs/react/Helix.css";

import { supabase } from "../../../lib/supabase";
import HeaderCard from "../components/HeaderCard";
import SummaryCards from "../components/SummaryCards";
import GRNItemsTable from "../components/GRNItemsTable.jsx";
import TotalSummary from "../components/TotalSummary";
import FooterActions from "../components/FooterActions";
import GRNModal from "../components/GRNModal";
import DiscrepancyDrawer from "../components/discrepancyDrawer";

export default function GRNPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState(null);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (id) fetchPO();
  }, [id]);

  const fetchPO = async () => {
    try {
      setLoading(true);

      // =========================
      // PO HEADER
      // =========================
      const { data: poData, error: poError } = await supabase
        .schema("purchase")
        .from("purchase_orders")
        .select("*")
        .eq("id", id)
        .single();

      if (poError) throw poError;

      if (poData?.supplier_id) {
        const { data: vendorData, error: vendorError } = await supabase
          .from("vendors")
          .select("vendor_name")
          .eq("id", poData.supplier_id)
          .single();

        if (!vendorError && vendorData) {
          poData.vendors = {
            vendor_name: vendorData.vendor_name,
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

      if (grnData && grnData.length > 0) {
        const { data: fetchedGrnItems, error: grnItemsError } = await supabase
          .schema("purchase")
          .from("grn_items")
          .select("*")
          .in(
            "grn_id",
            grnData.map((g) => g.id)
          );

        if (grnItemsError) throw grnItemsError;
        grnItems = fetchedGrnItems || [];
      }

      // =========================
      // GROUP + COMPUTE
      // =========================
      const mappedItems = itemData.map((item) => {
        const relatedGrnItems = grnItems.filter(
          (r) => r.po_item_id === item.id
        );

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

  // =========================
  // DISCREPANCY COMPUTATION
  // =========================
  const discrepancies = useMemo(() => {
    return items
      .filter(
        (item) =>
          item.total_received_qty > 0 &&
          item.total_received_qty !== item.ordered_qty
      )
      .map((item) => ({
        id: item.id,
        product_name: item.product_name,
        unit: item.unit,
        po_qty: item.ordered_qty,
        grn_qty: item.total_received_qty,
        diff_qty: item.total_received_qty - item.ordered_qty,
      }));
  }, [items]);

  const handleSaveDraft = async () => {
    console.log("GRN Draft");
    alert("Draft Saved");
  };

  const handleFinalize = async () => {
    alert("Finalize GRN");
    router.push("/purchase");
  };

  const handleResolutionSubmit = async (resolutionPayload) => {
    console.log("Discrepancy Resolution Submitted:", resolutionPayload);
    alert("Discrepancy resolutions saved successfully.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Helix size="45" speed="2.5" color="#2e64e0" />
        <span className="text-sm font-medium text-slate-500">Loading GRN...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-7xl mx-auto px-6 space-y-4">
        <div>
          <HeaderCard po={po} />
        </div>

        <div>
          <SummaryCards
            missingCount={summary.pending}
            partialCount={summary.partial}
            addedCount={summary.over}
            attentionCount={summary.complete}
            onAddClick={() => setIsModalOpen(true)}
          />
        </div>

        {/* Discrepancy Action Banner */}
        {discrepancies.length > 0 && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="text-sm font-semibold text-amber-900">
                  Quantity Discrepancies Found
                </span>
                <p className="text-xs text-amber-700 m-0">
                  {discrepancies.length} item(s) have variance between PO ordered quantity and actual GRN received count.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tag color="warning" className="font-semibold text-xs">
                {discrepancies.length} Action(s) Needed
              </Tag>
              <Button
                type="primary"
                className="bg-amber-600 hover:bg-amber-500 border-none text-xs font-medium"
                onClick={() => setIsDrawerOpen(true)}
              >
                Raise Ticket
              </Button>
            </div>
          </div>
        )}

        <div>
          <GRNItemsTable items={items} />
        </div>

        <div>
          <TotalSummary />
        </div>

        {/* Create/Edit GRN Modal */}
        <GRNModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            fetchPO();
          }}
          po={po}
          items={items}
          setItems={setItems}
        />

        {/* Discrepancy Review Drawer */}
        <DiscrepancyDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          discrepancies={discrepancies}
          po={po}
          onSubmitResolution={handleResolutionSubmit}
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