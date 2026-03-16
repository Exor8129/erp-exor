// import { NextResponse } from "next/server";
// import xml2js from "xml2js";

// const TALLY_URL = "http://localhost:9000";

// /* ===============================
//    HELPERS
// =============================== */

// async function fetchFromTally(xmlRequest) {
//   const response = await fetch(TALLY_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/xml" },
//     body: xmlRequest,
//   });

//   const xml = await response.text();

//   const parser = new xml2js.Parser({ explicitArray: false });
//   const parsed = await parser.parseStringPromise(xml);

//   console.log("✅ RAW TALLY RESPONSE:\n", xml);

//   console.log(
//     "✅ PARSED OBJECT:\n",
//     JSON.stringify(parsed, null, 2)
//   );

//   return parsed;
// }

// function makeArray(data) {
//   if (!data) return [];
//   return Array.isArray(data) ? data : [data];
// }

// function clean(value) {
//   if (!value) return "";
//   if (typeof value === "string") return value.trim();
//   if (typeof value === "object" && value._) return String(value._).trim();
//   return String(value).trim();
// }

// /* ===============================
//    MAIN API
// =============================== */

// export async function GET() {
//   try {
//     const itemName = "I-Sens No Coding Glucometer Test Strip";

//     console.log("🚀 API HIT");
//     console.log("📦 Fetching Batches For Item:", itemName);

//     const xmlRequest = `
// <ENVELOPE>
//  <HEADER>
//   <VERSION>1</VERSION>
//   <TALLYREQUEST>Export Data</TALLYREQUEST>
//   <TYPE>Collection</TYPE>
//   <ID>BatchList</ID>
//  </HEADER>

//  <BODY>
//   <DESC>

//    <STATICVARIABLES>
//     <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
//     <SVCOMPANY>EXOR MEDICAL SYSTEMS</SVCOMPANY>
//    </STATICVARIABLES>

//    <TDL>
//     <TDLMESSAGE>

//      <COLLECTION NAME="BatchList">
//       <TYPE>Batch</TYPE>
//       <CHILDOF>I-Sens No Coding Glucometer Test Strip</CHILDOF>
//       <FETCH>Name,ExpiryDate,ClosingBalance</FETCH>
//      </COLLECTION>

//     </TDLMESSAGE>
//    </TDL>

//   </DESC>
//  </BODY>
// </ENVELOPE>
// `
// ;

//     console.log("📤 XML SENT TO TALLY:\n", xmlRequest);

//     const result = await fetchFromTally(xmlRequest);

//     console.log("📥 FULL RESULT OBJECT:\n", result);

//     const collectionData = result?.ENVELOPE?.BODY?.DATA?.COLLECTION;

//     console.log("📊 COLLECTION DATA:\n", collectionData);

// const batches =
//   result?.ENVELOPE?.BODY?.DATA?.COLLECTION?.BATCH || [];

// const batchArray = Array.isArray(batches) ? batches : [batches];

// console.log("📦 RAW BATCH ARRAY:", batchArray);

// const finalData = batchArray.map((b) => ({
//   batch_name: b?.NAME?._ || "",
//   expiry_date: b?.EXPIRYDATE?._ || "",
//   closing_bal: b?.CLOSINGBALANCE?._ || "0",
// }));

// console.log("🎯 FINAL BATCHES:", finalData);

//     return NextResponse.json({ items: finalData });

//   } catch (error) {
//     console.error("❌ API Error:", error);
//     return NextResponse.json({ items: [], error: error.message }, { status: 500 });
//   }
// }


























// // working with individual all batches inclusding primary and loading expiry also. problem with on call puls test strip

// import { NextResponse } from "next/server";
// import xml2js from "xml2js";

// const TALLY_URL = "http://localhost:9000";

// /* ===============================
//    HELPERS
// =============================== */

// async function fetchFromTally(xmlRequest) {
//   const response = await fetch(TALLY_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/xml" },
//     body: xmlRequest,
//   });

