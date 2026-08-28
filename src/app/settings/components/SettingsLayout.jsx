"use client";

import { useState } from "react";
import SettingsSidebar from "./SettingsSidebar";
import SettingsContent from "./SettingsContent";

export default function SettingsLayout({ schema }) {
  const [activeMenu, setActiveMenu] = useState(schema.menu?.[0]?.id || "");

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">{schema.title}</h1>

          <p className="text-slate-500 mt-1">
            Configure department preferences and workflows.
          </p>
        </div>

        {/* Horizontal Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px minmax(0, 1fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <SettingsSidebar
            menuItems={schema.menu}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
          />

          <SettingsContent activeMenu={activeMenu} menuItems={schema.menu} />
        </div>
      </div>
    </div>
  );
}
