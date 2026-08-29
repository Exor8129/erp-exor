"use client";

import React, { useState } from "react";
import { Drawer, Select, Input, DatePicker, InputNumber, Button, Divider, Checkbox, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import AddTransporterModal from "./addTransporterModal";
import { updatePOStatus } from "@/app/lib/services/poStatusUpdate";

const { TextArea } = Input;

export default function ShipmentDrawer({
  shipmentDrawerOpen,
  setShipmentDrawerOpen,
  selectedLogisticsPO,
  shipmentForm,
  setShipmentForm,
  transporters = [],
  saveShipment,
  onTransporterAdded, // Optional callback to refresh transporters list in parent state
}) {
  const [addTransporterModalOpen, setAddTransporterModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleTransporterCreated = (newTransporter) => {
    // 1. Trigger parent fetch/update logic if passed
    if (onTransporterAdded) {
      onTransporterAdded(newTransporter);
    }

    // 2. Automatically select the newly created transporter in the form
    setShipmentForm((prev) => ({
      ...prev,
      transporter_id: newTransporter.id,
    }));
    
    // Clear error for transporter if set
    setErrors((prev) => ({ ...prev, transporter_id: null }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!shipmentForm.transporter_id) {
      newErrors.transporter_id = "Please select a transporter";
    }

    if (!shipmentForm.lr_number?.trim()) {
      newErrors.lr_number = "LR Number is required";
    }

    if (!shipmentForm.no_box_count_mentioned && (!shipmentForm.no_of_boxes || shipmentForm.no_of_boxes <= 0)) {
      newErrors.no_of_boxes = "Please enter number of boxes or check the box count option";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 const handleSave = async () => {
    if (submitting) return; // Guard against rapid clicks

    if (!validateForm()) {
      message.error("Please fill in all mandatory fields");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Save shipment record
      await saveShipment();

      // 2. Resolve target target PO ID (from prop or selected object)
      const targetPoId =selectedLogisticsPO?.id;

      if (targetPoId) {
        const { success, error } = await updatePOStatus(targetPoId, "in_transit");

        if (success) {
          message.success("Shipment saved & PO status updated to In Transit");
        } else {
          message.error(error?.message || "Shipment saved, but failed to update PO status");
        }
      } else {
        message.success("Shipment saved successfully");
      }

      // Close drawer on success
      setShipmentDrawerOpen(false);

    } catch (err) {
      console.error("Save shipment error:", err);
      message.error("Failed to save shipment details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Drawer
        title={
          <div>
            <div className="text-lg font-semibold">🚚 Add Shipment</div>

            {selectedLogisticsPO && (
              <div className="text-xs text-slate-500 mt-1">
                PO: {selectedLogisticsPO.po_number}
              </div>
            )}
          </div>
        }
        placement="right"
        size={520}
        open={shipmentDrawerOpen}
        onClose={() => setShipmentDrawerOpen(false)}
        getContainer={false}
        rootStyle={{ position: "absolute" }}
        mask={false}
      >
        {selectedLogisticsPO && (
          <div className="mb-5 p-4 rounded-xl bg-sky-50 border border-sky-100">
            <div className="text-xs text-slate-500 uppercase tracking-wider">
              Purchase Order
            </div>

            <div className="font-bold text-lg text-slate-800 mt-1">
              {selectedLogisticsPO.po_number}
            </div>

            <div className="text-sm text-slate-600 mt-1">
              {selectedLogisticsPO.vendor_name}
            </div>

            <div className="text-xs text-slate-500 mt-2">
              Date:{" "}
              {new Date(selectedLogisticsPO.created_at).toLocaleDateString(
                "en-IN"
              )}
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Transporter *
            </label>

            <Select
              placeholder="Select transporter"
              className="w-full"
              status={errors.transporter_id ? "error" : ""}
              value={shipmentForm.transporter_id}
              onChange={(value) => {
                setShipmentForm({
                  ...shipmentForm,
                  transporter_id: value,
                });
                if (errors.transporter_id) {
                  setErrors((prev) => ({ ...prev, transporter_id: null }));
                }
              }}
              popupRender={(menu) => (
                <>
                  <div
                    className="px-3 py-2 text-sky-600 hover:bg-slate-50 cursor-pointer font-medium flex items-center gap-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setAddTransporterModalOpen(true);
                    }}
                  >
                    <PlusOutlined /> Add New Transporter
                  </div>
                  <Divider style={{ margin: "4px 0" }} />
                  {menu}
                </>
              )}
            >
              {transporters.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  {t.transporter_name}
                </Select.Option>
              ))}
            </Select>
            {errors.transporter_id && (
              <p className="text-red-500 text-xs mt-1">{errors.transporter_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">LR Number *</label>

            <Input
              placeholder="Enter LR Number"
              status={errors.lr_number ? "error" : ""}
              value={shipmentForm.lr_number}
              onChange={(e) => {
                setShipmentForm({
                  ...shipmentForm,
                  lr_number: e.target.value,
                });
                if (errors.lr_number) {
                  setErrors((prev) => ({ ...prev, lr_number: null }));
                }
              }}
            />
            {errors.lr_number && (
              <p className="text-red-500 text-xs mt-1">{errors.lr_number}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Dispatch Date
            </label>

            <DatePicker
              className="w-full"
              value={shipmentForm.dispatch_date}
              onChange={(date) =>
                setShipmentForm({
                  ...shipmentForm,
                  dispatch_date: date,
                })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Expected Delivery
            </label>

            <DatePicker
              className="w-full"
              value={shipmentForm.expected_delivery_date}
              onChange={(date) =>
                setShipmentForm({
                  ...shipmentForm,
                  expected_delivery_date: date,
                })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Freight Amount
            </label>

            <InputNumber
              className="w-full"
              min={0}
              value={shipmentForm.freight_amount}
              onChange={(value) =>
                setShipmentForm({
                  ...shipmentForm,
                  freight_amount: value,
                })
              }
            />
          </div>

          {/* Number of Boxes with Bypass Checkbox */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Boxes {!shipmentForm.no_box_count_mentioned && "*"}
            </label>

            <InputNumber
              className="w-full"
              min={1}
              precision={0}
              status={errors.no_of_boxes ? "error" : ""}
              placeholder={
                shipmentForm.no_box_count_mentioned
                  ? "Not mentioned in LR"
                  : "Enter total boxes"
              }
              disabled={shipmentForm.no_box_count_mentioned}
              value={shipmentForm.no_of_boxes}
              onChange={(value) => {
                setShipmentForm({
                  ...shipmentForm,
                  no_of_boxes: value,
                });
                if (errors.no_of_boxes) {
                  setErrors((prev) => ({ ...prev, no_of_boxes: null }));
                }
              }}
            />

            <div className="mt-2">
              <Checkbox
                checked={shipmentForm.no_box_count_mentioned || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setShipmentForm({
                    ...shipmentForm,
                    no_box_count_mentioned: checked,
                    no_of_boxes: checked ? null : shipmentForm.no_of_boxes,
                  });
                  if (errors.no_of_boxes) {
                    setErrors((prev) => ({ ...prev, no_of_boxes: null }));
                  }
                }}
              >
                <span className="text-xs text-slate-600">
                  No box number mentioned in the LR details
                </span>
              </Checkbox>
            </div>
            {errors.no_of_boxes && (
              <p className="text-red-500 text-xs mt-1">{errors.no_of_boxes}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Shipment Status
            </label>

            <Select
              className="w-full"
              value={shipmentForm.shipment_status}
              onChange={(value) =>
                setShipmentForm({
                  ...shipmentForm,
                  shipment_status: value,
                })
              }
            >
              <Select.Option value="Pending Dispatch">
                Pending Dispatch
              </Select.Option>
              <Select.Option value="Dispatched">Dispatched</Select.Option>
              <Select.Option value="In Transit">In Transit</Select.Option>
              <Select.Option value="Delivered">Delivered</Select.Option>
              <Select.Option value="Cancelled">Cancelled</Select.Option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Remarks</label>

            <TextArea
              rows={4}
              placeholder="Remarks"
              value={shipmentForm.remarks}
              onChange={(e) =>
                setShipmentForm({
                  ...shipmentForm,
                  remarks: e.target.value,
                })
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              disabled={submitting}
              onClick={() => setShipmentDrawerOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="primary"
              loading={submitting}
              disabled={submitting}
              onClick={handleSave}
            >
              Save Shipment
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Add Transporter Modal Integration */}
      <AddTransporterModal
        open={addTransporterModalOpen}
        onClose={() => setAddTransporterModalOpen(false)}
        onSuccess={handleTransporterCreated}
        existingTransporters={transporters}
      />
    </>
  );
}