//   const xml = await response.text();

//   const parser = new xml2js.Parser({ explicitArray: false });
//  return parser.parseStringPromise(xml);;
// }

// function makeArray(data) {
//   if (!data) return [];
//   return Array.isArray(data) ? data : [data];
// }



// /* ===============================
//    MAIN API
// =============================== */

// export async function POST(req) {
//   try {
//    const body = await req.json();
//     const itemName = body.item;
//     const escapedItemName = itemName.replace(/"/g, '""');

//     if (!itemName) { 
//       return NextResponse.json({ items: [] }); }

//     console.log("📦 Fetching Batches For Item:", itemName);

//     const xmlRequest = `
// <ENVELOPE>
//  <HEADER>
//   <VERSION>1</VERSION>
//   <TALLYREQUEST>Export Data</TALLYREQUEST>
//   <TYPE>Collection</TYPE>
//   <ID>BatchList</ID>
//  </HEADER>

//  <BODY>
//   <DESC>

//    <STATICVARIABLES>
//     <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
//     <SVCOMPANY>EXOR MEDICAL SYSTEMS</SVCOMPANY>
//    </STATICVARIABLES>

//    <TDL>
//     <TDLMESSAGE>

//      <COLLECTION NAME="BatchList">
//       <TYPE>Batch</TYPE>
      
//       <CHILDOF>"${escapedItemName}"</CHILDOF>
//       <FETCH>Name,BatchExpiryDate,ExpiryPeriod,ClosingBalance</FETCH>
//      </COLLECTION>

//     </TDLMESSAGE>
//    </TDL>

//   </DESC>
//  </BODY>
// </ENVELOPE>
// `
// ;

//     console.log("📤 XML SENT TO TALLY:\n", xmlRequest);

//     const result = await fetchFromTally(xmlRequest);

//     console.log("📥 FULL RESULT OBJECT:\n", result);

//     const collectionData = result?.ENVELOPE?.BODY?.DATA?.COLLECTION;

//     console.log("📊 COLLECTION DATA:\n", collectionData);

// const batches =
//   result?.ENVELOPE?.BODY?.DATA?.COLLECTION?.BATCH || [];

// const batchArray = Array.isArray(batches) ? batches : [batches];

// console.log("📦 RAW BATCH ARRAY:", batchArray);

// const finalData = batchArray.map((b) => ({
//   batch_name: b?.NAME?._ || "",
//    expiry_date: b?.EXPIRYPERIOD?._ || "No Expiry",
//   closing_bal: b?.CLOSINGBALANCE?._ || "0",
// }));

// console.log("🎯 FINAL BATCHES:", finalData);

//     return NextResponse.json({ items: finalData });

//   } catch (error) {
//     console.error("❌ API Error:", error);
//     return NextResponse.json({ items: [], error: error.message }, { status: 500 });
//   }
// }



















// import { NextResponse } from "next/server";
// import xml2js from "xml2js";

// const TALLY_URL = "http://localhost:9000";

// /* ----------------------------- */

// async function fetchFromTally(xmlRequest) {
//   const response = await fetch(TALLY_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/xml" },
//     body: xmlRequest,
//   });

//   const xml = await response.text();

//   const parser = new xml2js.Parser({ explicitArray: false });
//   return parser.parseStringPromise(xml);
// }

// function makeArray(data) {
//   if (!data) return [];
//   return Array.isArray(data) ? data : [data];
// }

// /* ----------------------------- */

// export async function POST(req) {
//   try {

//     const body = await req.json();

//     const itemName = body.item;
//     const itemGuid = body.guid;

//     if (!itemGuid) {
//       return NextResponse.json({ items: [] });
//     }

//     console.log("Fetching batches for GUID:", itemGuid);

