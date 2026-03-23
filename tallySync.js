require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const xml2js = require('xml2js'); // Run: npm install xml2js

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TALLY_URL = 'http://localhost:9000';

// XML to get Stock Items with their respective Batches and Expiry
const tallyRequestXML = `
<ENVELOPE>
    <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
    <BODY>
        <EXPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>Stock Summary</REPORTNAME>
                <STATICVARIABLES>
                    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                </STATICVARIABLES>
            </REQUESTDESC>
        </EXPORTDATA>
    </BODY>
</ENVELOPE>`;

async function sync() {
    try {
        console.log("Connecting to Tally...");
        const response = await axios.post(TALLY_URL, tallyRequestXML, {
            headers: { 'Content-Type': 'text/xml' }
        });

        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        // Access the list of items from Tally's XML structure
        const items = result.ENVELOPE.BODY.DATA.COLLECTION.STOCKITEM;

        for (let item of Array.isArray(items) ? items : [items]) {
            const itemName = item.NAME;
            
            // 1. Update/Insert Item Master
            const { data: itemRecord, error: itemErr } = await supabase
                .from('item_master')
                .upsert({ 
                    item_name: itemName,
                    tracking_type: item.HAS_BATCHES === 'Yes' ? 'batch' : 'none'
                }, { onConflict: 'item_name' })
                .select()
                .single();

            if (itemErr) continue;

            // 2. Handle Batches (If applicable)
            if (item.BATCH_DETAILS) {
                const batches = Array.isArray(item.BATCH_DETAILS) ? item.BATCH_DETAILS : [item.BATCH_DETAILS];
                
                for (let b of batches) {
                    await supabase.from('cycle_items').upsert({
                        item_id: itemRecord.id,
                        sys_batch_no: b.BATCHNAME,
                        sys_expiry_date: b.EXPIRYDATE, // Ensure Tally format is YYYY-MM-DD
                        status: 'pending'
                    });
                }
            }
        }
        console.log("✅ Sync Successful: Tally data is now in Supabase.");
    } catch (err) {
        console.error("❌ Sync Failed. Is Tally open on Port 9000?", err.message);
    }
}

sync();