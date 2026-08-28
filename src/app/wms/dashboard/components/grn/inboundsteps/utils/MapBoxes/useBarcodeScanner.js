import { useEffect, useRef } from "react";

export default function useBarcodeScanner(onScan) {
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Ignore scanning when the user is focused inside input elements
      const target = e.target;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) return;

      const currentTime = Date.now();

      // Scanners input keys rapidly (< 100ms apart)
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = ""; // Reset buffer if typing pauses
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.length > 2) {
          onScan(barcodeBuffer);
        }
        barcodeBuffer = "";
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [onScan]);
}