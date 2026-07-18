import React, { useState } from "react";
import MapCanvas from "../components/create-warehouse/MapCanvas";
import RackDetailView from "../components/create-warehouse/RackDetailView";
import SRackDetailView from "../components/create-warehouse/SRackDetailView";
import FSADetailView from "../components/create-warehouse/FSADetailView";
import "./css/create-warehouse.css";

// 1. Layout imports
import mainWarehouse from "../components/layouts/main-warehouse";
import basement from "../components/layouts/basement"; 
import microWarehouse from "../components/layouts/micro-warehouse"; 

const LAYOUT_OPTIONS = {
  main: mainWarehouse,
  basement: basement,
  micro: microWarehouse,
};

const CreateWarehousePage = () => {
  const [currentLayoutKey, setCurrentLayoutKey] = useState("main");
  const [selectedItem, setSelectedItem] = useState(null);

  const activeWarehouse = LAYOUT_OPTIONS[currentLayoutKey] || mainWarehouse;

  const handleLayoutChange = (e) => {
    setCurrentLayoutKey(e.target.value);
    setSelectedItem(null); 
  };

  const handleSelect = (item) => {
    console.log("Selected Item Type:", item.type);
    setSelectedItem(item);
  };

  const renderDetailView = () => {
    if (!selectedItem) {
      return (
        <div className="placeholder-box">
          <div className="placeholder-icon">📦</div>
          <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>
            No Element Selected
          </h4>
          <p style={{ margin: 0, fontSize: "12px", color: "#9bafc6", maxWidth: "200px", lineHeight: "1.5" }}>
            Click on any rack, small rack, or FSA block on the layout map to inspect details.
          </p>
        </div>
      );
    }

    const closeHandler = () => setSelectedItem(null);

    const viewWrapper = (title, bg, text, border, childComponent) => (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="details-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flexGrow: 1 }}>
            <span style={{
              display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "10px",
              fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em",
              backgroundColor: bg, color: text, border: `1px solid ${border}`, marginBottom: "4px"
            }}>
              {selectedItem.type}
            </span>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>
              {selectedItem.id || 'Inspecting Element'}
            </h3>
          </div>
          <button 
            onClick={closeHandler}
            style={{ padding: "4px 8px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "14px" }}
          >
            ✕
          </button>
        </div>
        <div className="details-content" style={{ overflowY: "auto" }}>
          {childComponent}
        </div>
      </div>
    );

    switch (selectedItem.type) {
      case "rack":
        return viewWrapper("Standard Rack", "#e0e7ff", "#4338ca", "#c7d2fe", <RackDetailView data={selectedItem} onClose={closeHandler} />);
      case "fsa":
        return viewWrapper("Floor Storage", "#d1fae5", "#047857", "#a7f3d0", <FSADetailView data={selectedItem} onClose={closeHandler} />);
      case "s-rack":
        return viewWrapper("Short/Small Rack", "#fef3c7", "#b45309", "#fde68a", <SRackDetailView data={selectedItem} onClose={closeHandler} />);
      default:
        return viewWrapper("Warehouse Object", "#f1f5f9", "#334155", "#e2e8f0", <RackDetailView data={selectedItem} onClose={closeHandler} />);
    }
  };

  return (
    <div className="warehouse-page-container">
      <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Global Control Header */}
        <header style={{
          backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px",
          padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex",
          justifyContent: "space-between", alignItems: "center", gap: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "40px", height: "40px", backgroundColor: "#4f46e5", borderRadius: "12px",
              display: "flex", alignItems: "center", color: "#ffffff",
              fontWeight: "900", justifyContent: "center"
            }}>
              W
            </div>
            <div>
              <p style={{ margin: "0 0 4px 0", fontSize: "11px", fontWeight: "700", color: "#4f46e5", textTransform: "uppercase", letterSpacing: "1px" }}>Digital Twin Layout</p>
              <h1 className="warehouse-title" style={{ margin: 0 }}>
                {activeWarehouse.name}
              </h1>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label htmlFor="layout-select" style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase" }}>
              Active Zone:
            </label>
            <select 
              id="layout-select" 
              value={currentLayoutKey} 
              onChange={handleLayoutChange}
              style={{
                backgroundColor: "#f1f5f9", color: "#334155", fontSize: "12px", fontWeight: "700",
                padding: "8px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", cursor: "pointer"
              }}
            >
              <option value="main">📍 Main Floor Plan</option>
              <option value="basement">📑 Basement Storage</option>
              <option value="micro">⚡ Micro Fulfillment</option>
            </select>
          </div>
        </header>

        <div className="warehouse-content-wrapper">
          
          {/* LEFT SECTION: Main Visual Map Area Canvas */}
          <main className="map-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", backgroundColor: "#10b981", borderRadius: "50%" }} />
                <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Live View Interactive Grid</h2>
              </div>
              <span style={{ fontSize: "10px", backgroundColor: "#f1f5f9", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace", color: "#64748b" }}>
                Scale: 1px = 1cm
              </span>
            </div>
            <div style={{ flexGrow: 1, backgroundColor: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "12px", overflow: "hidden" }}>
              <MapCanvas
                key={currentLayoutKey} 
                elements={activeWarehouse.elements}
                onElementSelect={handleSelect}
              />
            </div>
          </main>

          {/* RIGHT SECTION: Inspector Panel */}
          <aside className="details-section">
            <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
              {renderDetailView()}
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default CreateWarehousePage;