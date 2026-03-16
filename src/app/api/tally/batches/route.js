import { NextResponse } from "next/server";
import xml2js from "xml2js";

const TALLY_URL = "http://localhost:9000";

async function fetchFromTally(xmlRequest) {
  const response = await fetch(TALLY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xmlRequest,
  });

  const xml = await response.text();

  const parser = new xml2js.Parser({ explicitArray: false });
  const parsed = await parser.parseStringPromise(xml);

  return parsed;
}

export async function POST(req) {

  const { itemName } = await req.json();

  const xmlRequest = `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export Data</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>BatchCollection</ID>
 </HEADER>

 <BODY>
  <DESC>

   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
   </STATICVARIABLES>

   <TDL>
    <TDLMESSAGE>

     <COLLECTION NAME="BatchCollection">
      <TYPE>Batch</TYPE>

      <FETCH>Name</FETCH>
      <FETCH>Parent</FETCH>
      <FETCH>BatchExpiryDate</FETCH>
      <FETCH>ClosingBalance</FETCH>

     </COLLECTION>

    </TDLMESSAGE>
   </TDL>

  </DESC>
 </BODY>
</ENVELOPE>
`;

  const result = await fetchFromTally(xmlRequest);

  const batches =
    result?.ENVELOPE?.BODY?.DATA?.COLLECTION?.BATCH || [];

  const batchArray = Array.isArray(batches) ? batches : [batches];

  const finalData = batchArray.map((b) => ({
    batch: b?.NAME?._ || "",
    expiry: b?.EXPIRYPERIOD?._ || "",
    stock: b?.CLOSINGBALANCE?._ || "0",
  }));

  return NextResponse.json({ batches: finalData });
}