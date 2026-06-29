"use client";

import { useEffect, useState } from "react";
import { Card, Select, InputNumber, Button, message, Spin } from "antd";
import { supabase } from "../../lib/supabase";

const UOM_OPTIONS = [
  { value: "PCS", label: "PCS" },
  { value: "STRIP", label: "STRIP" },
  { value: "UNIT", label: "UNIT" },
  { value: "CASE", label: "CASE" },
  { value: "CARTON", label: "CARTON" },
  { value: "BOX", label: "BOX" },
  { value: "PACK", label: "PACK" },
  { value: "SET", label: "SET" },
  { value: "KG", label: "KG" },
  { value: "GM", label: "GM" },
  { value: "LTR", label: "LTR" },
  { value: "ML", label: "ML" },
];

export default function UnitConversionSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const [baseUnit, setBaseUnit] = useState("PCS");
  const [conversions, setConversions] = useState([]);
  const [editingUom, setEditingUom] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("item_master")
        .select("id, item_name, uom")
        .eq("status", true)
        .order("item_name");

      if (error) throw error;

      setItems(data || []);
    } catch (error) {
      console.error(error);
      message.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function fetchConversions(itemId) {
    try {
      const { data, error } = await supabase
        .from("item_unit_conversions")
        .select("*")
        .eq("item_id", itemId)
        .order("sort_order");

      if (error) throw error;

      const rows = data || [];

      setConversions(
        rows.map((r) => ({
          id: r.id,
          unit: r.from_unit,
          factor: Number(r.factor),
        })),
      );
    } catch (error) {
      console.error(error);
      message.error("Failed to load conversions");
    }
  }

  async function handleProductChange(itemId) {
    const item = items.find((p) => p.id === itemId);

    if (!item) return;

    setSelectedItem(item);
    setBaseUnit(item.uom || "PCS");
    setEditingUom(false);

    await fetchConversions(item.id);
  }

  function addRow() {
    setConversions((prev) => [
      ...prev,
      {
        id: null,
        unit: "",
        factor: 1,
      },
    ]);
  }

  function updateRow(index, key, value) {
    const updated = [...conversions];
    updated[index][key] = value;
    setConversions(updated);
  }

  function removeRow(index) {
    setConversions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!selectedItem) {
      message.warning("Please select a product");
      return;
    }

    if (!baseUnit) {
      message.warning("Please select a base unit");
      return;
    }

    const units = conversions.map((c) => c.unit).filter(Boolean);

    const duplicates = units.filter(
      (item, index) => units.indexOf(item) !== index,
    );

    if (duplicates.length > 0) {
      message.error("Duplicate units found");
      return;
    }

    if (units.includes(baseUnit)) {
      message.error("Base unit cannot be added again");
      return;
    }

    try {
      setSaving(true);

      // Update item master UOM
      const { error: updateError } = await supabase
        .from("item_master")
        .update({
          uom: baseUnit,
        })
        .eq("id", selectedItem.id);

      if (updateError) throw updateError;

      // Remove old conversions
      const { error: deleteError } = await supabase
        .from("item_unit_conversions")
        .delete()
        .eq("item_id", selectedItem.id);

      if (deleteError) throw deleteError;

      // Insert new conversions
      const payload = conversions
        .filter((row) => row.unit && row.factor > 0)
        .map((row, index) => ({
          item_id: selectedItem.id,
          from_unit: row.unit,
          to_unit: baseUnit,
          factor: Number(row.factor),
          sort_order: index + 1,
        }));

      if (payload.length > 0) {
        const { error } = await supabase
          .from("item_unit_conversions")
          .insert(payload);

        if (error) throw error;
      }

      message.success("Unit conversions saved successfully");

      setSelectedItem(null);
      setBaseUnit("PCS");
      setConversions([]);
    } catch (error) {
      console.error(error);
      message.error("Failed to save conversions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Unit Conversion Settings">
      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* PRODUCT */}
          <div>
            <label className="block text-sm font-medium mb-2">Product</label>

            <Select
              showSearch
              className="w-full"
              placeholder="Search Product..."
              optionFilterProp="label"
              value={selectedItem?.id}
              onChange={handleProductChange}
              options={items.map((item) => ({
                value: item.id,
                label: item.item_name,
              }))}
            />
          </div>

          {/* PRODUCT NAME */}
          {selectedItem && (
            <div className="p-4 bg-slate-50 border rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-base">
                    {selectedItem.item_name}
                  </div>

                  <div className="text-sm text-slate-500 mt-1">
                    Stock Unit:
                    <span className="font-semibold ml-2 text-blue-600">
                      {baseUnit}
                    </span>
                  </div>
                </div>

                <Button size="small" onClick={() => setEditingUom(true)}>
                  Edit UOM
                </Button>
              </div>
            </div>
          )}

          {selectedItem && editingUom && (
            <Card size="small" className="border-blue-200 bg-blue-50">
              <div className="space-y-3">
                <div className="font-medium">Change Product Stock Unit</div>

                <Select
                  value={baseUnit}
                  options={UOM_OPTIONS}
                  onChange={setBaseUnit}
                  className="w-full"
                />

                <div className="flex gap-2">
                  <Button
                    type="primary"
                    onClick={async () => {
                      try {
                        const oldUom = selectedItem.uom;

                        const { error: itemError } = await supabase
                          .from("item_master")
                          .update({
                            uom: baseUnit,
                          })
                          .eq("id", selectedItem.id);

                        if (itemError) throw itemError;

                        const { error: conversionError } = await supabase
                          .from("item_unit_conversions")
                          .update({
                            to_unit: baseUnit,
                          })
                          .eq("item_id", selectedItem.id)
                          .eq("to_unit", oldUom);

                        if (conversionError) throw conversionError;

                        setItems((prev) =>
                          prev.map((item) =>
                            item.id === selectedItem.id
                              ? { ...item, uom: baseUnit }
                              : item,
                          ),
                        );

                        setSelectedItem((prev) => ({
                          ...prev,
                          uom: baseUnit,
                        }));

                        setEditingUom(false);

                        await fetchConversions(selectedItem.id);

                        message.success("UOM updated successfully");
                      } catch (error) {
                        console.error(error);
                        message.error("Failed to update UOM");
                      }
                    }}
                  >
                    Save UOM
                  </Button>

                  <Button
                    onClick={() => {
                      setBaseUnit(selectedItem.uom || "PCS");
                      setEditingUom(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* CONVERSIONS */}
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="font-semibold">Unit Conversions</div>

                <Button type="dashed" onClick={addRow}>
                  + Add Conversion
                </Button>
              </div>

              {conversions.length === 0 && (
                <div className="text-slate-400 text-sm">
                  No conversions added
                </div>
              )}

              {conversions.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-4 gap-3 items-center"
                >
                  <Select
                    placeholder="Unit"
                    value={row.unit}
                    options={UOM_OPTIONS.filter((u) => u.value !== baseUnit)}
                    onChange={(value) => updateRow(index, "unit", value)}
                  />

                  <InputNumber
                    min={1}
                    className="w-full"
                    value={row.factor}
                    onChange={(value) => updateRow(index, "factor", value || 1)}
                  />

                  <div className="text-sm font-medium text-blue-600">
                    → {baseUnit}
                  </div>

                  <Button danger onClick={() => removeRow(index)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* PREVIEW */}
          {selectedItem && (
            <Card size="small" className="bg-blue-50">
              <div className="font-semibold mb-3">Conversion Preview</div>

              <div className="mb-2 text-green-700 font-semibold">
                Base Unit : {baseUnit}
              </div>

              {conversions.length === 0 ? (
                <div className="text-slate-500">No conversions defined</div>
              ) : (
                conversions.map((row, idx) => (
                  <div key={idx}>
                    1 {row.unit || "?"}
                    {" = "}
                    {row.factor} {baseUnit}
                  </div>
                ))
              )}
            </Card>
          )}

          {/* SAVE */}
          {selectedItem && (
            <Button type="primary" loading={saving} onClick={handleSave}>
              Save Conversions
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
