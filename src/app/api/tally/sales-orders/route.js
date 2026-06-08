// 🔹 Fetch XML from Tally
async function fetchFromTally(xml) {
  const res = await fetch("http://localhost:9000", {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: xml,
  });

  return await res.text();
}

// 🔹 Clean invalid XML chars (VERY IMPORTANT)
function cleanTallyXML(xml) {
  return xml
    .replace(/&#\d+;/g, "") // remove &#4; etc
    .replace(/[\x00-\x1F\x7F]/g, ""); // remove control chars
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // YYYY-MM-DD

    // 🔥 Convert to Tally format: YYYYMMDD
    const formattedDate = date.replace(/-/g, "");

    const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>

  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>

        <REPORTNAME>Voucher Register</REPORTNAME>

        <STATICVARIABLES>
          <SVCURRENTCOMPANY>EXOR MEDICAL SYSTEMS</SVCURRENTCOMPANY>
          <SVFROMDATE>${formattedDate}</SVFROMDATE>
          <SVTODATE>${formattedDate}</SVTODATE>
          <VOUCHERTYPENAME>Sales Order</VOUCHERTYPENAME>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>

      </REQUESTDESC>

      <REQUESTDATA>
        <TALLYMESSAGE>

          <COLLECTION NAME="SalesOrders">
            <TYPE>Voucher</TYPE>

            <FETCH>GUID,ALTERID,DATE,VOUCHERNUMBER,PARTYLEDGERNAME,PARTYNAME,BASICSHIPPEDBY,ALLINVENTORYENTRIES.*</FETCH>

          </COLLECTION>

        </TALLYMESSAGE>
      </REQUESTDATA>

    </EXPORTDATA>
  </BODY>
</ENVELOPE>
`;

    function decodeXML(str) {
      return str
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
    }

    // 🔹 Fetch from Tally
    const rawXml = await fetchFromTally(xml);

    // 🔹 Clean XML
    const cleanedXml = cleanTallyXML(rawXml);

    // 🔥 Extract VOUCHERNUMBER using regex
    // 🔥 Get each voucher block safely
    const voucherBlocks =
      cleanedXml.match(/<VOUCHER[\s\S]*?<\/VOUCHER>/g) || [];

    const tableData = [];

    voucherBlocks.forEach((block, vIndex) => {
      const voucherNumber =
        block.match(/<VOUCHERNUMBER>(.*?)<\/VOUCHERNUMBER>/)?.[1] || "";

      const voucherDate =
        block.match(/<DATE[^>]*>(.*?)<\/DATE>/)?.[1]?.trim() || "";

      const alterId =
        block.match(/<ALTERID>(.*?)<\/ALTERID>/)?.[1]?.trim() || "";

      const guid = block.match(/<GUID>(.*?)<\/GUID>/)?.[1]?.trim() || "";

      const partyRaw =
        block.match(/<PARTYNAME>(.*?)<\/PARTYNAME>/)?.[1] ||
        block.match(/<PARTYLEDGERNAME>(.*?)<\/PARTYLEDGERNAME>/)?.[1] ||
        "";

      const party = decodeXML(partyRaw);

      const shippedBy =
        block.match(/<BASICSHIPPEDBY>(.*?)<\/BASICSHIPPEDBY>/)?.[1] || "";

      // 🔥 Get all item blocks
      const itemBlocks =
        block.match(
          /<ALLINVENTORYENTRIES\.LIST[\s\S]*?<\/ALLINVENTORYENTRIES\.LIST>/g,
        ) || [];

      itemBlocks.forEach((item, iIndex) => {
        const itemNameRaw =
          item.match(/<STOCKITEMNAME>(.*?)<\/STOCKITEMNAME>/)?.[1] || "";

        const itemName = decodeXML(itemNameRaw);

        const qty =
          item.match(/<ACTUALQTY>(.*?)<\/ACTUALQTY>/)?.[1] ||
          item.match(/<BILLEDQTY>(.*?)<\/BILLEDQTY>/)?.[1] ||
          "";

        // 🔥 Batch blocks inside item
        const batchBlocks =
          item.match(
            /<BATCHALLOCATIONS\.LIST[\s\S]*?<\/BATCHALLOCATIONS\.LIST>/g,
          ) || [];

        batchBlocks.forEach((batch, bIndex) => {
          const godown =
            batch.match(/<GODOWNNAME>(.*?)<\/GODOWNNAME>/)?.[1] || "";

          const batchName =
            batch.match(/<BATCHNAME>(.*?)<\/BATCHNAME>/)?.[1] || "";

          const amount = batch.match(/<AMOUNT>(.*?)<\/AMOUNT>/)?.[1] || "";

          tableData.push({
            key: `${vIndex}-${iIndex}-${bIndex}`,
            alterId,
            guid,
            voucherNumber,
            date: voucherDate,
            party,
            shippedBy,
            itemName,
            qty: qty.trim(),
            godown,
            batchName,
            amount,
          });
        });
      });
    });

    return Response.json({
      success: true,
      count: tableData.length,
      data: tableData,
    });
  } catch (error) {
    console.error("API ERROR:", error);

    return Response.json({
      success: false,
      error: error.message,
    });
  }
}
