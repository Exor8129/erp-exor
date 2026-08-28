"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

import {
  Modal,
  Input,
  Select,
  Button,
  Form,
  Card,
  Typography,
  Divider,
  message,
  Popconfirm,
  Table,
  Checkbox,
} from "antd";

import {
  PlusOutlined,
  ShopOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";

import MapCanvas from "../components/create-warehouse/MapCanvas";

const { Option } = Select;

export default function WarehouseDesigner() {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();

  const [selectedType, setSelectedType] = useState("rack");
  const [elements, setElements] = useState([]);

  // Tracks database primary key of selected row
  const [editingElementId, setEditingElementId] = useState(null);

  const [elementData, setElementData] = useState({
    id: "",
    x: 100,
    y: 100,
    status: "vacant",
    orientation: "vertical",
    rotation: 0,
    textX: 0,
    color: "#CDE6FE",
  });

  const [tiers, setTiers] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);

  const [binManagerOpen, setBinManagerOpen] = useState(false);
  const [binStatus, setBinStatus] = useState({});
  const [binRows, setBinRows] = useState([]);

  // LOAD WAREHOUSES
  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    const { data, error } = await supabase
      .schema("wms")
      .from("warehouses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      message.error(error.message);
      return;
    }
    setWarehouses(data);
  };

  const loadTiers = async (warehouseId) => {
    const { data } = await supabase
      .schema("wms")
      .from("warehouse_tiers")
      .select("*")
      .eq("warehouse_id", warehouseId);
    setTiers(data);
  };

  const getNextWarehouseCode = async () => {
    const { data, error } = await supabase
      .schema("wms")
      .from("warehouses")
      .select("code")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return "WH01";
    }
    const lastNumber = parseInt(data.code.replace("WH", ""));
    const nextNumber = lastNumber + 1;
    return `WH${String(nextNumber).padStart(2, "0")}`;
  };

  // CREATE WAREHOUSE
  const createWarehouse = async (values) => {
    const { data: warehouse, error } = await supabase
      .schema("wms")
      .from("warehouses")
      .insert({
        name: values.name,
        code: values.code,
        location: values.location,
        length: values.length,
        width: values.width,
        height: values.height,
      })
      .select()
      .single();

    if (error) {
      message.error(error.message);
      return;
    }

    const tierRows = [];
    for (let i = 1; i <= values.tiers; i++) {
      tierRows.push({
        warehouse_id: warehouse.id,
        tier_number: i,
        name: `Tier ${i}`,
      });
    }

    const { error: tierError } = await supabase
      .schema("wms")
      .from("warehouse_tiers")
      .insert(tierRows);

    if (tierError) {
      message.error(tierError.message);
      return;
    }

    setSelectedWarehouse(warehouse);
    setWarehouses((prev) => [warehouse, ...prev]);
    await loadTiers(warehouse.id);

    const { data: tierData } = await supabase
      .schema("wms")
      .from("warehouse_tiers")
      .select("*")
      .eq("warehouse_id", warehouse.id)
      .order("tier_number");

    if (tierData?.length) {
      setTiers(tierData);
      setSelectedTier(tierData[0]);
    }

    setCreateModal(false);
    form.resetFields();
    message.success("Warehouse created");
  };

  // HANDLER FOR REALTIME LOCAL CHANGES
  const handleFieldChange = (fieldName, value) => {
    // 1. First update the form field state
    const updatedData = { ...elementData, [fieldName]: value };
    setElementData(updatedData);

    // 2. If in Edit Mode, push changes to local elements layout instantly so canvas shifts in realtime
    if (editingElementId) {
      setElements((prevElements) =>
        prevElements.map((el) => {
          if (el.id !== editingElementId) return el;

          // Compute dimension rules if type changed dynamically
          const currentType = fieldName === "type" ? value : el.type;
          let width = el.width;
          let height = el.height;
          if (fieldName === "type") {
            if (value === "rack") {
              width = 40;
              height = 100;
            } else if (value === "s-rack") {
              width = 30;
              height = 65;
            } else if (value === "fsa") {
              width = 50;
              height = 55;
            } else {
              width = 40;
              height = 40;
            }
          }

          return {
            ...el,
            type: currentType,
            width,
            height,
            x: fieldName === "x" ? Number(value) || 0 : el.x,
            y: fieldName === "y" ? Number(value) || 0 : el.y,
            metadata: {
              ...el.metadata,
              custom_label_id:
                fieldName === "id" ? value : el.metadata?.custom_label_id,
              status: fieldName === "status" ? value : el.metadata?.status,
              orientation:
                fieldName === "orientation" ? value : el.metadata?.orientation,
              color: fieldName === "color" ? value : el.metadata?.color,
              rotation:
                fieldName === "rotation"
                  ? Number(value) || 0
                  : el.metadata?.rotation,
              textX:
                fieldName === "textX" ? Number(value) || 0 : el.metadata?.textX,
            },
          };
        }),
      );
    }
  };

  // ADD NEW ELEMENT
  const addElement = async () => {
    if (!selectedWarehouse || !selectedTier) {
      message.warning("Select warehouse and tier");
      return;
    }

    let customLabel = elementData.id?.trim();

    if (
      !customLabel ||
      customLabel.startsWith("OBJ-") ||
      customLabel.startsWith("R") ||
      customLabel.startsWith("SR") ||
      customLabel.startsWith("FSA")
    ) {
      let prefix = "R";
      if (selectedType === "s-rack") prefix = "SR";
      if (selectedType === "fsa") prefix = "FSA";
      if (selectedType === "entry") prefix = "Entry";
      if (selectedType === "object") prefix = "OBJ";

      const existingWarehouseElements = elements.filter(
        (el) =>
          el.warehouse_id === selectedWarehouse.id && el.type === selectedType,
      );

      let maxNum = 0;
      existingWarehouseElements.forEach((el) => {
        const labelStr = el.metadata?.custom_label_id || "";
        if (labelStr.startsWith(prefix)) {
          const numPart = parseInt(labelStr.replace(prefix, ""), 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });

      customLabel = `${prefix}${maxNum + 1}`;
    }

    const basePayload = {
      warehouse_id: selectedWarehouse.id,
      tier_id: selectedTier.id,
      type: selectedType,
      x: Number(elementData.x) || 0,
      y: Number(elementData.y) || 0,
    };

    if (selectedType === "rack") {
      basePayload.width = 40;
      basePayload.height = 100;
    } else if (selectedType === "s-rack") {
      basePayload.width = 30;
      basePayload.height = 65;
    } else if (selectedType === "fsa") {
      basePayload.width = 50;
      basePayload.height = 55;
    } else {
      basePayload.width = 40;
      basePayload.height = 40;
    }

    basePayload.metadata = {
      custom_label_id: customLabel,
      status: ["rack", "s-rack", "fsa", "object"].includes(selectedType)
        ? elementData.status
        : "vacant",
      orientation: ["rack", "s-rack", "fsa", "object"].includes(selectedType)
        ? elementData.orientation
        : "vertical",
      color: selectedType === "object" ? elementData.color : null,
      rotation: selectedType === "entry" ? Number(elementData.rotation) : 0,
      textX: selectedType === "entry" ? Number(elementData.textX) : 0,
    };

    const { data, error } = await supabase
      .schema("wms")
      .from("warehouse_elements")
      .insert(basePayload)
      .select()
      .single();

    if (error) {
      console.error(error);
      message.error(`Database rejection: ${error.message}`);
      return;
    }

    setElements((prev) => [...prev, data]);
    clearFormState();
    message.success(`Layout element ${customLabel} added successfully!`);
  };

  // UPDATE / SAVE LOGIC (FINISH EDITING)
  const finishEditingElement = async () => {
    if (!editingElementId) return;

    // Grab the local real-time configuration state we've modified
    const locallyModifiedElement = elements.find(
      (el) => el.id === editingElementId,
    );
    if (!locallyModifiedElement) return;

    const { data, error } = await supabase
      .schema("wms")
      .from("warehouse_elements")
      .update({
        type: locallyModifiedElement.type,
        x: locallyModifiedElement.x,
        y: locallyModifiedElement.y,
        width: locallyModifiedElement.width,
        height: locallyModifiedElement.height,
        metadata: locallyModifiedElement.metadata,
      })
      .eq("id", editingElementId)
      .select()
      .single();

    if (error) {
      message.error(`Failed to save adjustments: ${error.message}`);
      return;
    }

    clearFormState();
    message.success("Layout adjustments saved securely!");
  };

  // DELETE ELEMENT
  const deleteElement = async () => {
    if (!editingElementId) return;

    const { error } = await supabase
      .schema("wms")
      .from("warehouse_elements")
      .delete()
      .eq("id", editingElementId);

    if (error) {
      message.error(`Failed to delete element: ${error.message}`);
      return;
    }

    setElements((prev) => prev.filter((el) => el.id !== editingElementId));
    clearFormState();
    message.success("Layout element removed.");
  };

  const loadElements = async (tierId) => {
    const { data } = await supabase
      .schema("wms")
      .from("warehouse_elements")
      .select("*")
      .eq("tier_id", tierId);
    setElements(data);
  };

  // CANVAS OBJECT SELECTION ROUTER
  const handleElementSelect = (item) => {

    if (!item) {
      clearFormState();
      return;
    }

    const targetLabel = typeof item === "object" ? item.id : item;

    const foundElement = elements.find(
      (el) =>
        el.metadata?.custom_label_id === targetLabel || el.id === targetLabel,
    );

    if (!foundElement) {
      message.error("Could not synchronize element with database");
      return;
    }

    setEditingElementId(foundElement.id);
    setSelectedType(foundElement.type);

    setElementData({
      id: foundElement.metadata?.custom_label_id || foundElement.id,
      x: foundElement.x,
      y: foundElement.y,
      status: foundElement.metadata?.status || "vacant",
      orientation: foundElement.metadata?.orientation || "vertical",
      rotation: foundElement.metadata?.rotation || 0,
      textX: foundElement.metadata?.textX || 0,
      color: foundElement.metadata?.color || "#CDE6FE",
    });
  };

  // CANCEL / DESELECT WORKFLOW
  const handleCancelEditing = async () => {
    if (!editingElementId) return;

    // Rollback canvas to server authoritative state on discard
    if (selectedTier) {
      await loadElements(selectedTier.id);
    }
    clearFormState();
  };

  const clearFormState = () => {
    setEditingElementId(null);
    setElementData({
      id: "",
      x: 100,
      y: 100,
      status: "vacant",
      orientation: "vertical",
      rotation: 0,
      textX: 0,
      color: "#CDE6FE",
    });
  };
  const loadStorageLocations = () => {
    const rows = elements
      .filter((el) => ["rack", "s-rack", "fsa"].includes(el.type))
      .map((el) => {

  let defaultLevels = 1;
  let defaultBins = 1;

  if (el.type === "rack") {
    defaultLevels = 3;
    defaultBins = 3;
  }

  if (el.type === "s-rack") {
    defaultLevels = 4;
    defaultBins = 3;
  }


  return {
    key: el.id,
    id: el.id,
    label: el.metadata?.custom_label_id,
    type: el.type,

    levels: defaultLevels,
    binsPerLevel: defaultBins,

    selected: false,

    // NEW
    binsCreated: !!binStatus[el.id],
  };

});

    setBinRows(rows);
  };

  const updateRow = (id, field, value) => {
    setBinRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const generateAndSaveBins = async () => {
    const selected = binRows.filter((r) => r.selected);

    if (!selected.length) {
      message.warning("Select at least one location");
      return;
    }

    let barcode = 1;
    const allBins = [];

    selected.forEach((row) => {
      let runningBin = 1;

      for (let level = 1; level <= row.levels; level++) {
        for (let i = 1; i <= row.binsPerLevel; i++) {
          const address =
            `${selectedWarehouse.code}` +
            `-T${String(selectedTier.tier_number).padStart(2, "0")}` +
            `-${row.label}` +
            `-L${level}` +
            `-B${runningBin}`;

          allBins.push({
            warehouse_id: selectedWarehouse.id,
            tier_id: selectedTier.id,
            element_id: row.id,
            level_no: level,
            bin_no: runningBin,
            address,
            barcode: `BIN${String(barcode).padStart(8, "0")}`,
            barcode_value: address,
            status: "empty",
          });

          barcode++;
          runningBin++;
        }
      }
    });

    const { error } = await supabase
      .schema("wms")
      .from("location_bins")
      .insert(allBins);

    if (error) {
      message.error(error.message);
      return;
    }

    message.success(`${allBins.length} bins created`);

    setBinManagerOpen(false);
  };

  const canGenerateBins = () => {
  const selected = binRows.filter((r) => r.selected);

  // Nothing selected
  if (selected.length === 0) {
    return false;
  }

  // If every selected location already has bins, disable button
  const allAlreadyCreated = selected.every(
    (row) => row.binsCreated
  );

  return !allAlreadyCreated;
};

  const checkTierBins = async (tierId) => {
    const { data, error } = await supabase
      .schema("wms")
      .from("location_bins")
      .select("element_id")
      .eq("tier_id", tierId);

    if (error) {
      message.error(error.message);
      return;
    }

    const status = {};

    data.forEach((bin) => {
      status[bin.element_id] = true;
    });

    setBinStatus(status);
  };

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* TOP HEADER SECTION */}
      <div className="h-17.5 bg-white border-b px-6 flex items-center justify-between shrink-0">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <ShopOutlined />
            &nbsp; Warehouse Designer
          </Typography.Title>
        </div>

        <div className="flex items-center gap-3">
          <Select
            className="w-64"
            placeholder="Select Warehouse"
            value={selectedWarehouse?.id}
            onChange={(id) => {
              const wh = warehouses.find((x) => x.id === id);
              setSelectedWarehouse(wh);
              loadTiers(wh.id);
              setSelectedTier(null);
              setElements([]);
              clearFormState();
            }}
          >
            {warehouses.map((wh) => (
              <Option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </Option>
            ))}
          </Select>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={async () => {
              const nextCode = await getNextWarehouseCode();
              form.setFieldsValue({ code: nextCode });
              setCreateModal(true);
            }}
          >
            Create Warehouse
          </Button>

          <Button
            type="primary"
            onClick={() => {
              loadStorageLocations();
              setBinManagerOpen(true);
            }}
          >
            Bin Manager
          </Button>
        </div>
      </div>

      {/* MAIN DESIGN AREA */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR PANEL */}
        <div className="w-70 shrink-0 border-r bg-white p-4 flex flex-col gap-4 overflow-y-auto">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Current Workspace
            </div>
            <div className="flex gap-2">
              <Select
                className="flex-1"
                placeholder="Select Tier"
                value={selectedTier?.id}
                onChange={async (id) => {
                  const tier = tiers.find((t) => t.id === id);
                  setSelectedTier(tier);
                  await loadElements(tier.id);
                  await checkTierBins(tier.id);
                  clearFormState();
                }}
              >
                {tiers.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.name}
                  </Option>
                ))}
              </Select>
              <Button>+ Tier</Button>
            </div>
          </div>

          <Divider className="my-1" />

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {editingElementId ? "🛠️ Edit Mode Enabled" : "Add Layout Element"}
            </div>

            <label className="block text-xs text-gray-600 mb-1">
              Element Type
            </label>
            <Select
              className="w-full mb-3"
              value={selectedType}
              onChange={(val) => {
                setSelectedType(val);
                handleFieldChange("type", val);
              }}
            >
              <Option value="rack">Standard Rack (rack)</Option>
              <Option value="s-rack">Small Rack (s-rack)</Option>
              <Option value="fsa">Floor Stack Area (fsa)</Option>
              <Option value="entry">Dock Entry / Exit (entry)</Option>
              <Option value="object">Custom Object / Lift (object)</Option>
            </Select>

            <label className="block text-xs text-gray-600 mb-1">
              Element ID / Label
            </label>
            <Input
              className="mb-3"
              placeholder="e.g., R4"
              value={elementData.id}
              onChange={(e) => handleFieldChange("id", e.target.value)}
            />

            {/* POSITION FIELDS */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  X Coordinate
                </label>
                <Input
                  type="number"
                  placeholder="X"
                  value={elementData.x}
                  onChange={(e) => handleFieldChange("x", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Y Coordinate
                </label>
                <Input
                  type="number"
                  placeholder="Y"
                  value={elementData.y}
                  onChange={(e) => handleFieldChange("y", e.target.value)}
                />
              </div>
            </div>

            {/* DYNAMIC FIELD TRACK 1: STANDARD STRUCTURAL OPTIONS */}
            {["rack", "s-rack", "fsa", "object"].includes(selectedType) && (
              <>
                <label className="block text-xs text-gray-600 mb-1">
                  Operational Status
                </label>
                <Select
                  className="w-full mb-3"
                  value={elementData.status}
                  onChange={(val) => handleFieldChange("status", val)}
                >
                  <Option value="vacant">Vacant</Option>
                  <Option value="full">Full</Option>
                  <Option value="maintenance">Maintenance</Option>
                </Select>

                <label className="block text-xs text-gray-600 mb-1">
                  Orientation Flow
                </label>
                <Select
                  className="w-full mb-3"
                  value={elementData.orientation}
                  onChange={(val) => handleFieldChange("orientation", val)}
                >
                  <Option value="vertical">Vertical</Option>
                  <Option value="horizontal">Horizontal</Option>
                </Select>
              </>
            )}

            {/* DYNAMIC FIELD TRACK 2: CUSTOM COLOR FOR OBJECTS */}
            {selectedType === "object" && (
              <div className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">
                  Display Color
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    className="w-12 h-8 p-0 border-none cursor-pointer"
                    value={elementData.color}
                    onChange={(e) => handleFieldChange("color", e.target.value)}
                  />
                  <Input
                    type="text"
                    placeholder="#CDE6FE"
                    value={elementData.color}
                    onChange={(e) => handleFieldChange("color", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* DYNAMIC FIELD TRACK 3: ENTRY / EXIT CONFIGURATIONS */}
            {selectedType === "entry" && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Rotation (°)
                  </label>
                  <Select
                    className="w-full"
                    value={elementData.rotation}
                    onChange={(val) => handleFieldChange("rotation", val)}
                  >
                    <Option value={0}>0° (North)</Option>
                    <Option value={90}>90° (East)</Option>
                    <Option value={180}>180° (South)</Option>
                    <Option value={270}>270° (West)</Option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Label X Offset
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. -22"
                    value={elementData.textX}
                    onChange={(e) => handleFieldChange("textX", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ACTION FOOTER MENU */}
            {editingElementId ? (
              <div className="flex flex-col gap-2 mt-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  block
                  style={{ backgroundColor: "#22c55e", borderColor: "#22c55e" }}
                  onClick={finishEditingElement}
                >
                  Finish Editing
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Popconfirm
                    title="Delete layout element?"
                    description="This removes it permanently."
                    onConfirm={deleteElement}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      block
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                  <Button
                    icon={<CloseOutlined />}
                    block
                    onClick={handleCancelEditing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="primary"
                block
                onClick={addElement}
                className="mt-2"
              >
                Add Layout Element
              </Button>
            )}
          </div>
        </div>

        {/* RIGHT CANVAS VISUALIZER */}
        <div className="flex-1 bg-gray-200 relative overflow-hidden">
          <MapCanvas
            warehouse={selectedWarehouse}
            tier={selectedTier}
            elements={elements}
            onElementSelect={handleElementSelect}
          />
        </div>
      </div>

      {/* CREATE WAREHOUSE MODAL */}
      <Modal
        title="Create New Warehouse"
        open={createModal}
        footer={null}
        centered
        onCancel={() => setCreateModal(false)}
        forceRender
      >
        <Form layout="vertical" form={form} onFinish={createWarehouse}>
          <Form.Item
            label="Warehouse Name"
            name="name"
            rules={[{ required: true, message: "Enter warehouse name" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Warehouse Code" name="code">
            <Input readOnly />
          </Form.Item>
          <Form.Item label="Location" name="location">
            <Input />
          </Form.Item>
          <Form.Item label="Warehouse Length (meters)" name="length">
            <Input type="number" />
          </Form.Item>
          <Form.Item label="Warehouse Width (meters)" name="width">
            <Input type="number" />
          </Form.Item>
          <Form.Item label="Warehouse Height (meters)" name="height">
            <Input type="number" />
          </Form.Item>
          <Form.Item label="Number of Tiers" name="tiers" initialValue={1}>
            <Input type="number" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Create Warehouse
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Bin Manager"
        open={binManagerOpen}
        width={900}
        footer={null}
        onCancel={() => setBinManagerOpen(false)}
      >
        <Table
          rowKey="id"
          pagination={false}
          dataSource={binRows}
          columns={[
            {
              title: (
                <Checkbox
                  checked={
                    binRows.length > 0 && binRows.every((row) => row.selected)
                  }
                  indeterminate={
                    binRows.some((row) => row.selected) &&
                    !binRows.every((row) => row.selected)
                  }
                  onChange={(e) => {
                    const checked = e.target.checked;

                    setBinRows((prev) =>
                      prev.map((row) => ({
                        ...row,
                        selected: checked,
                      })),
                    );
                  }}
                />
              ),
              render: (_, row) => (
                <Checkbox
  disabled={row.binsCreated}
  checked={row.selected}
  onChange={(e)=>
    updateRow(
      row.id,
      "selected",
      e.target.checked
    )
  }
/>
              ),
            },
            {
              title: "Location",
              dataIndex: "label",
            },
            {
              title: "Type",
              dataIndex: "type",
            },
            {
              title: "Levels",
              render: (_, row) => (
                <Input
                  type="number"
                  min={1}
                  value={row.levels}
                  onChange={(e) =>
                    updateRow(row.id, "levels", Number(e.target.value))
                  }
                />
              ),
            },
            {
              title: "Bins / Level",
              render: (_, row) => (
                <Input
                  type="number"
                  min={1}
                  value={row.binsPerLevel}
                  onChange={(e) =>
                    updateRow(row.id, "binsPerLevel", Number(e.target.value))
                  }
                />
              ),
            },
            {
  title: "Bin Status",
  render: (_, row) =>
    row.binsCreated ? (
      <span className="text-green-600 font-semibold">
        ✓ Created
      </span>
    ) : (
      <span className="text-gray-400">
        Not Created
      </span>
    ),
},
          ]}
        />

        <div className="mt-4 flex justify-end">
          <Button
  type="primary"
  disabled={!canGenerateBins()}
  onClick={generateAndSaveBins}
>
            Generate & Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
