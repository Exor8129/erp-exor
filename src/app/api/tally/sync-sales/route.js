import xml2js from "xml2js";

async function fetchFromTally(xml) {
  try {
    const res = await fetch("http://localhost:9000", {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xml,
    });

    return await res.text();
  } catch (err) {
    if (err.cause?.code === "ECONNREFUSED") {
      throw new Error("Tally is not open");
    }
    throw err;
  }
}

export async function GET() {
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

          <!-- VERY IMPORTANT: LIMIT RANGE -->
          <SVFROMDATE>20260301</SVFROMDATE>
          <SVTODATE>20260305</SVTODATE>

          <!-- KEY FIX -->
          <SVVOUCHERTYPE>Sales Order</SVVOUCHERTYPE>

        </STATICVARIABLES>

      </REQUESTDESC>

      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">

          <COLLECTION NAME="SalesOrders">
            <TYPE>Voucher</TYPE>

            <!-- KEEP MINIMAL -->
            <FETCH>
              DATE,
              VOUCHERNUMBER,
              PARTYNAME,
              GUID,
              ALTERID
            </FETCH>

          </COLLECTION>

        </TALLYMESSAGE>
      </REQUESTDATA>

    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

  const xmlData = await fetchFromTally(xml);

  const parser = new xml2js.Parser({ explicitArray: false });
  const json = await parser.parseStringPromise(xmlData);

  const vouchers =
    json?.ENVELOPE?.BODY?.DATA?.TALLYMESSAGE || [];

  // Normalize array
  const list = Array.isArray(vouchers) ? vouchers : [vouchers];

  // 👉 Loop + upsert (pseudo DB logic)
  for (const v of list) {
    const voucher = v.VOUCHER;

    const guid = voucher.GUID;
    const alterId = Number(voucher.ALTERID);

    // 🔥 Check DB (pseudo)
    const existing = await db.sales_orders.findUnique({ where: { guid } });

    if (!existing) {
      // NEW
      await db.sales_orders.create({
        data: {
          guid,
          alter_id: alterId,
          party_name: voucher.PARTYNAME,
          voucher_number: voucher.VOUCHERNUMBER,
          date: voucher.DATE,
          raw_data: voucher,
        },
      });
    } else if (alterId > existing.alter_id) {
      // UPDATED
      await db.sales_orders.update({
        where: { guid },
        data: {
          alter_id: alterId,
          party_name: voucher.PARTYNAME,
          voucher_number: voucher.VOUCHERNUMBER,
          date: voucher.DATE,
          raw_data: voucher,
        },
      });
    }
  }

  return Response.json({ success: true });
}