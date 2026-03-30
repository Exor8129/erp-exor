




// working fine code


// "use client";

// import { useEffect, useState } from "react";

// export default function BatchPage() {
//   const [batchData, setBatchData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState("");



//   function cleanName(name) {
//   if (!name) return "";
//   // Do NOT convert quotes here, let the Backend handle the Tally-specific escaping
//   return name.trim()
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;");
// }

//   async function loadAllData() {
//     try {
//       setLoading(true);
//       setStatus("Fetching item list...");

//       const itemsRes = await fetch("/api/tally/items");
//       const itemsJson = await itemsRes.json();
//       const itemsData = itemsJson?.items || [];

//       let allBatches = [];

//       // Loop through items one by one to prevent Tally Timeout
//       for (let i = 0; i < itemsData.length; i++) {
//         const item = itemsData[i];
//         const name = item.name.trim();

//         // --- FILTER: Skip names starting with "0." or any number ---
//         // Also skips names with single quotes to avoid "Bad Formula" error
//         if (/^\d/.test(name)) {
//           console.log(`Skipping numeric name: ${name}`);
//           continue;
//         }

//         setStatus(`Fetching (${i + 1}/${itemsData.length}): ${name}`);

//         try {
//           // We WAIT for each fetch to finish before starting the next one
//           const batchRes = await fetch("/api/tally/item-batch", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//            body: JSON.stringify({ safeId: item.safeId }),
//           });

//           const batchJson = await batchRes.json();

//           if (batchJson?.items) {
//             const mapped = batchJson.items.map((b) => ({
//               item_name: item.name,
//               batch_name: b.batch_name,
//               expiry_date: b.expiry_date,
//               closing_bal: b.closing_bal,
//             }));
//             allBatches = [...allBatches, ...mapped];

//             // Update UI incrementally so user sees progress
//             setBatchData([...allBatches]);
//           }
//         } catch (err) {
//           console.error(`Timeout or error on: ${name}`);
//         }
//       }

//       setStatus("Complete");
//       setLoading(false);
//     } catch (error) {
//       console.error("Load error:", error);
//       setStatus("Error: Tally connection failed.");
//       setLoading(false);
//     }
//   }




//   useEffect(() => {
//     loadAllData();
//   }, []);

//   return (
//     <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
//       <h2>Tally Batch List</h2>
//       <p style={{ color: "#666" }}>{status}</p>

//       {loading && <div style={{ height: '4px', background: '#ccc', width: '100%', marginBottom: '10px' }}>
//         <div style={{ height: '100%', background: '#0070f3', width: '50%' }}></div>
//       </div>}

//       <table border="1" cellPadding="8" width="100%" style={{ borderCollapse: "collapse" }}>
//         <thead style={{ background: "#f5f5f5" }}>
//           <tr>
//             <th>Item Name</th>
//             <th>Batch</th>
//             <th>Expiry</th>
//             <th>Stock</th>
//           </tr>
//         </thead>
//         <tbody>
//           {batchData.map((row, index) => (
//             <tr key={index}>
//               <td>{row.item_name}</td>
//               <td>{row.batch_name}</td>
//               <td>{row.expiry_date}</td>
//               <td>{row.closing_bal}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }





// // working code with clean UI

// "use client";

// import { useEffect, useState, useMemo } from "react";

// export default function BatchPage() {
//   const [itemsList, setItemsList] = useState([]); // Base list of items
//   const [batchData, setBatchData] = useState([]); // Collected batch results
//   const [loading, setLoading] = useState(false);
//   const [status, setStatus] = useState("");
//   const [progress, setProgress] = useState(0);
//   const [searchTerm, setSearchTerm] = useState("");

//   // --- SEARCH LOGIC ---
//   // Memoized so it only recalculates when searchTerm or batchData changes
//   const filteredResults = useMemo(() => {
//     return batchData.filter((row) =>
//       row.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       row.batch_name?.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//   }, [searchTerm, batchData]);

//   async function loadAllData() {
//     if (loading) return; // Prevent double clicking

//     try {
//       setLoading(true);
//       setStatus("Connecting to Tally...");
//       setProgress(0);
//       setBatchData([]); // Reset table for fresh sync

//       const itemsRes = await fetch("/api/tally/items");
//       const itemsJson = await itemsRes.json();
//       const itemsData = itemsJson?.items || [];
//       setItemsList(itemsData);

//       let allBatches = [];

//       for (let i = 0; i < itemsData.length; i++) {
//         const item = itemsData[i];
//         const name = item.name.trim();

//         // Update Status & Progress Bar
//         setStatus(`Fetching: ${name}`);
//         const currentProgress = Math.round(((i + 1) / itemsData.length) * 100);
//         setProgress(currentProgress);

//         try {
//           const batchRes = await fetch("/api/tally/item-batch", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ safeId: item.safeId }),
//           });

//           const batchJson = await batchRes.json();

