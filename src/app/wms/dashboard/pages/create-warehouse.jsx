"use client";

import React, { useState, useEffect } from "react";

export default function CreateWarehouse() {
  // Section 1 State: Metadata
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    location: "",
    capacity: "",
    type: "Distribution Center",
  });

  // Section 2 State: Grid Definition & Global Aspect Ratio
  const [gridConfig, setGridConfig] = useState({
    rows: 8,
    cols: 10,
  });
  
  // Toggles the aspect ratio of the cells globally
  const [cellOrientation, setCellOrientation] = useState("landscape");

  // Selection states for click-and-drag mechanics
  const [isDragging, setIsDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);

  // Cell Types: "vacant" | "rack" | "floor-stack" | "aisle"
  const [singleCells, setSingleCells] = useState({});
  const [mergedAisles, setMergedAisles] = useState([]);

  // Reset structures when dimensions alter drastically
  useEffect(() => {
    setSingleCells({});
    setMergedAisles([]);
  }, [gridConfig.rows, gridConfig.cols]);

  // Dynamic Bounding Box Math Helper for Drag Selection
  const isCellSelected = (r, c) => {
    if (!selectionStart || !selectionEnd) return false;
    const minR = Math.min(selectionStart.r, selectionEnd.r);
    const maxR = Math.max(selectionStart.r, selectionEnd.r);
    const minC = Math.min(selectionStart.c, selectionEnd.c);
    const maxC = Math.max(selectionStart.c, selectionEnd.c);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  // Drag Event Boundaries Management
  const handleCellMouseDown = (r, c) => {
    setIsDragging(true);
    setSelectionStart({ r, c });
    setSelectionEnd({ r, c });
  };

  const handleCellMouseEnter = (r, c) => {
    if (!isDragging) return;
    setSelectionEnd({ r, c });
  };

  const handleMouseUpGlobal = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUpGlobal);
    return () => window.removeEventListener("mouseup", handleMouseUpGlobal);
  }, [isDragging]);

  // Clears out overlapping items when a new assignment overrides coordinates
  const clearZoneOverlaps = (r, c, updatedAisles) => {
    return updatedAisles.filter(aisle => {
      const inRowBound = (r >= aisle.origin.r && r < aisle.origin.r + aisle.size.rSpan);
      const inColBound = (c >= aisle.origin.c && c < aisle.origin.c + aisle.size.cSpan);
      return !(inRowBound && inColBound);
    });
  };

  // Convert the current selected group of cells to standard unmerged types
  const applyStandardZoneToSelection = (type) => {
    if (!selectionStart || !selectionEnd) return;
    
    const minR = Math.min(selectionStart.r, selectionEnd.r);
    const maxR = Math.max(selectionStart.r, selectionEnd.r);
    const minC = Math.min(selectionStart.c, selectionEnd.c);
    const maxC = Math.max(selectionStart.c, selectionEnd.c);

    const newCells = { ...singleCells };
    let newAisles = [...mergedAisles];

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const key = `${r}-${c}`;
        newAisles = clearZoneOverlaps(r, c, newAisles);
        if (type === "vacant") {
          delete newCells[key];
        } else {
          newCells[key] = type;
        }
      }
    }

    setSingleCells(newCells);
    setMergedAisles(newAisles);
    clearSelection();
  };

  // Specialized dynamic block merge action ONLY available for Aisle blocks
  const mergeSelectionToAisle = () => {
    if (!selectionStart || !selectionEnd) return;

    const minR = Math.min(selectionStart.r, selectionEnd.r);
    const maxR = Math.max(selectionStart.r, selectionEnd.r);
    const minC = Math.min(selectionStart.c, selectionEnd.c);
    const maxC = Math.max(selectionStart.c, selectionEnd.c);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const currentZone = singleCells[`${r}-${c}`];
        if (currentZone === "rack" || currentZone === "floor-stack") {
          alert("Invalid Merge: You can only merge empty cells or individual Aisle spaces into a block Aisle.");
          return;
        }
      }
    }

    const rSpan = (maxR - minR) + 1;
    const cSpan = (maxC - minC) + 1;

    const newCells = { ...singleCells };
    let newAisles = [...mergedAisles];

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        newAisles = clearZoneOverlaps(r, c, newAisles);
        delete newCells[`${r}-${c}`];
      }
    }

    newAisles.push({
      id: `aisle-${Date.now()}`,
      origin: { r: minR, c: minC },
      size: { rSpan, cSpan }
    });

    setSingleCells(newCells);
    setMergedAisles(newAisles);
    clearSelection();
  };

  const clearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // Process visual placements
  const mergedMap = {};
  mergedAisles.forEach((aisle) => {
    for (let r = aisle.origin.r; r < aisle.origin.r + aisle.size.rSpan; r++) {
      for (let c = aisle.origin.c; c < aisle.origin.c + aisle.size.cSpan; c++) {
        mergedMap[`${r}-${c}`] = {
          isOrigin: r === aisle.origin.r && c === aisle.origin.c,
          data: aisle,
        };
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalPayload = {
      ...formData,
      layout: {
        dimensions: gridConfig,
        cellOrientation: cellOrientation,
        singleCells: Object.keys(singleCells).map(key => {
          const [r, c] = key.split("-").map(Number);
          return { row: r, col: c, type: singleCells[key] };
        }),
        mergedAisles: mergedAisles,
      },
    };
    console.log("Submitting Layout Package:", finalPayload);
  };

  const gridRowsArray = Array.from({ length: gridConfig.rows });
  const gridColsArray = Array.from({ length: gridConfig.cols });

  // Dynamic aspect ratio tracking rule for gapless container grids
  const cellAspectRatio = cellOrientation === "landscape" ? "aspect-video" : "aspect-[3/4]";

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      {/* Page Title */}
      <div className="border-b border-slate-100 pb-5 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Create New Warehouse Layout
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Register warehouse details and visually map zones using multi-cell selection.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: FACILITY PROFILE */}
        <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              1
            </span>
            Facility Profile
          </h2>

          <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Warehouse Name</label>
              <input
                type="text" required placeholder="Central Logistics Hub"
                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Facility Code</label>
              <input
                type="text" required placeholder="WH-EAST-01"
                value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Capacity (m³)</label>
              <input
                type="number" required placeholder="50000"
                value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: INTERACTIVE DESIGNER */}
        <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              2
            </span>
            Layout Canvas Configuration
          </h2>

          {/* Configuration and Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex flex-wrap gap-6 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Grid Dimensions</label>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
                  <input
                    type="number" min={4} max={25} value={gridConfig.rows}
                    onChange={(e) => setGridConfig({ ...gridConfig, rows: Math.max(2, parseInt(e.target.value) || 2) })}
                    className="w-16 text-center border-none focus:outline-none text-sm font-semibold"
                  />
                  <span className="text-slate-400 text-xs">×</span>
                  <input
                    type="number" min={4} max={25} value={gridConfig.cols}
                    onChange={(e) => setGridConfig({ ...gridConfig, cols: Math.max(2, parseInt(e.target.value) || 2) })}
                    className="w-16 text-center border-none focus:outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Global Cell Ratio</label>
                <div className="flex rounded-lg bg-white p-1 border border-slate-200">
                  <button
                    type="button" onClick={() => setCellOrientation("landscape")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${cellOrientation === "landscape" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    Landscape
                  </button>
                  <button
                    type="button" onClick={() => setCellOrientation("portrait")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${cellOrientation === "portrait" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    Portrait
                  </button>
                </div>
              </div>
            </div>

            {/* Action Tools Palette */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tool Palette (Select cells first)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                <button
                  type="button" onClick={() => applyStandardZoneToSelection("rack")}
                  className="bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-700 shadow-2xs"
                >
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs"></span> Rack
                </button>
                <button
                  type="button" onClick={() => applyStandardZoneToSelection("floor-stack")}
                  className="bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-700 shadow-2xs"
                >
                  <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs"></span> FSA
                </button>
                <button
                  type="button" onClick={() => applyStandardZoneToSelection("aisle")}
                  className="bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-700 shadow-2xs"
                >
                  <span className="w-2.5 h-2.5 bg-slate-400 rounded-xs"></span> Aisle (Single)
                </button>
                <button
                  type="button" onClick={() => applyStandardZoneToSelection("vacant")}
                  className="bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-700 shadow-2xs"
                >
                  <span className="w-2.5 h-2.5 bg-white border border-slate-300 rounded-xs"></span> Clear
                </button>
                <button
                  type="button" onClick={mergeSelectionToAisle}
                  className="bg-slate-800 hover:bg-slate-950 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-colors"
                >
                  Merge to Aisle Block
                </button>
              </div>
            </div>
          </div>

          {/* Seamless, Full-Width Fluid Blueprint Grid Box */}
          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div
              className="grid gap-0 bg-slate-200 w-full mx-auto select-none border border-slate-300 overflow-hidden"
              style={{
                gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
              }}
            >
              {gridRowsArray.map((_, rIndex) =>
                gridColsArray.map((_, cIndex) => {
                  const key = `${rIndex}-${cIndex}`;
                  const cellState = singleCells[key];
                  const mergeInfo = mergedMap[key];
                  const selected = isCellSelected(rIndex, cIndex);

                  if (mergeInfo && !mergeInfo.isOrigin) return null;

                  let cellStyle = "bg-white text-slate-400 border border-slate-200 hover:bg-slate-50";
                  let label = `Cell ${rIndex + 1}-${cIndex + 1}`;

                  if (mergeInfo?.isOrigin) {
                    cellStyle = "bg-slate-300 text-slate-800 font-bold border border-slate-400 shadow-inner";
                    label = `AISLE BLOCK (${mergeInfo.data.size.cSpan}x${mergeInfo.data.size.rSpan})`;
                  } else if (cellState === "rack") {
                    cellStyle = "bg-blue-600 text-white font-bold border border-blue-700 shadow-sm";
                    label = `RACK`;
                  } else if (cellState === "floor-stack") {
                    cellStyle = "bg-emerald-600 text-white font-bold border border-emerald-700 shadow-sm";
                    label = `FSA`;
                  } else if (cellState === "aisle") {
                    cellStyle = "bg-slate-400 text-white font-bold border border-slate-500 shadow-sm";
                    label = `AISLE`;
                  }

                  if (selected) {
                    cellStyle = "bg-blue-100 border-2 border-blue-500 text-blue-700 font-medium z-10";
                  }

                  return (
                    <div
                      key={key}
                      onMouseDown={() => handleCellMouseDown(rIndex, cIndex)}
                      onMouseEnter={() => handleCellMouseEnter(rIndex, cIndex)}
                      style={{
                        gridRowEnd: mergeInfo?.isOrigin ? `span ${mergeInfo.data.size.rSpan}` : undefined,
                        gridColumnEnd: mergeInfo?.isOrigin ? `span ${mergeInfo.data.size.cSpan}` : undefined,
                      }}
                      className={`${cellStyle} ${mergeInfo?.isOrigin ? "" : cellAspectRatio} flex flex-col items-center justify-center text-xs text-center p-1 cursor-crosshair transition-all overflow-hidden`}
                    >
                      <span className="opacity-95 text-[10px] font-bold tracking-tight truncate w-full px-0.5">{label}</span>
                      <span className="text-[9px] opacity-40 block">[{rIndex + 1},{cIndex + 1}]</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* FOOTER ACTIONS SUBMIT BAR */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button" onClick={() => { setSingleCells({}); setMergedAisles([]); }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Reset Design Canvas
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            Create Warehouse & Save Layout
          </button>
        </div>
      </form>
    </div>
  );
}