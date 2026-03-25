"use client";

import { Modal, Input, Button, Card, Avatar, Tag } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";

export default function TeamLoginModal({
  open,
  onLogin,
  onClose, // ✅ NEW
  loading,
  teamName, // ✅ NEW
}) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!password) return;
    onLogin(password);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose} // ✅ close handler
      footer={null}
      closable={true} // ✅ show X button
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

        {/* ✅ TEAM NAME DISPLAY */}
        {teamName && (
          <Tag color="blue" style={{ marginBottom: 10 }}>
            {teamName}
          </Tag>
        )}

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
