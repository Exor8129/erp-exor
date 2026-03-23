"use client";

import { useEffect, useState } from "react";
import {
Card,
Table,
Button,
Input,
Select,
Form,
Row,
Col,
message,
Popconfirm, Modal,
} from "antd";
import { supabase } from "../../lib/supabase";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

export default function UsersPage() {
const [form] = Form.useForm();
const [users, setUsers] = useState([]);
const [editingUser, setEditingUser] = useState(null);
const [loading, setLoading] = useState(false);
const [roles, setRoles] = useState([]);
const [departments, setDepartments] = useState([]);
const [confirmCode, setConfirmCode] = useState("");
const [enteredCode, setEnteredCode] = useState("");
const [actionType, setActionType] = useState(null); // "edit" | "delete"
const [selectedRecord, setSelectedRecord] = useState(null);
const CONFIRM_CODE = "1234";

// =========================
// FETCH USERS
// =========================
const fetchUsers = async () => {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .order("id", { ascending: false });

        console.log("FETCH DATA:", data);
        console.log("FETCH ERROR:", error);

        if (error) throw error;

        const usersData = data || [];

        // ✅ Set users FIRST
        setUsers(usersData);

        // ✅ Extract roles safely
        const uniqueRoles = [
            ...new Set(
                usersData
                    .map((u) => u.role)
                    .filter((r) => typeof r === "string" && r.trim() !== "")
            ),
        ];


        const uniqueDepartments = [
            ...new Set(
                usersData
                    .map((u) => u.department)
                    .filter((d) => typeof d === "string" && d.trim() !== "")
            ),
        ];

        setDepartments(uniqueDepartments);

        console.log("ROLES:", uniqueRoles);

        setRoles(uniqueRoles);
    } catch (err) {
        console.error(err);
        message.error("Error fetching users");
    }
};



useEffect(() => {
    fetchUsers();
}, []);

// =========================
// ADD / UPDATE USER
// =========================
const handleSubmit = async (values) => {
    setLoading(true);

    try {
        if (editingUser) {
            // UPDATE
            const { error } = await supabase
                .from("users")
                .update(values)
                .eq("id", editingUser.id);

            if (error) throw error;

            message.success("User updated");
        } else {
            // INSERT
            const { error } = await supabase.from("users").insert([values]);

            if (error) throw error;

            message.success("User added");
        }

        form.resetFields();
        setEditingUser(null);
        fetchUsers();
    } catch (err) {
        message.error("Error saving user");
    } finally {
        setLoading(false);
    }
};

// =========================
// EDIT USER
// =========================
const handleEdit = (record) => {
    setEditingUser(record);

    form.setFieldsValue({
        ...record,
        role: record.role ? record.role : [],
        department: record.department ? record.department : [],
    });
};

// =========================
// DELETE USER
// =========================
const handleDelete = async (id) => {
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
        message.error("Delete failed");
    } else {
        message.success("User deleted");
        fetchUsers();
    }
};

// =========================
// TABLE COLUMNS
// =========================
const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Department", dataIndex: "department" },
    { title: "Role", dataIndex: "role" },
    { title: "Username", dataIndex: "username" },
    {
        title: "Action",
        render: (_, record) => (
            <>
                <Button
                    icon={<EditOutlined />}
                    type="link"
                    onClick={() => {
                        setActionType("edit");
                        setSelectedRecord(record);
                        message.info("Enter 4-digit code to edit");
                    }}
                />

                <Button
                    icon={<DeleteOutlined />}
                    danger
                    type="link"
                    onClick={() => {
                        setActionType("delete");
                        setSelectedRecord(record);
                        message.info("Enter 4-digit code to delete");
                    }}
                />
            </>
        ),
    }
];

return (
    <div style={{ padding: 20 }}>
        <Card title="User Management" style={{ marginBottom: 20 }}>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                    </Col>

                    <Col span={6}>
                        <Form.Item
                            name="department"
                            label="Department"
                            rules={[{ required: true }]}
                            getValueFromEvent={(value) => value?.[value.length - 1]}
                        >
                            <Select
                                mode="tags"
                                placeholder="Type or select department"
                                options={departments.map((d) => ({
                                    label: d,
                                    value: d,
                                }))}
                                notFoundContent="Type to add new department"
                            />
                        </Form.Item>
                    </Col>

                    <Col span={6}>
                        <Form.Item
                            name="role"
                            label="Role"
                            rules={[{ required: true }]}
                            getValueFromEvent={(value) => value?.[value.length - 1]} // ✅ store only last value as string
                        >
                            <Select
                                mode="tags"
                                placeholder="Type or select role"
                                options={roles.map((r) => ({
                                    label: r,
                                    value: r,
                                }))}
                                notFoundContent="Type to add new role"
                            />
                        </Form.Item>
                    </Col>

                    <Col span={6}>
                        <Form.Item name="username" label="Username">
                            <Input />
                        </Form.Item>
                    </Col>

                    <Col span={6}>
                        <Form.Item name="password" label="Password">
                            <Input.Password />
                        </Form.Item>
                    </Col>
                </Row>

                <Button type="primary" htmlType="submit" loading={loading}>
                    {editingUser ? "Update User" : "Add User"}
                </Button>

                {editingUser && (
                    <Button
                        style={{ marginLeft: 10 }}
                        onClick={() => {
                            form.resetFields();
                            setEditingUser(null);
                        }}
                    >
                        Cancel
                    </Button>
                )}
            </Form>
        </Card>

        <Card title="Users List">
            <Table
                dataSource={users}
                columns={columns}
                rowKey="id"
                pagination={false}
            />
        </Card>

        <Modal
            title="Enter Confirmation Code"
            open={!!actionType}
            onCancel={() => {
                setActionType(null);
                setEnteredCode("");
                setSelectedRecord(null);
            }}
            onOk={() => {
                if (enteredCode !== CONFIRM_CODE) {
                    message.error("Invalid code");
                    return;
                }

                if (actionType === "edit") {
                    handleEdit(selectedRecord);
                }

                if (actionType === "delete") {
                    handleDelete(selectedRecord.id);
                }

                // reset
                setActionType(null);
                setEnteredCode("");
                setSelectedRecord(null);
            }}
            okText="Confirm"
        >
            <Input
                placeholder="Enter 4 digit code"
                value={enteredCode}
                maxLength={4}
                onChange={(e) => setEnteredCode(e.target.value)}
            />
        </Modal>
    </div>
);}