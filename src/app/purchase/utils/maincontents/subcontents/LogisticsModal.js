"use client";

import React, { useState } from "react";
import { Card, Modal, Timeline } from "antd";
import ShipmentDrawer from "./ShipmentDrawer";
import { supabase } from "../../../../lib/supabase";

export default function LogisticsModal({
  logisticsModalOpen,
  setLogisticsModalOpen,
  selectedLogisticsPO,
  shipments,
  setShipmentDrawerOpen,
  handleTrackShipment,
  shipmentDrawerOpen,
  shipmentForm,
  setShipmentForm,
  transporters,
  saveShipment,
}) {
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);

  const loadTimeline = async (shipment) => {
    setSelectedShipment(shipment);

    const { data } = await supabase
      .schema("purchase")
      .from("shipment_tracking_events")
      .select("*")
      .eq("shipment_id", shipment.id)
      .order("event_time", { ascending: false });

    setTrackingEvents(data || []);
  };

  const getTimeline = (shipment) => {
    const currentStatus = shipment?.shipment_status;

    const statuses = [
      "Shipment Created",
      "LR Generated",
      "Dispatched",
      "In Transit",
      "Reached Destination",
      "Out For Delivery",
      "Delivered",
    ];

    const currentIndex = statuses.findIndex((s) => s === currentStatus);

    return statuses.map((title, index) => ({
      key: title,
      title,
      completed: index < currentIndex,
      current: index === currentIndex,
      date:
        index <= currentIndex ? new Date().toLocaleDateString("en-IN") : null,
    }));
  };

  const timeline = selectedShipment ? getTimeline(selectedShipment) : [];
  return (
    <Modal
      open={logisticsModalOpen}
      onCancel={() => setLogisticsModalOpen(false)}
      footer={null}
      width="95%"
      centered={false}
      title={null}
      styles={{
        body: {
          height: "90vh",
          overflowY: "auto",
          padding: 24,
        },
      }}
      style={{
        top: 20,
      }}
    >
      <div className="relative">
        {selectedLogisticsPO && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Logistics Management
                </p>

                <h2 className="text-2xl font-bold text-slate-800">
                  {selectedLogisticsPO.po_number}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {selectedLogisticsPO.vendor_name}
                </p>
              </div>

              <button
                onClick={() => setShipmentDrawerOpen(true)}
                className="
                px-4 py-2 rounded-xl
                bg-sky-600 text-white
                text-sm font-medium
                hover:bg-sky-700 transition
              "
              >
                + Add Shipment
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500">Total Shipments</p>
                <h3 className="text-2xl font-bold mt-2">{shipments.length}</h3>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-600">In Transit</p>
                <h3 className="text-2xl font-bold text-blue-700 mt-2">
                  {
                    shipments.filter((s) => s.shipment_status === "In Transit")
                      .length
                  }
                </h3>
              </div>

              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-green-600">Delivered</p>
                <h3 className="text-2xl font-bold text-green-700 mt-2">
                  {
                    shipments.filter((s) => s.shipment_status === "Delivered")
                      .length
                  }
                </h3>
              </div>

              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs text-purple-600">Pending</p>
                <h3 className="text-2xl font-bold text-purple-700 mt-2">
                  {
                    shipments.filter(
                      (s) => s.shipment_status === "Pending Dispatch",
                    ).length
                  }
                </h3>
              </div>
            </div>

            {/* Shipment Table */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-slate-100 grid grid-cols-6 px-5 py-3 text-xs font-semibold uppercase text-slate-600">
                <div>Transporter</div>
                <div>LR Number</div>
                <div>Dispatch Date</div>
                <div>Status</div>
                <div>Remarks</div>
                <div>Action</div>
              </div>

              {shipments.length > 0 ? (
                shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    onClick={() => loadTimeline(shipment)}
                    className="grid grid-cols-6 px-5 py-4 border-t text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="font-medium text-slate-700">
                      {shipment.transporter}
                    </div>

                    <div>{shipment.lr_number || "-"}</div>

                    <div>
                      {shipment.dispatch_date
                        ? new Date(shipment.dispatch_date).toLocaleDateString(
                            "en-IN",
                          )
                        : "-"}
                    </div>

                    <div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium
                      ${
                        shipment.shipment_status === "Delivered"
                          ? "bg-green-100 text-green-700"
                          : shipment.shipment_status === "In Transit"
                            ? "bg-blue-100 text-blue-700"
                            : shipment.shipment_status === "Dispatched"
                              ? "bg-purple-100 text-purple-700"
                              : shipment.shipment_status === "Cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                      }`}
                      >
                        {shipment.shipment_status}
                      </span>
                    </div>

                    <div className="truncate">{shipment.remarks || "-"}</div>

                    <div className="flex gap-2">
                      {shipment.tracking_url ? (
                        <button
                          onClick={() => handleTrackShipment(shipment)}
                          className="
                          px-3 py-1
                          bg-sky-50
                          text-sky-700
                          rounded-full
                          text-xs
                          font-medium
                          hover:bg-sky-100
                        "
                        >
                          🔗 Track & Copy LR
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">No Link</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-400">
                  No shipments added yet
                </div>
              )}
            </div>
          </div>
        )}
        {selectedShipment && (
          <div className="mt-8">
          
          <Card className="mt-4 pt-6 ">
            {/* Shipment Info */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div>
                <p className="text-xs text-gray-500">LR Number</p>
                <p className="font-semibold">
                  {selectedShipment.lr_number || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Transporter</p>
                <p className="font-semibold">
                  {selectedShipment.transporter || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Expected Delivery</p>
                <p className="font-semibold">
                  {selectedShipment.expected_delivery_date
                    ? new Date(
                        selectedShipment.expected_delivery_date,
                      ).toLocaleDateString("en-IN")
                    : "-"}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="overflow-x-auto pb-4">
              <div className="flex items-start justify-between min-w-225 relative">
                {timeline.map((step, index) => (
                  <div
                    key={step.key}
                    className="flex flex-col items-center flex-1 relative"
                  >
                    {/* Connector */}
                    {index !== timeline.length - 1 && (
                      <div
                        className={`absolute top-5 left-1/2 w-full h-1 z-0
                  ${
                    step.completed
                      ? "bg-green-500"
                      : step.current
                        ? "bg-blue-500"
                        : "bg-gray-300"
                  }
                `}
                      />
                    )}

                    {/* Circle */}
                    <div
                      className={`
                z-10 w-10 h-10 rounded-full border-2
                flex items-center justify-center bg-white font-semibold
                ${
                  step.completed
                    ? "border-green-500 text-green-500"
                    : step.current
                      ? "border-blue-500 text-blue-500"
                      : "border-gray-300 text-gray-400"
                }
              `}
                    >
                      {step.completed ? "✓" : index + 1}
                    </div>

                    {/* Content */}
                    <div className="mt-3 text-center px-2">
                      <p
                        className={`text-sm font-medium
                  ${
                    step.completed
                      ? "text-green-700"
                      : step.current
                        ? "text-blue-700"
                        : "text-gray-500"
                  }
                `}
                      >
                        {step.title}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {step.date || "Pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          </div>
        )}
        
      </div>

      <ShipmentDrawer
        shipmentDrawerOpen={shipmentDrawerOpen}
        setShipmentDrawerOpen={setShipmentDrawerOpen}
        selectedLogisticsPO={selectedLogisticsPO}
        shipmentForm={shipmentForm}
        setShipmentForm={setShipmentForm}
        transporters={transporters}
        saveShipment={saveShipment}
      />
    </Modal>
  );
}