//     const xmlRequest = `
// <ENVELOPE>
//  <HEADER>
//   <VERSION>1</VERSION>
//   <TALLYREQUEST>Export Data</TALLYREQUEST>
//   <TYPE>Collection</TYPE>
//   <ID>BatchList</ID>
//  </HEADER>

//  <BODY>
//   <DESC>

//    <STATICVARIABLES>
//     <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
//    </STATICVARIABLES>

//    <TDL>
//     <TDLMESSAGE>

//      <COLLECTION NAME="BatchList">
//       <TYPE>Batch</TYPE>
//       <CHILDOF>"${itemGuid}"</CHILDOF>
//       <FETCH>Name,ExpiryPeriod,ClosingBalance</FETCH>
//      </COLLECTION>

//     </TDLMESSAGE>
//    </TDL>

//   </DESC>
//  </BODY>
// </ENVELOPE>
// `;

//     const result = await fetchFromTally(xmlRequest);

// console.log("RAW TALLY RESPONSE:");
// console.dir(result, { depth: null });

// const batches =
//   result?.ENVELOPE?.BODY?.DATA?.COLLECTION?.BATCH || [];

// const batchArray = makeArray(batches);

// console.log("BATCH ARRAY:");
// console.dir(batchArray, { depth: null });

//    const finalData = batchArray.map((b) => ({
//   item_name: itemName,
//   batch_name: b?.NAME?._ || b?.NAME || "",
//   expiry_date: b?.EXPIRYPERIOD?._ || b?.EXPIRYPERIOD || "",
//   closing_bal: b?.CLOSINGBALANCE?._ || b?.CLOSINGBALANCE || "0",
// }));

//     return NextResponse.json({ items: finalData });

//   } catch (error) {
//     console.error("Batch API Error:", error);
//     return NextResponse.json({ items: [] });
//   }
// }












// import { NextResponse } from "next/server";
// import xml2js from "xml2js";

// const TALLY_URL = "http://localhost:9000";

// /* ----------------------------- */

// async function fetchFromTally(xmlRequest) {
//   const response = await fetch(TALLY_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/xml" },
//     body: xmlRequest,
//   });

//   const xml = await response.text();

//   function escapeForTally(name) {
//   if (!name) return "";

//   return name
//     .replace(/&/g, "&amp;")
//     .replace(/"/g, "&quot;")   // VERY IMPORTANT
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;");
// }

//   const parser = new xml2js.Parser({ explicitArray: false });
//   return parser.parseStringPromise(xml);
// }

// function makeArray(data) {
//   if (!data) return [];
//   return Array.isArray(data) ? data : [data];
// }

// /* ----------------------------- */

// export async function POST(req) {
//   try {

//     const body = await req.json();

//     const itemName = body.item;
//     const itemGuid = body.guid;

//     if (!itemGuid) {
//       return NextResponse.json({ items: [] });
//     }

//     console.log("Fetching batches for GUID:", itemGuid);

//     const escapedItemName = escapeForTally(itemName);

//     const xmlRequest = `
// <ENVELOPE>
//  <HEADER>
//   <VERSION>1</VERSION>
//   <TALLYREQUEST>Export Data</TALLYREQUEST>
//   <TYPE>Collection</TYPE>
//   <ID>BatchList</ID>
//  </HEADER>

//  <BODY>
//   <DESC>

//    <STATICVARIABLES>
//     <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
//    </STATICVARIABLES>

//    <TDL>
//     <TDLMESSAGE>

//      <COLLECTION NAME="BatchList">
//       <TYPE>Batch</TYPE>
//       <CHILDOF>"${escapedItemName}"</CHILDOF>
//       <FETCH>Name,ExpiryPeriod,ClosingBalance</FETCH>
//      </COLLECTION>

//     </TDLMESSAGE>
//    </TDL>

//   </DESC>
//  </BODY>
// </ENVELOPE>
// `;

//     const result = await fetchFromTally(xmlRequest);

// console.log("RAW TALLY RESPONSE:");
// console.dir(result, { depth: null });