//           if (batchJson?.items && batchJson.items.length > 0) {
//             const mapped = batchJson.items.map((b) => ({
//               item_name: item.name,
//               batch_name: b.batch_name,
//               expiry_date: b.expiry_date,
//               closing_bal: b.closing_bal,
//             }));

//             allBatches = [...allBatches, ...mapped];
//             setBatchData([...allBatches]); // Update UI incrementally
//           }
//         } catch (err) {
//           console.error(`Timeout or error on: ${name}`);
//         }
//       }

//       setStatus("Sync Complete");
//       setLoading(false);
//     } catch (error) {
//       console.error("Load error:", error);
//       setStatus("Error: Tally connection failed.");
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     loadAllData();
//   }, []);

//   return (
//     <div style={{ padding: "30px", fontFamily: "'Segoe UI', Tahoma, sans-serif", maxWidth: "1200px", margin: "0 auto" }}>

//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
//         <div>
//           <h2 style={{ margin: 0 }}>Exor Batch Inventory</h2>
//           <p style={{ color: loading ? "#0070f3" : "#666", fontSize: "14px", marginTop: "5px" }}>{status}</p>
//         </div>

//         <div style={{ display: "flex", gap: "10px" }}>
//           {/* SEARCH BOX */}
//           <input 
//             type="text" 
//             placeholder="Search items or batches..." 
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ddd", width: "250px" }}
//           />

//           {/* REFRESH BUTTON */}
//           <button 
//             onClick={loadAllData} 
//             disabled={loading}
//             style={{ 
//               padding: "10px 20px", 
//               borderRadius: "5px", 
//               border: "none", 
//               background: loading ? "#ccc" : "#28a745", 
//               color: "white", 
//               cursor: loading ? "not-allowed" : "pointer",
//               fontWeight: "bold"
//             }}
//           >
//             {loading ? "Syncing..." : "Refresh from Tally"}
//           </button>
//         </div>
//       </div>

//       {/* DYNAMIC LOADING BAR */}
//       <div style={{ 
//         height: '8px', 
//         background: '#eee', 
//         width: '100%', 
//         borderRadius: '10px', 
//         marginBottom: '25px',
//         overflow: 'hidden',
//         display: loading || progress === 100 ? 'block' : 'none'
//       }}>
//         <div style={{ 
//           height: '100%', 
//           background: progress === 100 ? '#28a745' : '#0070f3', 
//           width: `${progress}%`,
//           transition: "width 0.3s ease"
//         }}></div>
//       </div>

//       <table border="0" width="100%" style={{ borderCollapse: "separate", borderSpacing: "0 8px" }}>
//         <thead>
//           <tr style={{ textAlign: "left", color: "#444" }}>
//             <th style={{ padding: "12px" }}>Item Name</th>
//             <th style={{ padding: "12px" }}>Batch</th>
//             <th style={{ padding: "12px" }}>Expiry</th>
//             <th style={{ padding: "12px" }}>Stock</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredResults.map((row, index) => (
//             <tr key={index} style={{ background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
//               <td style={{ padding: "12px", borderRadius: "8px 0 0 8px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}>{row.item_name}</td>
//               <td style={{ padding: "12px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", color: "#666" }}>{row.batch_name}</td>
//               <td style={{ padding: "12px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", color: "#666" }}>{row.expiry_date}</td>
//               <td style={{ padding: "12px", borderRadius: "0 8px 8px 0", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", fontWeight: "bold", color: "#d9534f" }}>
//                 {row.closing_bal}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {!loading && filteredResults.length === 0 && (
//         <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
//           No batches found matching your search.
//         </div>
//       )}
//     </div>
//   );
// }


















// working code with clean UI

"use client";

import { useEffect, useState, useMemo } from "react";

