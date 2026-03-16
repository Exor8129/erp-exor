import { NextResponse } from "next/server";
import xml2js from "xml2js";

const TALLY_URL = "http://localhost:9000";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const itemName =
    searchParams.get("name") || "On Call Plus Test Strip";

  const batchName =
    searchParams.get("batch") || "1695269s";

  let xmlRequest = `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export Data</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>BatchStockCollection</ID>
 </HEADER>

 <BODY>
  <DESC>

   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    <SVCURRENTCOMPANY>EXOR MEDICAL SYSTEMS</SVCURRENTCOMPANY>
   </STATICVARIABLES>

   <TDL>
    <TDLMESSAGE>
    <COLLECTION NAME="BatchStockCollection">
      <TYPE>StockItem</TYPE>
      <CHILDOF>"${itemName}"</CHILDOF> 
      <FETCH>Name</FETCH>
      <FETCH>ClosingBalance</FETCH>
      <FETCH>BatchAllocations.BatchName</FETCH>
      <FETCH>BatchAllocations.ClosingBalance</FETCH>
    </COLLECTION>
  </TDLMESSAGE>
   </TDL>

  </DESC>
 </BODY>
</ENVELOPE>`;

  xmlRequest = xmlRequest.replace(/>\s+</g, "><").trim();

  try {
    const response = await fetch(TALLY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        Accept: "text/xml",
      },
      body: xmlRequest,
    });

    const xmlData = await response.text();

    const parser = new xml2js.Parser({
      explicitArray: false,
      tagNameProcessors: [(name) => name.toUpperCase()],
    });

    const result = await parser.parseStringPromise(xmlData);

    const stockItem =
      result?.ENVELOPE?.BODY?.DATA?.COLLECTION?.STOCKITEM;

    if (!stockItem) {
      return NextResponse.json({
        success: false,
        message: "Item not found",
      });
    }

    const batches =
      stockItem?.BATCHALLOCATIONS?.LIST;

    if (!batches) {
      return NextResponse.json({
        success: false,
        message: "No batch data found",
      });
    }

    const batchList = Array.isArray(batches)
      ? batches
      : [batches];

    const selectedBatch = batchList.find(
      (b) =>
        b.BATCHNAME?.toLowerCase() ===
        batchName.toLowerCase()
    );

    return NextResponse.json({
      success: true,
      item: itemName,
      batch: batchName,
      quantity:
        selectedBatch?.CLOSINGBALANCE || "0",
    });
  } catch (error) {
    console.error("Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}