// const batches =
//   result?.ENVELOPE?.BODY?.DATA?.COLLECTION?.BATCH || [];

// const batchArray = makeArray(batches);

// console.log("BATCH ARRAY:");
// console.dir(batchArray, { depth: null });

//    const finalData = batchArray.map((b) => ({
//   item_name: itemName,
//   batch_name: b?.NAME?._ || b?.NAME || "",
//   expiry_date: b?.EXPIRYPERIOD?._ || b?.EXPIRYPERIOD || "",
//   closing_bal: b?.CLOSINGBALANCE?._ || b?.CLOSINGBALANCE || "0",
// }));

//     return NextResponse.json({ items: finalData });

//   } catch (error) {
//     console.error("Batch API Error:", error);
//     return NextResponse.json({ items: [] });
//   }
// }












// // working with individual all batches inclusding primary and loading expiry also. checking

// import { NextResponse } from "next/server";
// import xml2js from "xml2js";

// const TALLY_URL = "http://localhost:9000";

// /* ===============================
//    HELPERS
// =============================== */

// async function fetchFromTally(xmlRequest) {
//   const response = await fetch(TALLY_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/xml" },
//     body: xmlRequest,
//   });

//   const xml = await response.text();

//   const parser = new xml2js.Parser({ explicitArray: false });
//  return parser.parseStringPromise(xml);;
// }

// function makeArray(data) {
//   if (!data) return [];
//   return Array.isArray(data) ? data : [data];
// }



// /* ===============================
//    MAIN API
// =============================== */

// export async function POST(req) {
//   try {
//    const body = await req.json();
//     const itemName = body.item;
//     const tallyEscapedName = itemName.replace(/"/g, '""');

//     const xmlSafeName = tallyEscapedName
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;");

//     if (!itemName) { 
//       return NextResponse.json({ items: [] }); }

//     console.log("📦 Fetching Batches For Item:", itemName);

//     const xmlRequest = `
// <ENVELOPE>
//  <HEADER>
//   <VERSION>1</VERSION>
//   <TALLYREQUEST>Export Data</TALLYREQUEST>
//   <TYPE>Collection</TYPE>
//   <ID>BatchList</ID>
//  </HEADER>

//  <BODY>
//   <DESC>

//    <STATICVARIABLES>
//     <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
//     <SVCOMPANY>EXOR MEDICAL SYSTEMS</SVCOMPANY>
//    </STATICVARIABLES>

//    <TDL>
//     <TDLMESSAGE>

//      <COLLECTION NAME="BatchList">
//       <TYPE>Batch</TYPE>
      
//       <CHILDOF>"${xmlSafeName}"</CHILDOF>
//       <FETCH>Name,BatchExpiryDate,ExpiryPeriod,ClosingBalance</FETCH>
//      </COLLECTION>

//     </TDLMESSAGE>
//    </TDL>

//   </DESC>
//  </BODY>
// </ENVELOPE>
// `
// ;

//     console.log("📤 XML SENT TO TALLY:\n", xmlRequest);

//     const result = await fetchFromTally(xmlRequest);

//     console.log("📥 FULL RESULT OBJECT:\n", result);

//     const collectionData = result?.ENVELOPE?.BODY?.DATA?.COLLECTION;

//     console.log("📊 COLLECTION DATA:\n", collectionData);

// const batches =
//   result?.ENVELOPE?.BODY?.DATA?.COLLECTION?.BATCH || [];

// const batchArray = Array.isArray(batches) ? batches : [batches];

// console.log("📦 RAW BATCH ARRAY:", batchArray);

// const finalData = batchArray.map((b) => ({
//   batch_name: b?.NAME?._ || "",
//    expiry_date: b?.EXPIRYPERIOD?._ || "No Expiry",
//   closing_bal: b?.CLOSINGBALANCE?._ || "0",
// }));

// console.log("🎯 FINAL BATCHES:", finalData);

//     return NextResponse.json({ items: finalData });

