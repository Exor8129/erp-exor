// import { jsPDF } from "jspdf";
// import bwipjs from "bwip-js";

// /**
//  * Universal Barcode Label Generator
//  * 
//  * @param {Array<Object>} items - List of items to print.
//  * @param {string} items[].title - Main header (e.g. GRN No, Company Name, SKU)
//  * @param {string} items[].subtitle - Secondary detail (e.g. Container Code)
//  * @param {string} items[].barcode - Barcode string value
//  * @param {Array<{label: string, value: string}>} [items[].extraFields] - Dynamic key-value meta text
//  * @param {Object} config - Page layout configuration
//  * @param {number} config.width - Label width in mm (default: 100)
//  * @param {number} config.height - Label height in mm (default: 50)
//  * @param {string} config.barcodeType - 'code128', 'qrcode', etc.
//  */
// export async function generateBarcodePDF(items = [], config = {}) {
//   const {
//     width = 100,
//     height = 50,
//     barcodeType = "code128",
//     autoPrint = true,
//   } = config;

//   if (!items.length) throw new Error("No barcode items provided for generation.");

//   const pdf = new jsPDF({
//     orientation: width > height ? "landscape" : "portrait",
//     unit: "mm",
//     format: [height, width],
//   });

//   for (let i = 0; i < items.length; i++) {
//     const item = items[i];

//     if (i > 0) {
//       pdf.addPage([height, width], width > height ? "landscape" : "portrait");
//     }

//     // 1. Draw Outer Border
//     pdf.setLineWidth(0.3);
//     pdf.rect(2, 2, width - 4, height - 4);

//     // 2. Primary Title (e.g. GRN / PO Number)
//     pdf.setFont("helvetica", "bold");
//     pdf.setFontSize(12);
//     if (item.title) {
//       pdf.text(String(item.title), 5, 8);
//     }

//     // 3. Subtitle / Secondary Details
//     pdf.setFont("helvetica", "normal");
//     pdf.setFontSize(9);
//     let currentY = 13;

//     if (item.subtitle) {
//       pdf.text(String(item.subtitle), 5, currentY);
//       currentY += 5;
//     }

//     // Render Dynamic Key-Value Pairs
//     if (Array.isArray(item.extraFields)) {
//       item.extraFields.forEach((field) => {
//         pdf.text(`${field.label}: ${field.value}`, 5, currentY);
//         currentY += 4.5;
//       });
//     }

//     // 4. Generate High-Res Canvas Barcode Data URL
//     const barcodeCanvas = document.createElement("canvas");
//     try {
//       bwipjs.toCanvas(barcodeCanvas, {
//         bcid: barcodeType,
//         text: String(item.barcode),
//         scale: 3,
//         height: 12,
//         includetext: true,
//         textxalign: "center",
//         textsize: 10,
//       });

//       const barcodeDataUrl = barcodeCanvas.toDataURL("image/png");

//       // Place Barcode near bottom
//       const barcodeHeight = 16;
//       const barcodeWidth = width - 10;
//       const barcodeY = height - barcodeHeight - 4;

//       pdf.addImage(barcodeDataUrl, "PNG", 5, barcodeY, barcodeWidth, barcodeHeight);
//     } catch (err) {
//       console.error(`Failed to generate barcode for ${item.barcode}:`, err);
//     }
//   }

//   if (autoPrint) {
//     pdf.autoPrint();
//   }

//   return pdf.output("bloburl");
// }