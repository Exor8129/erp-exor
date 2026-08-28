import { generateBarcodePDF } from "./barcodePrinter"; // Core PDF generator built earlier
import { message } from "antd";

/**
 * Dynamically generates and prints barcode labels based on quantity and GRN.
 * 
 * @param {number} qty - Number of barcodes to generate (e.g., 20)
 * @param {string} grnNumber - GRN Number (e.g., "GRN-2026-1015")
 * @param {string} type - Container Type (e.g., "MASTER", "SPLIT", "BAG", "BOX")
 * @param {Object} [options] - Optional custom configurations
 * @param {number} [options.startSeq=1] - Starting sequence number (default: 1)
 * @param {string} [options.labelSize="100x50"] - Size in mm ("100x50", "50x25", etc.)
 * @returns {Promise<Array<Object>>} Returns the generated barcode objects
 */
export async function giveBarcode(qty, grnNumber, type = "SPLIT", options = {}) {
  const { startSeq = 1, labelSize = "100x50" } = options;

  if (!qty || qty <= 0) {
    message.warning("Quantity must be greater than 0.");
    return [];
  }

  if (!grnNumber) {
    message.error("GRN Number is required to generate barcodes.");
    return [];
  }

  // 1. Format Type Prefix (e.g., "MASTER" -> "MST", "SPLIT" -> "SPT", "BOX" -> "BOX")
  const typeCode = type.toUpperCase().slice(0, 3);
  const cleanGrn = grnNumber.trim().toUpperCase();

  // 2. Generate Sequential Barcode Payload
  const generatedLabels = [];

  for (let i = 0; i < qty; i++) {
    const seq = String(startSeq + i).padStart(3, "0");
    // Format: GRN-2026-1015-SPT-001
    const barcodeValue = `${cleanGrn}-${typeCode}-${seq}`;

    generatedLabels.push({
      id: barcodeValue,
      title: cleanGrn,
      subtitle: `Type: ${type.toUpperCase()}`,
      barcode: barcodeValue,
      extraFields: [
        { label: "Seq", value: `${i + 1} of ${qty}` },
      ],
    });
  }

  // 3. Map Label Dimensions
  const dimensionsMap = {
    "100x50": { width: 100, height: 50 },
    "50x25": { width: 50, height: 25 },
    "75x50": { width: 75, height: 50 },
  };

  const dims = dimensionsMap[labelSize] || dimensionsMap["100x50"];

  // 4. Generate PDF & Open Browser Print Window
  try {
    const pdfBlobUrl = await generateBarcodePDF(generatedLabels, {
      width: dims.width,
      height: dims.height,
      barcodeType: "code128",
      autoPrint: true,
    });

    // Automatically open browser print window
    window.open(pdfBlobUrl, "_blank");

    message.success(`Generated ${qty} ${type} barcode(s) for ${cleanGrn}`);
    return generatedLabels;
  } catch (err) {
    console.error("Failed in giveBarcode:", err);
    message.error(`Barcode generation failed: ${err.message}`);
    return [];
  }
}