//   } catch (error) {
//     console.error("❌ API Error:", error);
//     return NextResponse.json({ items: [], error: error.message }, { status: 500 });
//   }
// }











// import { NextResponse } from "next/server";
// import xml2js from "xml2js";

// const TALLY_URL = "http://127.0.0.1:9000";

// export async function POST(req) {
//   try {
//     const body = await req.json();
//     const safeId = body.safeId;

//     if (!safeId) return NextResponse.json({ items: [] });

//     // 1. Decode Base64 (e.g., Bipolar Cable 8")
//     const decodedName = Buffer.from(safeId, 'base64').toString('utf-8');
    
//     // 2. TALLY ESCAPING: Use a backtick (`) before the quote.
//     // This turns 8" into 8`" so Tally understands it's a single quote character.
//     const tallyEscapedName = decodedName.replace(/"/g, '"');
   

//     // 3. XML ESCAPING: Handle the '&' for valid XML structure.
//     const xmlSafeName = tallyEscapedName.replace(/&/g, "&amp;");

//     console.log("🔓 DECODED:", decodedName);
//     console.log("📤 SENDING TO TALLY (BACKTICK ESCAPE):", xmlSafeName);

//     const xmlRequest = `
// <ENVELOPE>
//  <HEADER>
//   <VERSION>1</VERSION>
//   <TALLYREQUEST>Export Data</TALLYREQUEST>
//   <TYPE>Collection</TYPE>
//   <ID>BatchList</ID>
//  </HEADER>
//  <BODY>
//   <DESC>
//    <STATICVARIABLES>
//     <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
//     <SVCOMPANY>EXOR MEDICAL SYSTEMS</SVCOMPANY>
//    </STATICVARIABLES>
//    <TDL>
//     <TDLMESSAGE>
//      <COLLECTION NAME="BatchList">
//       <TYPE>Batch</TYPE>
//       <CHILDOF>"${xmlSafeName}"</CHILDOF>
//       <FETCH>Name,ExpiryPeriod,ClosingBalance</FETCH>
//      </COLLECTION>
//     </TDLMESSAGE>
//    </TDL>
//   </DESC>
//  </BODY>
// </ENVELOPE>`;

//     const response = await fetch(TALLY_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/xml" },
//       body: xmlRequest,
//     });

//     const xmlText = await response.text();
//     const parser = new xml2js.Parser({ explicitArray: false });
//     const result = await parser.parseStringPromise(xmlText);

//     const collection = result?.ENVELOPE?.BODY?.DATA?.COLLECTION;
//     const batches = collection?.BATCH;

//     let finalData = [];
//     if (batches) {
//         const batchArray = Array.isArray(batches) ? batches : [batches];
//         finalData = batchArray.map((b) => {
//             const val = (v) => (typeof v === 'object' ? v?._ : v) || "";
//             return {
//                 batch_name: val(b?.NAME),
//                 expiry_date: val(b?.EXPIRYPERIOD) || "No Expiry",
//                 closing_bal: val(b?.CLOSINGBALANCE) || "0",
//             };
//         });
//     }

//     console.log(`✅ Success: Found ${finalData.length} batches.`);
//     return NextResponse.json({ items: finalData });

//   } catch (error) {
//     console.error("🔥 API ERROR:", error);
//     return NextResponse.json({ items: [], error: error.message }, { status: 500 });
//   }
// }











// import { NextResponse } from "next/server";
// import xml2js from "xml2js";

// const TALLY_URL = "http://127.0.0.1:9000";

// export async function POST(req) {
//   try {
//     const body = await req.json();
//     const safeId = body.safeId;

//     if (!safeId) return NextResponse.json({ items: [] });

//     // 1. Decode Base64 (Handles both ' and " safely)
//     const decodedName = Buffer.from(safeId, 'base64').toString('utf-8');
    
