"use client";

import { useEffect, useState } from "react";
import {
  Modal,
  Select,
  Form,
  Input,
  message,
  Divider,
  Segmented,
} from "antd";
import { supabase } from "../../lib/supabase";

export default function TeamModal({ open, onClose }) {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState("create"); // create | edit
  const [selectedTeam, setSelectedTeam] = useState(null);

  const isEdit = mode === "edit";

  // 🔹 Fetch Users
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, department");

    if (error) message.error("Failed to load users");
    else setUsers(data || []);
  };

  // 🔹 Fetch Teams
  const fetchTeams = async () => {
    const { data, error } = await supabase.from("teams").select("*");

    if (error) message.error("Failed to load teams");
    else setTeams(data || []);
  };

  // 🔹 Load data when modal opens
  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchTeams();
      form.resetFields();
      setSelectedTeam(null);
      setMode("create");
    }
  }, [open]);

  // 🔹 Populate form when team selected
  useEffect(() => {
    if (!selectedTeam || users.length === 0) return;

    const leaderUser = users.find(
      (u) => u.name === selectedTeam.team_leader
    );

    form.setFieldsValue({
      leader: leaderUser?.id,
      assistants: (selectedTeam.assistants || []).map((a) => a.id),
      username: selectedTeam.username,
      password: "", // 🔥 don't show old password
      status: selectedTeam.status,
    });
  }, [selectedTeam, users, form]);

  // 🔹 Save
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (isEdit) {
        if (!selectedTeam) {
          message.error("Select a team to edit");
          return;
        }

        const updateData = {
          status: values.status,
        };

        if (values.password) {
          updateData.password = values.password;
        }

        const { error } = await supabase
          .from("teams")
          .update(updateData)
          .eq("id", selectedTeam.id);

        if (error) throw error;

        message.success("Team updated successfully");
      } else {
        const {
          leader,
          assistants = [],
          username,
          password,
          status,
        } = values;

        if (assistants.includes(leader)) {
          message.error("Leader cannot be assistant");
          return;
        }

        if (password.length < 4) {
          message.error("Password must be at least 4 characters");
          return;
        }

        // Check duplicate username
        const { data: existing } = await supabase
          .from("teams")
          .select("id")
          .eq("username", username)
          .maybeSingle();

        if (existing) {
          message.error("Username already exists");
          return;
        }

        const leaderUser = users.find((u) => u.id === leader);
        const assistantUsers = users.filter((u) =>
          assistants.includes(u.id)
        );

        const payload = {
          team_leader: leaderUser?.name,
          assistants: assistantUsers.map((a) => ({
            id: a.id,
            name: a.name,
          })),
          username,
          password,
          status,
        };

        const { error } = await supabase
          .from("teams")
          .insert([payload]);

        if (error) throw error;

        message.success("Team created successfully");
      }

      form.resetFields();
      setSelectedTeam(null);
      onClose();
    } catch (err) {
      console.error(err);
      message.error("Error saving");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Team Management"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={loading}
      destroyOnHidden
    >
      {/* 🔘 Mode Toggle */}
      <Segmented
        block
        options={[
          { label: "Create New", value: "create" },
          { label: "Edit Existing", value: "edit" },
        ]}
        value={mode}
        onChange={(val) => {
          setMode(val);
          form.resetFields();
          setSelectedTeam(null);
        }}
        style={{ marginBottom: 16 }}
      />

      {/* 🔽 Team Selector (Edit Mode Only) */}
      {isEdit && (
        <Select
          placeholder="Select Team"
          style={{ width: "100%", marginBottom: 16 }}
          options={teams.map((t) => ({
            label: `${t.team_leader} (${t.username})`,
            value: t.id,
          }))}
          onChange={(id) => {
            const team = teams.find((t) => t.id === id);
            setSelectedTeam(team);
          }}
        />
      )}

      <Form layout="vertical" form={form}>
        {/* Leader */}
        <Form.Item name="leader" label="Team Leader">
          <Select
            disabled={isEdit}
            options={users.map((u) => ({
              label: `${u.name} (${u.department})`,
              value: u.id,
            }))}
          />
        </Form.Item>

        {/* Assistants */}
        <Form.Item name="assistants" label="Assistants">
          <Select
            mode="multiple"
            disabled={isEdit}
            options={users.map((u) => ({
              label: `${u.name} (${u.department})`,
              value: u.id,
            }))}
          />
        </Form.Item>

        <Divider />

        {/* Username */}
        <Form.Item name="username" label="Username">
          <Input disabled={isEdit} />
        </Form.Item>

        {/* Password */}
        <Form.Item name="password" label="Password">
          <Input.Password placeholder="Enter new password (optional)" />
        </Form.Item>

        {/* Status */}
        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true }]}
        >
          <Select>
            <Select.Option value="ACTIVE">ACTIVE</Select.Option>
            <Select.Option value="INACTIVE">INACTIVE</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}