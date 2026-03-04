import { NextResponse } from "next/server";
import xml2js from "xml2js";

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
  const parsed = await parser.parseStringPromise(xml);

  console.log("✅ RAW TALLY RESPONSE:\n", xml);

  console.log(
    "✅ PARSED OBJECT:\n",
    JSON.stringify(parsed, null, 2)
  );

  return parsed;
}

function makeArray(data) {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function clean(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value._) return String(value._).trim();
  return String(value).trim();
}

/* ===============================
   MAIN API
=============================== */

export async function GET() {
  try {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>VoucherCollection</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE>20260101</SVFROMDATE>
        <SVTODATE>20260331</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="VoucherCollection">
            <TYPE>Voucher</TYPE>
            <FILTER>ItemFilter</FILTER>
            <FETCH>Date</FETCH>
            <FETCH>VoucherTypeName</FETCH>
            <FETCH>InventoryEntries.*</FETCH>
            <FETCH>InventoryEntries.BatchAllocations.*</FETCH>
          </COLLECTION>

          <SYSTEM TYPE="Formulae" NAME="ItemFilter">
            ANY $InventoryEntries : $StockItemName = "Bourbon Biscuits"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
`;

    const result = await fetchFromTally(xmlRequest);

    const collection =
  result?.ENVELOPE?.BODY?.DATA?.COLLECTION;

let vouchers = [];

if (collection?.VOUCHER) {
  vouchers = makeArray(collection.VOUCHER);
}

if (collection?.["VOUCHER.LIST"]) {
  vouchers = makeArray(collection["VOUCHER.LIST"]);
}

console.log("✅ VOUCHER COUNT:", vouchers.length);

    vouchers = makeArray(vouchers);

    const finalData = [];

    vouchers.forEach((voucher) => {
      const voucherDate = clean(voucher?.DATE);
      const voucherType = clean(voucher?.VOUCHERTYPENAME);

     const inventoryList = makeArray(
  voucher?.["ALLINVENTORYENTRIES.LIST"] ||
  voucher?.["INVENTORYENTRIES.LIST"]
);

      inventoryList.forEach((entry) => {
        const itemName = clean(entry?.STOCKITEMNAME);

        const batchList = makeArray(
          entry?.["BATCHALLOCATIONS.LIST"]
        );

        batchList.forEach((batch) => {
          finalData.push({
            item_name: itemName,
            voucher_date: voucherDate,
            voucher_type: voucherType,
            godown: clean(batch?.GODOWNNAME),
            batch_name: clean(batch?.BATCHNAME),
            billed_qty: clean(batch?.BILLEDQTY),
            actual_qty: clean(batch?.ACTUALQTY),
            amount: clean(batch?.AMOUNT),
          });
        });
      });
    });

    console.log("✅ Batch Rows:", finalData.length);

    return NextResponse.json({ items: finalData });

  } catch (error) {
    console.error("❌ Tally Error:", error);
    return NextResponse.json(
      { items: [], error: "Tally Fetch Failed" },
      { status: 500 }
    );
  }
}