"use client";

import React from "react";
import { Drawer, Select, Input, DatePicker, InputNumber, Button } from "antd";

const { TextArea } = Input;

export default function ShipmentDrawer({
  shipmentDrawerOpen,
  setShipmentDrawerOpen,
  selectedLogisticsPO,
  shipmentForm,
  setShipmentForm,
  transporters,
  saveShipment,
}) {
  return (
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
              "en-IN",
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
            value={shipmentForm.transporter_id}
            onChange={(value) =>
              setShipmentForm({
                ...shipmentForm,
                transporter_id: value,
              })
            }
          >
            {transporters.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.transporter_name}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">LR Number *</label>

          <Input
            placeholder="Enter LR Number"
            value={shipmentForm.lr_number}
            onChange={(e) =>
              setShipmentForm({
                ...shipmentForm,
                lr_number: e.target.value,
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Dispatch Date
          </label>

          <DatePicker
            className="w-full"
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
          <Button onClick={() => setShipmentDrawerOpen(false)}>Cancel</Button>

          <Button type="primary" onClick={saveShipment}>
            Save Shipment
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
