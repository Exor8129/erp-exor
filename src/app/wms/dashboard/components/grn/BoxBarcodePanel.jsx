// "use client";

// import React from "react";
// import BarcodeSticker from "./BarcodeSticker";

// export default function BoxBarcodePanel({ grn }) {
//   const boxes = Array.from(
//     { length: grn?.boxes_received || 0 },
//     (_, i) => i + 1
//   );

//   return (
//     <div
//       style={{
//         display: "flex",
//         flexWrap: "wrap",
//         gap: 20,
//       }}
//     >
//       {boxes.map((box) => (
//         <BarcodeSticker
//           key={box}
//           grn={grn}
//           boxNo={box}
//         />
//       ))}
//     </div>
//   );
// }