//     // 2. TALLY ESCAPING: Double the double-quotes only
//     // This turns 8" into 8"" so the formula stays valid
//     const tallyName = decodedName.replace(/"/g, '""');

//     // 3. XML ESCAPING: For valid XML transport
//     const xmlSafeName = tallyName.replace(/&/g, "&amp;");

//     console.log("🔓 DECODED:", decodedName);

//     const xmlRequest = `
// <ENVELOPE>
//  <HEADER>
//   <VERSION>1</VERSION>
//   <TALLYREQUEST>Export Data</TALLYREQUEST>
//   <TYPE>Collection</TYPE>
//   <ID>BatchList</ID>
//  </HEADER>
//  <BODY>
//   <DESC>
//    <STATICVARIABLES>
//     <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
//     <SVCOMPANY>EXOR MEDICAL SYSTEMS</SVCOMPANY>
//    </STATICVARIABLES>
//    <TDL>
//     <TDLMESSAGE>
//      <COLLECTION NAME="BatchList">
//       <TYPE>Batch</TYPE>
//       <FILTER>ItemFilter</FILTER>
//       <FETCH>Name,ExpiryPeriod,ClosingBalance</FETCH>
//      </COLLECTION>
//      <SYSTEM TYPE="Formula" NAME="ItemFilter">$StockItemName = $$String:"${xmlSafeName}"</SYSTEM>
//     </TDLMESSAGE>
//    </TDL>
//   </DESC>
//  </BODY>
// </ENVELOPE>`;

//     const response = await fetch(TALLY_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/xml" },
//       body: xmlRequest,
//     });

//     const xmlText = await response.text();
//     const parser = new xml2js.Parser({ explicitArray: false });
//     const result = await parser.parseStringPromise(xmlText);

//     const collection = result?.ENVELOPE?.BODY?.DATA?.COLLECTION;
//     const batches = collection?.BATCH;

//     let finalData = [];
//     if (batches) {
//         const batchArray = Array.isArray(batches) ? batches : [batches];
//         finalData = batchArray.map((b) => {
//             const val = (v) => (typeof v === 'object' ? v?._ : v) || "";
//             return {
//                 batch_name: val(b?.NAME),
//                 expiry_date: val(b?.EXPIRYPERIOD) || "No Expiry",
//                 closing_bal: val(b?.CLOSINGBALANCE) || "0",
//             };
//         });
//     }

//     return NextResponse.json({ items: finalData });

//   } catch (error) {
//     console.error("🔥 API ERROR:", error);
//     return NextResponse.json({ items: [], error: error.message }, { status: 500 });
//   }
// }











// // working fine code
// import { NextResponse } from "next/server";
// import xml2js from "xml2js";

// const TALLY_URL = "http://127.0.0.1:9000";

// export async function POST(req) {
//   try {
//     const body = await req.json();
//     const safeId = body.safeId;

//     if (!safeId) return NextResponse.json({ items: [] });

//     // 1. Decode Base64 back to original: Bipolar Cable 8"
//     const decodedName = Buffer.from(safeId, 'base64').toString('utf-8');
    
//     // 2. XML ESCAPING ONLY: Tally Static Variables handle " and ' automatically
//     // We only need to escape the '&' for the XML to be valid.
//     const xmlSafeName = decodedName.replace(/&/g, "&amp;");

//     console.log("🔓 DECODED:", decodedName);

//     const xmlRequest = `
// <ENVELOPE>
//  <HEADER>
//   <VERSION>1</VERSION>
//   <TALLYREQUEST>Export Data</TALLYREQUEST>
//   <TYPE>Collection</TYPE>
//   <ID>BatchList</ID>
//  </HEADER>
//  <BODY>
//   <DESC>
//    <STATICVARIABLES>
//     <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
//     <SVCOMPANY>EXOR MEDICAL SYSTEMS</SVCOMPANY>
//     <VStockItemName>${xmlSafeName}</VStockItemName>
//    </STATICVARIABLES>
//    <TDL>
//     <TDLMESSAGE>
//      <COLLECTION NAME="BatchList">
//       <TYPE>Batch</TYPE>
//       <CHILDOF>##VStockItemName</CHILDOF>
//       <FETCH>Name,ExpiryPeriod,ClosingBalance</FETCH>
//      </COLLECTION>
//     </TDLMESSAGE>
//    </TDL>
//   </DESC>
//  </BODY>
// </ENVELOPE>`;

