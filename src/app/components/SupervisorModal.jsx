"use client";

import { Modal, Input, Button, Tag } from "antd";
import { useState, useEffect } from "react";
import dayjs from "dayjs";

export default function SupervisorModal({
  open,
  onConfirm,
  onCancel,
  loading,
  team,
}) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) setPassword("");
  }, [open]);

  return (
    <Modal open={open} footer={null} onCancel={onCancel} centered>
      <h3 style={{ marginBottom: 10 }}>Active Session Found</h3>

      <p style={{ color: "#666", marginBottom: 15 }}>
        Supervisor approval required to close previous session.
      </p>

      {/* 🔥 SESSION DETAILS */}
      {team?.sessionInfo && (
        <div
          style={{
            background: "#fafafa",
            padding: 12,
            borderRadius: 8,
            marginBottom: 15,
            border: "1px solid #f0f0f0",
          }}
        >
          <div><strong>Team:</strong> {team.username}</div>
          <div><strong>Leader:</strong> {team.team_leader}</div>

          <div>
            <strong>Session ID:</strong>{" "}
            <Tag color="blue">{team.sessionInfo.team_id}</Tag>
          </div>

          <div>
            <strong>Started At:</strong>{" "}
            {dayjs(team.sessionInfo.sessions_start).format(
              "DD MMM YYYY, hh:mm A"
            )}
          </div>
        </div>
      )}

      <Input.Password
        placeholder="Enter Supervisor Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: 15 }}
        onPressEnter={() => onConfirm(password)}
      />

      <Button
        type="primary"
        block
        loading={loading}
        onClick={() => onConfirm(password)}
      >
        Authorize & Continue
      </Button>
    </Modal>
  );
}