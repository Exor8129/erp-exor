import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST() {
  console.log("🚀 /api/tally/sync called");

  try {
    /* =======================================================
       1️⃣ FETCH TALLY ITEMS
    ======================================================= */

    const itemsRes = await fetch("http://localhost:3000/api/tally/items");

    if (!itemsRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch items from tally API" },
        { status: 500 }
      );
    }

    const items = await itemsRes.json();
    console.log("📦 Tally items received:", items?.length);

    if (!items || items.length === 0) {
      return NextResponse.json({ message: "No items found from tally" });
    }

    const formattedItems = items.map((item) => ({
      item_name: item.item_name,
      hsn: item.hsn,
      tax: String(item.tax ?? ""),
      mrp: String(item.mrp ?? ""),
      current_stock: String(item.current_stock ?? ""),
      uom: item.uom,
      status: true,
      updated_at: new Date(),
    }));

    /* =======================================================
       2️⃣ FETCH DB BEFORE UPSERT
    ======================================================= */

    const { data: existingBefore, error: fetchError } = await supabase
      .from("item_master")
      .select("*");

    if (fetchError) {
      console.log("🔥 DB Fetch Error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log("📊 TOTAL DB ROWS (BEFORE UPSERT):", existingBefore.length);

    /* =======================================================
       3️⃣ CHECK SPECIFIC ITEM BEFORE UPSERT
    ======================================================= */

    const testName = "Oxygen concentrator Filter - Grey";

    const { data: directBefore } = await supabase
      .from("item_master")
      .select("item_name")
      .eq("item_name", testName);

    console.log("🔍 DIRECT CHECK BEFORE UPSERT:", directBefore);

    /* =======================================================
       4️⃣ NORMALIZATION
    ======================================================= */

    const normalize = (str) =>
      str
        ?.toString()
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[\u2010-\u2015]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

    const dbMap = new Map();
    existingBefore.forEach((item) => {
      dbMap.set(normalize(item.item_name), item);
    });

    /* =======================================================
       5️⃣ COMPARE FIRST 10 ITEMS
    ======================================================= */

    console.log("\n===============================");
    console.log("🧪 COMPARISON BEFORE UPSERT");
    console.log("===============================\n");

    formattedItems.slice(0, 10).forEach((tallyItem, index) => {
      const normalizedName = normalize(tallyItem.item_name);
      const dbItem = dbMap.get(normalizedName);

      console.log(`\n🔹 ITEM ${index + 1}`);
      console.log("TALLY RAW:", tallyItem.item_name);
      console.log("TALLY NORMALIZED:", normalizedName);

      if (dbItem) {
        console.log("DB RAW:", dbItem.item_name);
        console.log("DB NORMALIZED:", normalize(dbItem.item_name));
        console.log("✅ MATCH FOUND");
      } else {
        console.log("❌ NOT FOUND IN DB");
      }

      console.log("-----------------------------------");
    });

    /* =======================================================
       6️⃣ UPSERT
    ======================================================= */

    console.log("\n💾 Performing UPSERT...");
    console.log("📊 Total items to upsert:", formattedItems.length);

    const { error: upsertError } = await supabase
      .from("item_master")
      .upsert(formattedItems, { onConflict: "item_name" });

    if (upsertError) {
      console.log("🔥 UPSERT ERROR:", upsertError);
      return NextResponse.json(
        { error: upsertError.message },
        { status: 500 }
      );
    }

    console.log("✅ UPSERT SUCCESS");

    /* =======================================================
       7️⃣ FETCH DB AFTER UPSERT
    ======================================================= */

    const { data: existingAfter } = await supabase
      .from("item_master")
      .select("*");

    console.log("📊 TOTAL DB ROWS (AFTER UPSERT):", existingAfter.length);

    /* =======================================================
       8️⃣ DIRECT CHECK AFTER UPSERT
    ======================================================= */

    const { data: directAfter } = await supabase
      .from("item_master")
      .select("item_name")
      .eq("item_name", testName);

    console.log("🔍 DIRECT CHECK AFTER UPSERT:", directAfter);

    console.log("\n🏁 SYNC COMPLETED\n");

    return NextResponse.json({
      message: "Diagnostic sync completed",
    });

  } catch (err) {
    console.log("🔥 API crash error:", err);

    return NextResponse.json(
      { error: err.message || "Sync failed" },
      { status: 500 }
    );
  }
}