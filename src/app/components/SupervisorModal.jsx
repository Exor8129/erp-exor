"use client";

import { Modal, Input, Button } from "antd";
import { useState, useEffect } from "react";

export default function SupervisorModal({
  open,
  onConfirm,
  onCancel,
  loading,
}) {
  const [password, setPassword] = useState("");

  // Reset password when opened
  useEffect(() => {
    if (open) setPassword("");
  }, [open]);

  const handleSubmit = () => {
    onConfirm(password);
  };

  return (
    <Modal
      open={open}
      footer={null}
      onCancel={onCancel}
      centered
    >
      <h3 style={{ marginBottom: 10 }}>Active Session Found</h3>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Supervisor approval required to close previous session.
      </p>

      <Input.Password
        placeholder="Enter Supervisor Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: 15 }}
        onPressEnter={handleSubmit}
      />

      <Button
        type="primary"
        block
        loading={loading}
        onClick={handleSubmit}
      >
        Authorize & Continue
      </Button>
    </Modal>
  );
}