export default function BatchPage() {
  const [itemsList, setItemsList] = useState([]); // Base list of items
  const [batchData, setBatchData] = useState([]); // Collected batch results
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // --- SEARCH LOGIC ---
  // Memoized so it only recalculates when searchTerm or batchData changes
  const filteredResults = useMemo(() => {
    return batchData.filter((row) =>
      row.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.batch_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, batchData]);

  async function loadAllData() {
    if (loading) return; // Prevent double clicking

    try {
      setLoading(true);
      setStatus("Connecting to Tally...");
      setProgress(0);
      setBatchData([]); // Reset table for fresh sync

      const itemsRes = await fetch("/api/tally/items");
      const itemsJson = await itemsRes.json();
      const itemsData = itemsJson?.items || [];
      setItemsList(itemsData);

      let allBatches = [];

      for (let i = 0; i < itemsData.length; i++) {
        const item = itemsData[i];
        const name = item.name.trim();

        // Update Status & Progress Bar
        setStatus(`Fetching: ${name}`);
        const currentProgress = Math.round(((i + 1) / itemsData.length) * 100);
        setProgress(currentProgress);

        try {
          const batchRes = await fetch("/api/tally/item-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ safeId: item.safeId }),
          });

          const batchJson = await batchRes.json();

          if (batchJson?.items && batchJson.items.length > 0) {
            const mapped = batchJson.items.map((b) => ({
              item_name: item.name,
              batch_name: b.batch_name,
              expiry_date: b.expiry_date,
              closing_bal: b.closing_bal,
              hsn: b.hsn,
            }));

            allBatches = [...allBatches, ...mapped];
            setBatchData([...allBatches]); // Update UI incrementally
          }
        } catch (err) {
          console.error(`Timeout or error on: ${name}`);
        }
      }

      setStatus("Sync Complete");
      setLoading(false);
    } catch (error) {
      console.error("Load error:", error);
      setStatus("Error: Tally connection failed.");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <div style={{ padding: "30px", fontFamily: "'Segoe UI', Tahoma, sans-serif", maxWidth: "1200px", margin: "0 auto" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0 }}>Exor Batch Inventory</h2>
          <p style={{ color: loading ? "#0070f3" : "#666", fontSize: "14px", marginTop: "5px" }}>{status}</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {/* SEARCH BOX */}
          <input
            type="text"
            placeholder="Search items or batches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ddd", width: "250px" }}
          />

          {/* REFRESH BUTTON */}
          <button
            onClick={loadAllData}
            disabled={loading}
            style={{
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              background: loading ? "#ccc" : "#28a745",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "bold"
            }}
          >
            {loading ? "Syncing..." : "Refresh from Tally"}
          </button>
        </div>
      </div>

      {/* DYNAMIC LOADING BAR */}
      <div style={{
        height: '8px',
        background: '#eee',
        width: '100%',
        borderRadius: '10px',
        marginBottom: '25px',
        overflow: 'hidden',
        display: loading || progress === 100 ? 'block' : 'none'
      }}>
        <div style={{
          height: '100%',
          background: progress === 100 ? '#28a745' : '#0070f3',
          width: `${progress}%`,
          transition: "width 0.3s ease"
        }}></div>
      </div>

<table border="0" width="100%" style={{ borderCollapse: "separate", borderSpacing: "0 8px" }}>
  <thead style={{ background: "#f5f5f5" }}>
    <tr style={{ textAlign: "left", color: "#444" }}>
      <th style={{ padding: "12px" }}>Item Name</th>
      <th style={{ padding: "12px" }}>HSN</th>
      <th style={{ padding: "12px" }}>Tracking</th>
      <th style={{ padding: "12px" }}>Batch / Serial</th>
      <th style={{ padding: "12px" }}>Expiry</th>
      <th style={{ padding: "12px" }}>MRP</th>
      <th style={{ padding: "12px" }}>Tax %</th>
      <th style={{ padding: "12px" }}>Nos/Box</th>
      <th style={{ padding: "12px" }}>Stock</th>
    </tr>
  </thead>
  <tbody>
    {filteredResults.map((row, index) => (
      <tr key={index} style={{ background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        {/* Item Name */}
        <td style={{ padding: "12px", borderRadius: "8px 0 0 8px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}>
          <div style={{ fontWeight: "500" }}>{row.item_name}</div>
          <div style={{ fontSize: "11px", color: "#999" }}>Vendor: {row.vendor}</div>
        </td>

        {/* HSN */}
        <td style={{ padding: "12px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", color: "#666" }}>
          {row.hsn || "N/A"}
        </td>

        {/* Tracking Type */}
        <td style={{ padding: "12px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}>
          <span style={{ 
            fontSize: "12px", 
            padding: "2px 8px", 
            borderRadius: "4px", 
            background: row.tracking === "Batch" ? "#e3f2fd" : "#f3e5f5",
            color: row.tracking === "Batch" ? "#1976d2" : "#7b1fa2" 
          }}>
            {row.tracking}
          </span>
        </td>

        {/* Batch Name */}
        <td style={{ padding: "12px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", color: "#666" }}>
          {row.batch_name}
        </td>

        {/* Expiry */}
        <td style={{ padding: "12px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", color: "#d9534f" }}>
          {row.expiry_date}
        </td>

        {/* MRP */}
        <td style={{ padding: "12px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", fontWeight: "500" }}>
          ₹{row.mrp}
        </td>

        {/* Tax Rate */}
        <td style={{ padding: "12px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", color: "#666" }}>
          {row.tax_rate}
        </td>

        {/* Nos/Box */}
        <td style={{ padding: "12px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", color: "#666" }}>
          {row.nos_box}
        </td>

        {/* Stock (Closing Balance) */}
        <td style={{ 
          padding: "12px", 
          borderRadius: "0 8px 8px 0", 
          borderTop: "1px solid #eee", 
          borderBottom: "1px solid #eee", 
          fontWeight: "bold", 
          color: parseFloat(row.closing_bal) <= 0 ? "#d9534f" : "#28a745",
          textAlign: "right"
        }}>
          {row.closing_bal}
        </td>
      </tr>
    ))}
  </tbody>
</table>

      {!loading && filteredResults.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          No batches found matching your search.
        </div>
      )}
    </div>
  );
}














