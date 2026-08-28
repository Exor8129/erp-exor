// "use client";

// import React from "react";
// import { Descriptions, Tag } from "antd";

// export default function GRNDetailsCard({ grn }) {
//   return (
//     <Descriptions
//       bordered
//       column={2}
//       size="small"
//     >
//       <Descriptions.Item label="GRN Number">
//         {grn.grn_no}
//       </Descriptions.Item>

//       <Descriptions.Item label="Supplier">
//         {grn.vendor_name}
//       </Descriptions.Item>

//       <Descriptions.Item label="Invoice No">
//         {grn.invoice_no || "-"}
//       </Descriptions.Item>

//       <Descriptions.Item label="Received Date">
//         {grn.received_date
//           ? new Date(grn.received_date).toLocaleDateString()
//           : "-"}
//       </Descriptions.Item>

//       <Descriptions.Item label="Boxes Received">
//         <Tag color="blue">
//           {grn.boxes_received} Boxes
//         </Tag>
//       </Descriptions.Item>

//       <Descriptions.Item label="Transporter">
//         {grn.transporter_name || "-"}
//       </Descriptions.Item>

//       <Descriptions.Item label="Vehicle Number">
//         {grn.vehicle_number || "-"}
//       </Descriptions.Item>

//       <Descriptions.Item label="Status">
//         <Tag color="orange">
//           {grn.status}
//         </Tag>
//       </Descriptions.Item>
//     </Descriptions>
//   );
// }