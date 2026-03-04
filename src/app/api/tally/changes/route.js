import { NextResponse } from "next/server";
import xml2js from "xml2js";
import { supabase } from "@/app/lib/supabase";

const TALLY_URL = "http://localhost:9000";

/* ===============================
   HELPERS
=============================== */

async function fetchFromTally(xmlRequest) {
  const response = await fetch(TALLY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xmlRequest,
  });

  const xml = await response.text();
  const parser = new xml2js.Parser({ explicitArray: false });
  return parser.parseStringPromise(xml);
}

function makeArray(data) {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function cleanText(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value._)
    return String(value._).trim();
  return String(value).trim();
}

/* ===============================
   MAIN
=============================== */

export async function GET() {
  try {
    /* 1️⃣ FETCH TALLY ITEMS */

    const itemsXML = `
      <ENVELOPE>
        <HEADER>
          <VERSION>1</VERSION>
          <TALLYREQUEST>Export Data</TALLYREQUEST>
          <TYPE>Collection</TYPE>
          <ID>ItemCollection</ID>
        </HEADER>
        <BODY>
          <DESC>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL>
              <TDLMESSAGE>
                <COLLECTION NAME="ItemCollection">
                  <TYPE>StockItem</TYPE>
                  <NATIVEMETHOD>Name</NATIVEMETHOD>
                </COLLECTION>
              </TDLMESSAGE>
            </TDL>
          </DESC>
        </BODY>
      </ENVELOPE>
    `;

    const itemsResult = await fetchFromTally(itemsXML);

    let items =
      itemsResult?.ENVELOPE?.BODY?.DATA?.COLLECTION?.STOCKITEM || [];

    items = makeArray(items);

    const tallyItems = items.map((item) => ({
      item_name: cleanText(item?.$?.NAME),
    }));

    /* 2️⃣ FETCH DB ITEMS */

    const { data: dbItems, error } = await supabase
      .from("item_master")
      .select("item_name");

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    /* 3️⃣ CREATE NAME SET */

    const dbNameSet = new Set(
      dbItems.map((item) =>
        item.item_name?.trim().toLowerCase()
      )
    );

    /* 4️⃣ FILTER ONLY NEW ITEMS */

    const newItems = tallyItems.filter(
      (tallyItem) =>
        !dbNameSet.has(
          tallyItem.item_name?.trim().toLowerCase()
        )
    );

    console.log("🆕 NEW ITEMS:", newItems.length);

    return NextResponse.json(newItems);

  } catch (error) {
    console.error("🔥 ERROR:", error);
    return NextResponse.json(
      { error: "Failed to check new items" },
      { status: 500 }
    );
  }
}