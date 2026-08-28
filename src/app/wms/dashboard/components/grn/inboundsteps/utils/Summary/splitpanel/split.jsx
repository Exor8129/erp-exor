import React, { useState, useEffect } from "react";
import {
  Form,
  Row,
  Col,
  Radio,
  Select,
  InputNumber,
  Input,
  Button,
  Tag,
  Card,
  Alert,
  Tooltip,
  Upload,
} from "antd";
import {
  WarningOutlined,
  PaperClipOutlined,
  InboxOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  NumberOutlined,
  ScissorOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import BarcodeLabelModal from "../../../../../../../../components/BarcodeLabelModal";
import ContainerSplittingExecutionPreview from "./containerSplittingExcecutionPreview";

export const DISCREPANCY_CATEGORIES = {
  QUANTITY: {
    label: "Quantity Discrepancy",
    reasons: [
      { value: "SHORTAGE", label: "Shortage" },
      { value: "EXCESS", label: "Excess" },
    ],
  },
  PRODUCT: {
    label: "Product Mismatch",
    reasons: [
      { value: "NON_ORDERED_ITEM", label: "Non-Ordered Item" },
      { value: "WRONG_ITEM", label: "Wrong Item" },
      { value: "SUBSTITUTION", label: "Substitution" },
      { value: "WRONG_VARIANT", label: "Wrong Variant" },
      { value: "WRONG_BRAND", label: "Wrong Brand" },
    ],
  },
  CONDITION: {
    label: "Condition / Damage",
    reasons: [
      { value: "PRODUCT_DAMAGED", label: "Product Damaged" },
      { value: "PACKAGING_DAMAGED", label: "Packaging Damaged" },
      { value: "SEAL_BROKEN", label: "Seal Broken" },
      {
        value: "STERILE_PACKAGING_COMPROMISED",
        label: "Sterile Packaging Compromised",
      },
      { value: "MISSING_COMPONENT", label: "Missing Component" },
      { value: "WET_MOISTURE_DAMAGE", label: "Wet / Moisture Damage" },
    ],
  },
  QUALITY: {
    label: "Quality & Compliance",
    reasons: [
      { value: "SPECIFICATION_MISMATCH", label: "Specification Mismatch" },
      { value: "FAILED_INSPECTION", label: "Failed Inspection" },
      { value: "EXPIRED", label: "Expired" },
      { value: "NEAR_EXPIRY", label: "Near Expiry" },
      { value: "BATCH_LOT_ISSUE", label: "Batch / Lot Issue" },
      { value: "STERILITY_ISSUE", label: "Sterility Issue" },
      { value: "QUALITY_REJECTION", label: "Quality Rejection" },
    ],
  },
  DOCUMENTATION: {
    label: "Documentation Issue",
    reasons: [
      { value: "MISSING_INVOICE", label: "Missing Invoice" },
      { value: "WRONG_INVOICE", label: "Wrong Invoice" },
      { value: "MISSING_DELIVERY_CHALLAN", label: "Missing Delivery Challan" },
      { value: "QTY_DOCUMENT_MISMATCH", label: "Qty Document Mismatch" },
      { value: "MISSING_COA", label: "Missing COA (Certificate of Analysis)" },
      { value: "MISSING_BATCH_EXPIRY", label: "Missing Batch / Expiry Info" },
      { value: "OTHER_DOCUMENT", label: "Other Document Issue" },
    ],
  },
};

const generateDiscrepancyRef = async (supabase) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}${month}${day}`;

  const prefix = `DISC-${todayStr}-`;

  try {
    if (!supabase) {
      console.warn(
        "Supabase client missing, falling back to initial reference.",
      );
      return `${prefix}001`;
    }

    const { data, error } = await supabase
      .schema("purchase")
      .from("inbound_discrepancies")
      .select("discrepancy_ref")
      .like("discrepancy_ref", `${prefix}%`)
      .order("discrepancy_ref", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching max discrepancy reference:", error);
      return `${prefix}001`;
    }

    let nextSequence = 1;

    if (data && data.length > 0 && data[0]?.discrepancy_ref) {
      const lastRef = data[0].discrepancy_ref;
      const seqPart = lastRef.replace(prefix, "").split("-")[0];
      const parsedSeq = parseInt(seqPart, 10);

      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }

    const formattedSeq = String(nextSequence).padStart(3, "0");
    return `${prefix}${formattedSeq}`;
  } catch (err) {
    console.error("Failed to generate reference number:", err);
    return `${prefix}001`;
  }
};

const SplitDrawer = ({
  open,
  onClose,
  onSuccess,
  itemID,
  grnId,
  supabase,
  containers = [],
  activeItem = {},
  setActiveItem = () => {},
  setActionType = () => {},
  suggestSeverity = () => "LOW",
  suggestDisposition = () => "QUARANTINE",
}) => {
  const [discrepancyForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [referenceNo, setReferenceNo] = useState("");
  const [loadingRef, setLoadingRef] = useState(false);
  const [splitState, setSplitState] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [openSplitModal, setOpenSplitModal] = useState(false);
  const [selectedContainerID,setSelectedContainerID]=useState(null);
  const[selectedItemID,setSelectedItemID]=useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRef = async () => {
      if (open) {
        setLoadingRef(true);
        discrepancyForm.resetFields();
        setSplitState({});

        const newRef = await generateDiscrepancyRef(supabase);

        if (isMounted) {
          setReferenceNo(newRef);
          setLoadingRef(false);
        }
      } else {
        setReferenceNo("");
      }
    };

    fetchRef();

    return () => {
      isMounted = false;
    };
  }, [open, supabase, discrepancyForm]);

  const selectedCategory = Form.useWatch("category", discrepancyForm);
  const selectedReason = Form.useWatch("reason_code", discrepancyForm);

  const isShortage =
    selectedCategory === "QUANTITY" && selectedReason === "SHORTAGE";
  const isExcess =
    selectedCategory === "QUANTITY" && selectedReason === "EXCESS";

  const handleCategoryChange = (cat) => {
    const defaultReason = DISCREPANCY_CATEGORIES[cat]?.reasons[0]?.value;
    discrepancyForm.setFieldsValue({
      reason_code: defaultReason,
      severity: suggestSeverity(defaultReason),
      disposition: suggestDisposition(cat, defaultReason),
      allocations: [{ container_id: undefined, discrepancy_qty: undefined }],
    });
    setSplitState({});
  };

  const handleReasonChange = (reason) => {
    discrepancyForm.setFieldsValue({
      severity: suggestSeverity(reason),
      disposition: suggestDisposition(selectedCategory, reason),
    });
  };

  const handleCancel = () => {
    if (typeof setActiveItem === "function") setActiveItem(null);
    if (typeof setActionType === "function") setActionType(null);
    discrepancyForm.resetFields();
    setSplitState({});
    if (typeof onClose === "function") onClose();
  };

  // Updated split handler to pass the current referenceNo
  const handlePerformSplit = async (
    allocationIndex,
    matchedContainer,
    issueQty,
  ) => {
    const intactQty = (matchedContainer.accepted_qty || 0) - issueQty;
    const originalBarcode =
      matchedContainer.containers?.barcode ||
      `BOX-${String(matchedContainer.container_id || matchedContainer.id).slice(0, 8)}`;

    // Reuses barcode if 'referenceNo' exists in notes, otherwise generates a new one
    const issueBarcode = await getOrCreateDisputedBarcode(referenceNo);

    setSplitState((prev) => ({
      ...prev,
      [allocationIndex]: {
        isSplitDone: true,
        originalBarcode,
        intactQty,
        issueBarcode,
        issueQty,
      },
    }));
  };

  const handleCreateDiscrepancy = async () => {
    try {
      const values = await discrepancyForm.validateFields();
      setSubmitting(true);

      const containerWisePayloads = (values.allocations || []).map(
        (alloc, index) => {
          const splitInfo = splitState[index];
          return {
            discrepancy_ref: referenceNo,
            grn_id: grnId,
            item_id: activeItem?.item_id || null,
            item_name: activeItem?.item_name || null,
            discrepancy_type: values.category,
            reason_code: values.reason_code,
            container_id: alloc.container_id || null,
            discrepancy_qty: Number(alloc.discrepancy_qty || 0),
            is_split_container: Boolean(splitInfo?.isSplitDone),
            intact_box_barcode: splitInfo?.originalBarcode || null,
            intact_qty: splitInfo?.intactQty ?? null,
            quarantine_box_barcode: splitInfo?.issueBarcode || null,
            status: "OPEN",
            created_by: "7e18b82d-85db-4216-867a-7eb3c1e0aed7",
            resolved_by: "7e18b82d-85db-4216-867a-7eb3c1e0aed7",
            severity: !isShortage ? values.severity : "LOW",
            disposition: !isShortage ? values.disposition : "QUARANTINE",
            remarks: values.remarks || null,
            created_at: new Date().toISOString(),
          };
        },
      );

      if (typeof onSuccess === "function") {
        await onSuccess(containerWisePayloads);
      }

      handleCancel();
    } catch (error) {
      console.error("Discrepancy Submission Error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    setIsModalVisible(true);
  };

  const getOrCreateDisputedBarcode = async (refNo) => {
    try {
      // 1. Check if a container with the same reference number already exists in notes
      if (refNo) {
        const { data: existingContainers, error: fetchError } = await supabase
          .schema("purchase")
          .from("containers")
          .select("barcode")
          .eq("notes", refNo)
          .limit(1);

        if (fetchError) throw fetchError;

        // If an existing container is found, reuse its barcode
        if (existingContainers && existingContainers.length > 0) {
          return existingContainers[0].barcode;
        }
      }

      // 2. If no existing container exists for this referenceNo, generate a new sequence
      const prefix = "SPT-GRN-1026-";

      const { data, error } = await supabase
        .schema("purchase")
        .from("containers")
        .select("barcode")
        .like("barcode", `${prefix}%`);

      if (error) throw error;

      let maxSequence = 0;

      data?.forEach((item) => {
        if (item.barcode) {
          const seqStr = item.barcode.replace(prefix, "");
          const parsedSeq = parseInt(seqStr, 10);

          if (!isNaN(parsedSeq) && parsedSeq > maxSequence) {
            maxSequence = parsedSeq;
          }
        }
      });

      const nextSequence = maxSequence + 1;
      const formattedSeq = String(nextSequence).padStart(3, "0");

      return `${prefix}${formattedSeq}`;
    } catch (error) {
      console.error("Error retrieving or generating barcode:", error);
      throw error;
    }
  };

  return (
    <div>
      {open === true ? (
        <div className="p-4 border border-amber-200 bg-amber-50/10 rounded-lg space-y-4">
          <div className="flex justify-between items-start border-b border-amber-200 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <WarningOutlined className="text-amber-600 text-base" />
                <span className="font-bold text-slate-800 text-sm">
                  Create Inbound Discrepancy
                </span>
                <Tag
                  color="volcano"
                  className="font-mono text-xs font-semibold"
                >
                  <NumberOutlined className="mr-0.5" />
                  {loadingRef ? "Generating Ref..." : referenceNo}
                </Tag>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Item:{" "}
                <span className="font-semibold text-slate-700">
                  {activeItem?.item_name || "N/A"}
                </span>
                {" — Code: "}
                {activeItem?.item_id || "N/A"}
              </div>
            </div>
            <Button type="text" size="small" onClick={handleCancel}>
              Cancel
            </Button>
          </div>

          <Form
            form={discrepancyForm}
            layout="vertical"
            size="small"
            initialValues={{
              category: "QUANTITY",
              reason_code: "SHORTAGE",
              severity: "LOW",
              disposition: "QUARANTINE",
              allocations: [
                { container_id: undefined, discrepancy_qty: undefined },
              ],
            }}
          >
            {/* STEP 1: CLASSIFICATION */}
            <div className="bg-slate-50 p-3 border border-slate-200 rounded-md space-y-2">
              <div className="text-xs font-bold uppercase text-slate-600">
                Discrepancy Classification
              </div>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="category"
                    label="Category"
                    rules={[{ required: true, message: "Select category" }]}
                  >
                    <Select onChange={handleCategoryChange}>
                      {Object.entries(DISCREPANCY_CATEGORIES).map(
                        ([key, cat]) => (
                          <Select.Option key={key} value={key}>
                            {cat.label}
                          </Select.Option>
                        ),
                      )}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="reason_code"
                    label="Reason Code"
                    rules={[{ required: true, message: "Select reason code" }]}
                  >
                    <Select onChange={handleReasonChange}>
                      {(
                        DISCREPANCY_CATEGORIES[selectedCategory]?.reasons || []
                      ).map((r) => (
                        <Select.Option key={r.value} value={r.value}>
                          {r.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* STEP 2: ALLOCATION & CONTAINER SPLIT */}
            <div className="bg-slate-50/70 p-4 border border-slate-200 rounded-lg space-y-3 mt-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-xs font-semibold tracking-wide uppercase text-slate-700">
                  Quantity & Container Allocation
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {isShortage ? "Final Step" : "Step 2 of 4"}
                </span>
              </div>

              <Form.List
                name="allocations"
                initialValue={[
                  { container_id: undefined, discrepancy_qty: undefined },
                ]}
              >
                {(fields, { add, remove }) => (
                  <div className="space-y-4">
                    {fields.map(({ key, name, ...restField }, index) => {
                      const handleContainerSelect = (selectedId) => {
                        setSelectedContainerID(selectedId);
                        setSelectedItemID(itemID);
                        const matchedContainer = containers.find(
                          (c) => (c.container_id || c.id) === selectedId,
                        );

                        if (matchedContainer?.accepted_qty !== undefined) {
                          discrepancyForm.setFieldValue(
                            ["allocations", name, "discrepancy_qty"],
                            matchedContainer.accepted_qty,
                          );
                        }
                        // Reset split state when container changes
                        setSplitState((prev) => ({ ...prev, [name]: null }));
                      };

                      return (
                        <Form.Item
                          noStyle
                          key={key}
                          shouldUpdate={(prev, curr) =>
                            prev?.allocations?.[name] !==
                            curr?.allocations?.[name]
                          }
                        >
                          {() => {
                            const currentContainerId =
                              discrepancyForm.getFieldValue([
                                "allocations",
                                name,
                                "container_id",
                              ]);
                            const currentQty = Number(
                              discrepancyForm.getFieldValue([
                                "allocations",
                                name,
                                "discrepancy_qty",
                              ]) || 0,
                            );

                            const matchedContainer = containers.find(
                              (c) =>
                                (c.container_id || c.id) === currentContainerId,
                            );
                            const maxAvailableQty =
                              matchedContainer?.accepted_qty;

                            const isPartialDiscrepancy =
                              !isShortage &&
                              maxAvailableQty !== undefined &&
                              currentQty > 0 &&
                              currentQty < maxAvailableQty;

                            const currentSplitInfo = splitState[name];

                            return (
                              <div className="p-3 bg-white border border-slate-200 rounded-md space-y-3">
                                <Row gutter={[12, 12]} className="items-center">
                                  {!isShortage && (
                                    <Col span={11}>
                                      <Form.Item
                                        {...restField}
                                        name={[name, "container_id"]}
                                        label={
                                          index === 0 ? (
                                            <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                                              <InboxOutlined className="text-blue-500" />
                                              Source Container
                                            </span>
                                          ) : null
                                        }
                                        rules={[
                                          {
                                            required: !isShortage,
                                            message: "Select container",
                                          },
                                        ]}
                                        className="mb-0"
                                      >
                                        <Select
                                          placeholder="Select container"
                                          className="w-full"
                                          showSearch
                                          onChange={handleContainerSelect}
                                        >
                                          {containers.map((c) => {
                                            const containerValue =
                                              c.container_id || c.id;
                                            const barcodeLabel =
                                              c.containers?.barcode ||
                                              `ID: ${String(containerValue).slice(0, 8)}`;

                                            return (
                                              <Select.Option
                                                key={c.id || containerValue}
                                                value={containerValue}
                                              >
                                                <span className="font-mono font-medium">
                                                  {barcodeLabel}
                                                </span>
                                                {c.accepted_qty !== undefined
                                                  ? ` -(Available: ${c.accepted_qty})`
                                                  : ""}
                                              </Select.Option>
                                            );
                                          })}
                                        </Select>
                                      </Form.Item>
                                    </Col>
                                  )}

                                  <Col span={isShortage ? 22 : 11}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, "discrepancy_qty"]}
                                      label={
                                        index === 0 ? (
                                          <span className="text-xs font-medium text-slate-700">
                                            {isShortage
                                              ? "Shortage Qty"
                                              : "Discrepancy Qty"}
                                          </span>
                                        ) : null
                                      }
                                      rules={[
                                        {
                                          required: true,
                                          message: "Specify qty",
                                        },
                                        {
                                          validator: (_, value) => {
                                            if (
                                              !isShortage &&
                                              maxAvailableQty !== undefined &&
                                              Number(value) >
                                                Number(maxAvailableQty)
                                            ) {
                                              return Promise.reject(
                                                new Error(
                                                  `Cannot exceed max available (${maxAvailableQty})`,
                                                ),
                                              );
                                            }
                                            return Promise.resolve();
                                          },
                                        },
                                      ]}
                                      className="mb-0"
                                    >
                                      <InputNumber
                                        min={1}
                                        max={
                                          !isShortage
                                            ? maxAvailableQty
                                            : undefined
                                        }
                                        placeholder="0"
                                        precision={0}
                                        controls={true}
                                        className="w-full rounded-md border-slate-300"
                                        onChange={() => {
                                          if (splitState[name]) {
                                            setSplitState((prev) => ({
                                              ...prev,
                                              [name]: null,
                                            }));
                                          }
                                        }}
                                      />
                                    </Form.Item>
                                  </Col>

                                  {!isShortage && (
                                    <Col
                                      span={2}
                                      className="flex items-center gap-1"
                                    >
                                      {fields.length > 1 && (
                                        <Button
                                          type="text"
                                          danger
                                          icon={<MinusCircleOutlined />}
                                          onClick={() => remove(name)}
                                        />
                                      )}
                                      {index === fields.length - 1 && (
                                        <Tooltip title="Add container allocation">
                                          <Button
                                            type="dashed"
                                            icon={<PlusOutlined />}
                                            onClick={() => add()}
                                            className="flex items-center justify-center border-blue-400 text-blue-600"
                                          />
                                        </Tooltip>
                                      )}
                                    </Col>
                                  )}
                                </Row>

                                {/* ACTION BANNER FOR SPLITTING CONTAINERS */}
                                {isPartialDiscrepancy && !currentSplitInfo && (
                                  <Alert
                                    type="warning"
                                    showIcon
                                    className="mt-2 text-xs"
                                    title={
                                      <div className="flex items-center justify-between">
                                        <span>
                                          Discrepancy qty ({currentQty}) is less
                                          than total stock ({maxAvailableQty}).
                                          Split container?
                                        </span>
                                        <Button
                                          size="small"
                                          type="primary"
                                          icon={<ScissorOutlined />}
                                          // onClick={() =>
                                          //   handlePerformSplit(
                                          //     name,
                                          //     matchedContainer,
                                          //     currentQty,
                                          //   )
                                          // }
                                          onClick={() =>
                                            setOpenSplitModal(true)
                                          }
                                        >
                                          Split Container Now
                                        </Button>
                                      </div>
                                    }
                                  />
                                )}

                                {/* SPLIT CONTAINERS PREVIEW UI */}
                                {currentSplitInfo?.isSplitDone && (
                                  <div className="mt-3 bg-slate-50 p-3 border border-slate-200 rounded-md space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                                      <CheckCircleOutlined /> Container
                                      Splitting Execution Preview
                                    </div>
                                    <Row gutter={12}>
                                      {/* Original Intact Container Box */}
                                      <Col span={12}>
                                        <div className="bg-emerald-50/70 border border-emerald-300 p-2.5 rounded-md space-y-1">
                                          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                                            Intact Container (Original Barcode)
                                          </div>
                                          <div className="text-xs font-mono font-bold text-slate-800">
                                            {currentSplitInfo.originalBarcode}
                                          </div>
                                          <div className="text-xs text-emerald-700">
                                            Intact Quantity:{" "}
                                            <span className="font-bold text-sm">
                                              {currentSplitInfo.intactQty}
                                            </span>
                                          </div>
                                        </div>
                                      </Col>

                                      {/* New Discrepancy Quarantine Box */}
                                      <Col span={12}>
                                        <div className="bg-amber-50/70 border border-amber-300 p-2.5 rounded-md space-y-1">
                                          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                                            Disputed Box (New Generated Barcode)
                                          </div>
                                          <div className="text-xs font-mono font-bold text-amber-900">
                                            {currentSplitInfo.issueBarcode}
                                          </div>
                                          <div className="text-xs text-amber-800">
                                            Discrepancy Qty:{" "}
                                            <span className="font-bold text-sm">
                                              {currentSplitInfo.issueQty}
                                            </span>
                                          </div>
                                          <Button onClick={handlePrint}>
                                            Genrate Barcode
                                          </Button>
                                          <BarcodeLabelModal
                                            visible={isModalVisible}
                                            onClose={() => {
                                              setIsModalVisible(false);
                                            }}
                                            grnId={grnId}
                                            labelType={"master-ind"}
                                            singleBarcode={"SPT-GRN-1026-007"}
                                            notes={referenceNo}
                                          />
                                        </div>
                                      </Col>
                                    </Row>
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        </Form.Item>
                      );
                    })}
                  </div>
                )}
              </Form.List>
            </div>

            {/* STEP 3 & 4: RISK & DISPOSITION */}
            {!isShortage && (
              <div className="bg-white p-3 border border-slate-200 rounded-md space-y-2 mt-3">
                <div className="text-xs font-bold uppercase text-slate-600">
                  Risk & Initial Inventory Disposition
                </div>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name="severity"
                      label="Severity Level"
                      rules={[{ required: true }]}
                    >
                      <Radio.Group buttonStyle="solid">
                        <Radio.Button value="LOW">LOW</Radio.Button>
                        <Radio.Button value="MEDIUM">MEDIUM</Radio.Button>
                        <Radio.Button value="HIGH">HIGH</Radio.Button>
                        <Radio.Button value="CRITICAL">CRITICAL</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="disposition"
                      label="Initial Inventory Disposition"
                      rules={[
                        {
                          required: true,
                          message: "Select initial disposition",
                        },
                      ]}
                    >
                      <Select>
                        <Select.Option value="QUARANTINE">
                          QUARANTINE (Hold in Quality Box)
                        </Select.Option>
                        <Select.Option value="RETURN_TO_VENDOR">
                          RETURN TO VENDOR
                        </Select.Option>
                        <Select.Option value="REJECT">REJECT</Select.Option>
                        <Select.Option value="SCRAP">SCRAP</Select.Option>
                        <Select.Option value="ACCEPT_WITH_APPROVAL">
                          ACCEPT WITH APPROVAL
                        </Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            )}

            {/* REMARKS & EVIDENCE */}
            <div className="bg-slate-50 p-3 border border-slate-200 rounded-md space-y-2 mt-3">
              <Form.Item
                name="remarks"
                label="Observation / Receiving Remarks"
                className="mb-2"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Enter observation details..."
                />
              </Form.Item>
            </div>

            {/* SUBMIT BUTTONS */}
            <div className="flex justify-end gap-2 pt-3 mt-3 border-t">
              <Button size="small" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="primary"
                danger
                size="small"
                loading={submitting}
                onClick={handleCreateDiscrepancy}
              >
                Create Discrepancy & Split Containers
              </Button>
            </div>
          </Form>
        </div>
      ) : null}

      <ContainerSplittingExecutionPreview
        open={openSplitModal}
        onClose={() => setOpenSplitModal(false)}
        onConfirm={() => {
          // Perform split logic
          setIsModalVisible(false);
        }}
        containerid={selectedContainerID}
        grnItemId={selectedItemID}
        containers={containers}
      />
    </div>
  );
};

export default SplitDrawer;
