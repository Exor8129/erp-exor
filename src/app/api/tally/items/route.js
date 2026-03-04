import { NextResponse } from "next/server";
import xml2js from "xml2js";

const TALLY_URL = "http://localhost:9000";

/* ===============================
   HELPER FUNCTIONS
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
  if (typeof value === "string") return value.replace(/\r?\n/g, "").trim();
  if (typeof value === "object" && value._)
    return String(value._).replace(/\r?\n/g, "").trim();
  return String(value).trim();
}

/* ===============================
   MAIN API
=============================== */

export async function GET() {
  try {
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
                  <NATIVEMETHOD>Parent</NATIVEMETHOD>
                  <NATIVEMETHOD>BaseUnits</NATIVEMETHOD>
                  <NATIVEMETHOD>ClosingBalance</NATIVEMETHOD>

                  <FETCH>HSNDETAILS.LIST</FETCH>
                  <FETCH>GSTDETAILS.LIST</FETCH>
                  <FETCH>BATCHALLOCATIONS.*</FETCH>

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

    const cleanedItems = items.map((item) => {
      const itemName = cleanText(item?.$?.NAME);
      const groupName = cleanText(item?.PARENT);

      /* GST */
      let tax = 0;
      const gstDetailsList = makeArray(item["GSTDETAILS.LIST"]);

      gstDetailsList.forEach((gstDetails) => {
        const stateDetailsList = makeArray(
          gstDetails?.["STATEWISEDETAILS.LIST"]
        );

        stateDetailsList.forEach((stateDetails) => {
          const rateDetailsList = makeArray(
            stateDetails?.["RATEDETAILS.LIST"]
          );

          rateDetailsList.forEach((rate) => {
            const head = cleanText(rate?.GSTRATEDUTYHEAD);
            const value = parseFloat(cleanText(rate?.GSTRATE)) || 0;

            if (head === "IGST" && value > 0) {
              tax = value;
            }
          });
        });
      });

      /* HSN */
      let hsn = "";
      const hsnDetailsList = makeArray(item?.["HSNDETAILS.LIST"]);

      hsnDetailsList.forEach((hsnDetails) => {
        const code = cleanText(hsnDetails?.HSNCODE);
        if (code) hsn = code;
      });

      /* MRP */
      let mrp = 0;
      const batches = makeArray(item?.["BATCHALLOCATIONS.LIST"]);

      batches.forEach((batch) => {
        const mrpList = makeArray(batch?.["UDF:VCHMRPVAL.LIST"]);
        mrpList.forEach((udf) => {
          const value =
            parseFloat(cleanText(udf?.["UDF:VCHMRPVAL"])) || 0;
          if (value > 0) mrp = value;
        });
      });

      /* STOCK */
      let stock = cleanText(item?.CLOSINGBALANCE);
      if (!stock || !/\d/.test(stock)) stock = "0";

      return {
        item_name: itemName,
        stock_group: groupName,
        uom: cleanText(item?.BASEUNITS),
        current_stock: stock,
        reorder_level: "-",
        tax: String(tax),
        hsn,
        mrp: String(mrp),
      };
    });

    console.log("📦 TOTAL ITEMS FROM TALLY:", cleanedItems.length);

    return NextResponse.json(cleanedItems);

  } catch (error) {
    console.error("Tally Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data from Tally" },
      { status: 500 }
    );
  }
}