//     const response = await fetch(TALLY_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/xml" },
//       body: xmlRequest,
//     });

//     const xmlText = await response.text();
//     const parser = new xml2js.Parser({ explicitArray: false });
//     const result = await parser.parseStringPromise(xmlText);

//     const collection = result?.ENVELOPE?.BODY?.DATA?.COLLECTION;
//     const batches = collection?.BATCH;

//     let finalData = [];
//     if (batches) {
//         const batchArray = Array.isArray(batches) ? batches : [batches];
//         finalData = batchArray.map((b) => {
//             const val = (v) => (typeof v === 'object' ? v?._ : v) || "";
//             return {
//                 batch_name: val(b?.NAME),
//                 expiry_date: val(b?.EXPIRYPERIOD) || "No Expiry",
//                 closing_bal: val(b?.CLOSINGBALANCE) || "0",
//             };
//         });
//     }

//     return NextResponse.json({ items: finalData });

//   } catch (error) {
//     console.error("🔥 API ERROR:", error);
//     return NextResponse.json({ items: [], error: error.message }, { status: 500 });
//   }
// }






// import { NextResponse } from "next/server";
// import xml2js from "xml2js";

// const TALLY_URL = "http://127.0.0.1:9000";

// export async function POST(req) {
//   try {
//     const body = await req.json();
//     const safeId = body.safeId;
//     if (!safeId) return NextResponse.json({ items: [] });

//     const decodedName = Buffer.from(safeId, 'base64').toString('utf-8');
//     const xmlSafeName = decodedName.replace(/&/g, "&amp;");

//     const xmlRequest = `
// <ENVELOPE>
//  <HEADER>
//   <VERSION>1</VERSION>
//   <TALLYREQUEST>Export Data</TALLYREQUEST>
//   <TYPE>Collection</TYPE>
//   <ID>HSNCollector</ID>
//  </HEADER>
//  <BODY>
//   <DESC>
//    <STATICVARIABLES>
//     <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
//     <SVCOMPANY>EXOR MEDICAL SYSTEMS</SVCOMPANY>
//     <VStockItemName>${xmlSafeName}</VStockItemName>
//    </STATICVARIABLES>
//    <TDL>
//     <TDLMESSAGE>
//      <COLLECTION NAME="HSNCollector">
//       <TYPE>StockItem</TYPE>
//       <FILTER>NameFilter</FILTER>
//       <FETCH>Name, HSNDETAILS.*, BATCHWISEDATA.*</FETCH>
//      </COLLECTION>
//      <SYSTEM TYPE="Formula" NAME="NameFilter">$Name = ##VStockItemName</SYSTEM>
//     </TDLMESSAGE>
//    </TDL>
//   </DESC>
//  </BODY>
// </ENVELOPE>`;

//     const response = await fetch(TALLY_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/xml" },
//       body: xmlRequest,
//     });

//     const xmlText = await response.text();
    
//     // --- LOG 1: RAW XML FROM TALLY ---
//     // Check your terminal to see if <HSNCODE> exists inside <HSNDETAILS.LIST>
//     console.log(`--- RAW TALLY XML FOR: ${decodedName} ---`);
//     console.log(xmlText);

//     const parser = new xml2js.Parser({ explicitArray: false });
//     const result = await parser.parseStringPromise(xmlText);

//     const item = result?.ENVELOPE?.BODY?.DATA?.COLLECTION?.STOCKITEM;
//     if (!item) return NextResponse.json({ items: [] });

