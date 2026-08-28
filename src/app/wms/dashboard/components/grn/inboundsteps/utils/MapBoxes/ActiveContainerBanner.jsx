import React from "react";
import { Card, Button } from "antd";
import { InboxOutlined, SaveOutlined, CloseCircleOutlined } from "@ant-design/icons";

export default function ActiveContainerBanner({
  activeContainer,
  saving,
  onSave,
  onDeselect,
}) {
  return (
    <Card
      size="small"
      className={`border ${
        activeContainer
          ? "bg-emerald-50/50 border-emerald-300"
          : "bg-slate-50 border-slate-300"
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <InboxOutlined
            className={`text-2xl ${activeContainer ? "text-emerald-600" : "text-slate-400"}`}
          />
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block">
              Active Container
            </span>
            <span className="font-bold text-base text-slate-800">
              {activeContainer
                ? activeContainer.barcode
                : "Scan Container Barcode to start mapping ...."}
            </span>
          </div>
        </div>

        {/* {activeContainer && (
          <div className="flex items-center gap-2">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={onSave}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Save Container Items
            </Button>
            <Button icon={<CloseCircleOutlined />} onClick={onDeselect}>
              Deselect
            </Button>
          </div>
        )} */}
      </div>
    </Card>
  );
}