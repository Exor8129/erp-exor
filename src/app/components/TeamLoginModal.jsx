"use client";

import { Modal, Input, Button, Card, Avatar } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";

export default function TeamLoginModal({ open, onLogin, loading }) {
  const [password, setPassword] = useState("");

  // Reset password when modal opens
  useEffect(() => {
    if (open) {
      setPassword("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!password) return; // optional safety
    onLogin(password); // ✅ FIXED (only password)
  };

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      centered
      width={400}
    >
      <Card style={{ textAlign: "center", borderRadius: 12 }}>
        <Avatar
          size={70}
          icon={<TeamOutlined />}
          style={{ backgroundColor: "#1677ff", marginBottom: 15 }}
        />

        <h2 style={{ marginBottom: 5 }}>Team Login</h2>
        <p style={{ color: "#888", marginBottom: 20 }}>
          Enter password to continue
        </p>

        <Input.Password
          size="large"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: 20 }}
          onPressEnter={handleSubmit}
        />

        <Button
          type="primary"
          size="large"
          block
          loading={loading}
          onClick={handleSubmit}
        >
          Start
        </Button>
      </Card>
    </Modal>
  );
}