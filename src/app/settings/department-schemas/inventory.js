import UnitConversionSettings from "../inventory/UnitConversionSettings";

export const inventorySchema = {
  title: "Inventory Settings",

  menu: [
    {
      id: "general",
      label: "General",
      description: "Inventory department preferences",
    },
    {
      id: "warehouses",
      label: "Warehouses",
      description: "Manage warehouse settings",
    },
    {
      id: "stock-rules",
      label: "Stock Rules",
      description: "Configure stock handling rules",
    },
    {
      id: "reorder-levels",
      label: "Reorder Levels",
      description: "Configure reorder policies",
    },
    {
      id: "audit",
      label: "Audit Logs",
      description: "Inventory audit history",
    },
    {
      id: "conversion",
      label: "Unit Conversion",
      description: "Manage unit conversion settings",
      component: UnitConversionSettings,
    },
  ],
};