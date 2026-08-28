// "use client";

// import React from "react";
// import { Card, Divider, Typography } from "antd";
// import Barcode from "react-barcode";

// const { Text } = Typography;

// export default function BarcodeSticker({ grn, boxNo }) {
//   const barcodeValue = `BX-${grn.grn_no}-${String(boxNo).padStart(4, "0")}`;

//   return (
//     <Card
//       variant="outlined"
//       style={{
//         width: "4in",
//         height: "2in",
//         margin: "10px auto",
//         border: "1px solid #000",
//         borderRadius: 0,
//       }}
//       styles={{
//         body: {
//           padding: 8,
//           height: "100%",
//         },
//       }}
//     >
//          <div style={{
//           textAlign: "center",
//           fontSize: 11,
//           color: "#666",
//         }}>
//         <Text strong>Date :</Text>{" "}
//         {new Date(grn.received_date).toLocaleDateString()}
//       </div>
//       <div
//         style={{
//           textAlign: "center",
//           fontWeight: 700,
//           fontSize: 16,
//           letterSpacing: 1,
//         }}
//       >
//         {grn.grn_no}
//       </div>
//       <div>
//         <Text strong>Box :</Text> {boxNo} / {grn.boxes_received}
//       </div>

//       <Divider style={{ margin: "8px 0" }} />

//       <div
//         style={{
//           display: "flex",
//           justifyContent: "center",
//           marginTop: 8,
//         }}
//       >
//         <Barcode
//           value={barcodeValue}
//           format="CODE128"
//           width={1.5}
//           height={45}
//           fontSize={12}
//           margin={0}
//           displayValue={false}
//         />
//       </div>

//       <div
//         style={{
//           textAlign: "center",
//           fontWeight: 700,
//           letterSpacing: 1,
//           marginTop: 4,
//         }}
//       >
//         {barcodeValue}
//       </div>

//       <Divider style={{ margin: "8px 0" }} />

     
//     </Card>
//   );
// }
