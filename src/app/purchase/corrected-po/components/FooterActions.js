"use client";

import { Button } from "antd";

export default function FooterActions({
  onSaveDraft,
  onFinalize,
  onBack,
}) {
  return (
    <div className="flex justify-end gap-3">
      <Button onClick={onBack}>
        Back
      </Button>

      <Button onClick={onSaveDraft}>
        Save Draft
      </Button>

      <Button
        type="primary"
        onClick={onFinalize}
      >
        Finalize Correction
      </Button>
    </div>
  );
}