//     const clean = (val) => (typeof val === 'object' ? val?._ : val) || "";
//     const makeArray = (data) => (Array.isArray(data) ? data : data ? [data] : []);

//     /* --- EXTRACT HSN --- */
//     let hsnValue = "N/A";
//     const hsnList = makeArray(item["HSNDETAILS.LIST"]);
    
//     console.log(`--- HSN LIST FOUND: ${hsnList.length} entries ---`);

//     hsnList.forEach((hsnObj, index) => {
//       const code = clean(hsnObj.HSNCODE);
      
//       // --- LOG 2: INDIVIDUAL HSN ENTRY ---
//       console.log(`Entry ${index + 1} HSN Code:`, code);
      
//       if (code) hsnValue = code;
//     });

//     /* --- MAP BATCHES --- */
//     const batches = makeArray(item.BATCHWISEDATA);
//     const finalData = batches.map((b) => ({
//       item_name: decodedName,
//       batch_name: clean(b.BATCHNAME),
//       expiry_date: clean(b.EXPIRYPERIOD) || "No Expiry",
//       closing_bal: clean(b.CLOSINGBALANCE) || "0",
//       // hsn: hsnValue || "0", 
//     }));

//     return NextResponse.json({ items: finalData });

//   } catch (error) {
//     console.error("🔥 HSN API ERROR:", error);
//     return NextResponse.json({ items: [], error: error.message }, { status: 500 });
//   }
// }







// code with loading data, problem with hsn only

import { NextResponse } from "next/server";
import xml2js from "xml2js";

const TALLY_URL = "http://127.0.0.1:9000";

export async function POST(req) {
  try {
    const body = await req.json();
    const safeId = body.safeId;
    if (!safeId) return NextResponse.json({ items: [] });

    const decodedName = Buffer.from(safeId, 'base64').toString('utf-8');
    const xmlSafeName = decodedName.replace(/&/g, "&amp;");

    const xmlRequest = `
<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export Data</TALLYREQUEST>
  <TYPE>Collection</TYPE>
  <ID>ExorBatchCollector</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    <SVCOMPANY>EXOR MEDICAL SYSTEMS</SVCOMPANY>
    <VStockItemName>${xmlSafeName}</VStockItemName>
   </STATICVARIABLES>
   <TDL>
    <TDLMESSAGE>
     <COLLECTION NAME="ExorBatchCollector">
      <TYPE>Batch</TYPE>
      <CHILDOF>##VStockItemName</CHILDOF>
      <FETCH>Name, ExpiryPeriod, ClosingBalance, *</FETCH>
      
      <COMPUTEDMETHOD NAME="ItemHSN" TYPE="String">
         $$CollectionField:$HSNCode:1:HSNDetails:StockItem:##VStockItemName
      </COMPUTEDMETHOD>
     </COLLECTION>
    </TDLMESSAGE>
   </TDL>
  </DESC>
 </BODY>
</ENVELOPE>`;

    const response = await fetch(TALLY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlRequest,
    });

    const xmlText = await response.text();
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlText);

    // Tally returns Batch data under DATA -> COLLECTION -> BATCH
    const collection = result?.ENVELOPE?.BODY?.DATA?.COLLECTION;
    const batches = collection?.BATCH;

    if (!batches) return NextResponse.json({ items: [] });

    const clean = (v) => (typeof v === 'object' ? v?._ : v) || "";
    const batchArray = Array.isArray(batches) ? batches : [batches];

    const finalData = batchArray.map((b) => ({
      item_name: decodedName,
      batch_name: clean(b.NAME),
      expiry_date: clean(b.EXPIRYPERIOD) || "No Expiry",
      closing_bal: clean(b.CLOSINGBALANCE) || "0",
      hsn: clean(b.ITEMHSN) || "N/A"
    }));

    return NextResponse.json({ items: finalData });

  } catch (error) {
    console.error("🔥 ERROR:", error);
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }
}