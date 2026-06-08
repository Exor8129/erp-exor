"use client";

import { useState } from "react";
import { Select, Modal, Input, Divider, Button } from "antd";
import { Building2, Plus } from "lucide-react";

export default function PartySelection({
  suppliers,
  loadingSuppliers,
  value,
  onChange,
}) {
  const [tempSupplierModalOpen, setTempSupplierModalOpen] = useState(false);

  const [tempSupplier, setTempSupplier] = useState({
    name: "",
  });

  const selectedSupplier = value;

  const handleAddTemporarySupplier = () => {
    if (!tempSupplier.name.trim()) return;

    const supplier = {
      id: `TEMP-${Date.now()}`,
      name: tempSupplier.name,
      code: "TEMP",
      vendorUnder: "Temporary Supplier",
      temporary: true,
    };

    onChange(supplier);

    setTempSupplier({
      name: "",
    });

    setTempSupplierModalOpen(false);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-2">
        <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-800">
              Supplier Information
            </h2>
          </div>

          {selectedSupplier?.vendorUnder && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold
                ${
                  selectedSupplier.vendorUnder === "Sundry Creditors"
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : selectedSupplier.vendorUnder === "Sundry Debtors"
                      ? "bg-amber-100 text-amber-700 border border-amber-200"
                      : "bg-blue-100 text-blue-700 border border-blue-200"
                }`}
            >
              {selectedSupplier.vendorUnder}
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Supplier
              </label>

              <Select
                showSearch
                labelInValue
                size="large"
                className="w-full"
                placeholder="Search supplier..."
                loading={loadingSuppliers}
                value={
                  selectedSupplier
                    ? {
                        value: selectedSupplier.id,
                        label: selectedSupplier.name,
                      }
                    : undefined
                }
                onChange={(option) => {
                  const supplier = suppliers.find(
                    (s) => String(s.id) === String(option.value)
                  );

                  onChange(supplier);
                }}
                options={suppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.name,
                }))}
                popupRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: 0 }} />
                    <div
                      className="px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center gap-2 text-blue-600"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setTempSupplierModalOpen(true)}
                    >
                      <Plus size={16} />
                      Add Temporary Supplier
                    </div>
                  </>
                )}
              />

              {selectedSupplier?.vendorUnder === "Sundry Debtors" && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm text-amber-800">
                    ⚠ This supplier is under{" "}
                    <span className="font-semibold">Sundry Debtors</span>.
                    Please verify before creating Purchase Order.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Vendor ID
              </label>

              <Input
                size="large"
                value={selectedSupplier?.code || ""}
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="Add Temporary Supplier"
        open={tempSupplierModalOpen}
        footer={null}
        onCancel={() => setTempSupplierModalOpen(false)}
      >
        <div className="space-y-3">
          <Input
            size="large"
            placeholder="Supplier Name"
            value={tempSupplier.name}
            onChange={(e) =>
              setTempSupplier({
                ...tempSupplier,
                name: e.target.value,
              })
            }
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setTempSupplierModalOpen(false)}>
              Cancel
            </Button>

            <Button type="primary" onClick={handleAddTemporarySupplier}>
              Add Supplier
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}