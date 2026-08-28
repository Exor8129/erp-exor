import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { tallyUrl, maxAlterId } = await request.json();

    // 1. Build the dynamic TDL request payload
    const xmlPayload = `
<ENVELOPE>
    <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>Stock Items</ID>
    </HEADER>

    <BODY>
        <DESC>
            <STATICVARIABLES>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>

            <TDL>
                <TDLMESSAGE>

                    <COLLECTION NAME="Stock Items">
                        <TYPE>Stock Item</TYPE>

                        <FETCH>
                            Name,
                            GUID,
                            AlterID,
                            HSNDetails,
                            GSTDETAILS.LIST
                        </FETCH>

                    </COLLECTION>

                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>
`;

    // 2. Query Tally's local server from the backend
    const targetUrl = tallyUrl || "http://127.0.0.1:9000";
    const tallyResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
      },
      body: xmlPayload,
      // Prevents caching
      cache: "no-store",
    });

    if (!tallyResponse.ok) {
      throw new Error(
        `Tally server responded with status: ${tallyResponse.status}`,
      );
    }

    const xmlData = await tallyResponse.text();

    console.log("========== XML FROM TALLY ==========");
    console.log(xmlData);
    console.log("===================================");

    return NextResponse.json({ success: true, xml: xmlData });
  } catch (error) {
    console.error("Tally Sync Proxy Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to connect to Tally" },
      { status: 500 },
    );
  }
}
