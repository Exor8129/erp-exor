"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  Modal,
  Input,
  Button,
  Avatar,
  Card,
  Row,
  Col,
  Divider,
  message,
  Tabs,
  Typography,
  Table,
} from "antd";
import { UserOutlined, CrownOutlined, TeamOutlined } from "@ant-design/icons";

const ONE_HOUR = 60 * 60 * 1000;
const { Title, Text } = Typography;

export default function YearEndPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showTeamConfirm, setShowTeamConfirm] = useState(false);
  const [team, setTeam] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeSession, setActiveSession] = useState(null);
  const [supervisorPassword, setSupervisorPassword] = useState("");
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  // =========================
  // LOGIN FUNCTION
  // =========================
  const handleLogin = async () => {
    if (!username || !password) {
      message.warning("Enter Username and Password");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .maybeSingle();

    if (error || !data) {
      message.error("Invalid Username or Password");
      setLoading(false);
      return;
    }

    setTeam(data);
    setShowTeamConfirm(true);
    setLoading(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // =========================
  // CONFIRM TEAM (SESSION CHECK)
  // =========================
  const confirmTeam = async () => {
    const { data: session } = await supabase
      .from("counting_sessions")
      .select("*")
      .eq("team_id", team.id)
      .is("sessions_stop", null)
      .maybeSingle();

    if (!session) {
      await createNewSession();
      return;
    }

    const inactiveTime = new Date() - new Date(session.last_activity);

    if (inactiveTime > ONE_HOUR) {
      // Auto expire old session
      await supabase
        .from("counting_sessions")
        .update({ sessions_stop: new Date() })
        .eq("id", session.id);

      await createNewSession();
    } else {
      // Require supervisor override
      setActiveSession(session);
      setShowSupervisorModal(true);
    }
  };

  // =========================
  // CREATE SESSION
  // =========================
  const createNewSession = async () => {
    const { data, error } = await supabase
      .from("counting_sessions")
      .insert({
        team_id: team.id,
        sessions_start: new Date(),
        last_activity: new Date(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        message.error("Active session already exists.");
      } else {
        message.error("Failed to start session.");
      }
      return;
    }

    setSessionId(data.id);
    setIsLoggedIn(true);
    setShowTeamConfirm(false);
  };

  // =========================
  // SUPERVISOR OVERRIDE
  // =========================
  const handleSupervisorOverride = async () => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("role", "supervisor")
      .eq("password", supervisorPassword)
      .maybeSingle();

    if (!data) {
      message.error("Invalid Supervisor Password");
      return;
    }

    await supabase
      .from("counting_sessions")
      .update({ sessions_stop: new Date() })
      .eq("id", activeSession.id);

    setShowSupervisorModal(false);
    await createNewSession();
  };

  // =========================
  // UPDATE ACTIVITY (Heartbeat)
  // =========================
  const updateActivity = async () => {
    if (!sessionId) return;

    await supabase
      .from("counting_sessions")
      .update({ last_activity: new Date() })
      .eq("id", sessionId);
  };

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(
      () => {
        updateActivity();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [sessionId]);

  // =========================
  // LOGOUT (Supervisor Required)
  // =========================
  const resetLogin = async () => {
    if (!sessionId) {
      clearState();
      return;
    }

    let enteredPassword = "";

    Modal.confirm({
      title: "Confirm Logout",
      content: (
        <Input.Password
          placeholder="Enter Team Password"
          onChange={(e) => (enteredPassword = e.target.value)}
        />
      ),
      okText: "Confirm Logout",
      cancelText: "Cancel",
      centered: true,
      onOk: async () => {
        // Verify team password
        const { data, error } = await supabase
          .from("teams")
          .select("id")
          .eq("id", team.id)
          .eq("password", enteredPassword)
          .maybeSingle();

        if (error || !data) {
          message.error("Invalid Password");
          return Promise.reject();
        }

        // Update session stop time
        const { error: updateError } = await supabase
          .from("counting_sessions")
          .update({
            sessions_stop: new Date(),
          })
          .eq("id", sessionId);

        if (updateError) {
          message.error("Failed to close session");
          return Promise.reject();
        }

        message.success("Session Closed Successfully");
        clearState();
      },
    });
  };

  const clearState = () => {
    setSessionId(null);
    setTeam(null);
    setUsername("");
    setPassword("");
    setShowTeamConfirm(false);
    setIsLoggedIn(false);
    setSupervisorPassword("");
  };

  const columns = [
    {
      title: "Product Name",
      dataIndex: "product_name",
      key: "product_name",
    },
  ];


const filteredProducts = products.filter((product) => {
  if (activeTab === "all") return true;
  if (activeTab === "pending") return product.status === "pending";
  if (activeTab === "completed") return product.status === "completed";
  return true;
});
  return (
    <>
      {/* YOUR ENTIRE UI BELOW REMAINS 100% UNCHANGED */}
      {/* I am not modifying any of your UI structure */}

      {/* LOGIN MODAL */}
      {mounted && (
        <Modal
          open={!isLoggedIn && !showTeamConfirm}
          footer={null}
          closable={false}
          centered
          width={420}
          getContainer={false}
        >
          <Card
            variant={false}
            style={{ borderRadius: 12, textAlign: "center" }}
          >
            <Avatar
              size={70}
              icon={<TeamOutlined />}
              style={{ backgroundColor: "#1677ff", marginBottom: 15 }}
            />
            <h2 style={{ marginBottom: 5 }}>Year-End Cycle Count</h2>
            <p style={{ color: "#888", marginBottom: 25 }}>
              Team Login Required
            </p>

            <Input
              size="large"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ marginBottom: 15 }}
            />

            <Input.Password
              size="large"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ marginBottom: 20 }}
            />

            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleLogin}
              style={{ height: 45 }}
            >
              Login
            </Button>
          </Card>
        </Modal>
      )}

      {/* TEAM CONFIRM MODAL (unchanged UI) */}
      <Modal
        open={showTeamConfirm}
        closable={false}
        footer={null}
        centered
        width={500}
      >
        {/* Same UI content as yours — unchanged */}
        <Card variant={false} style={{ textAlign: "center" }}>
          <h2 style={{ marginBottom: 5 }}>Confirm Your Team</h2>
          <p style={{ color: "#888" }}>Please verify before starting count</p>
          <Divider />
          <div style={{ marginBottom: 25 }}>
            <Avatar
              size={80}
              icon={<CrownOutlined />}
              style={{ backgroundColor: "#1677ff" }}
            />
            <h3 style={{ marginTop: 10 }}>{team?.team_leader}</h3>
            <span style={{ color: "#999" }}>Team Leader</span>
          </div>
          <Divider />
          <div>
            <h4 style={{ marginBottom: 15 }}>
              <TeamOutlined /> Assistants
            </h4>
            <Row gutter={[16, 16]} justify="center">
              {Array.isArray(team?.assistants) &&
                team.assistants.map((assistant, index) => (
                  <Col key={index}>
                    <div style={{ textAlign: "center" }}>
                      <Avatar
                        size={60}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: "#52c41a" }}
                      />
                      <div style={{ marginTop: 8 }}>{assistant}</div>
                    </div>
                  </Col>
                ))}
            </Row>
          </div>
          <Divider />
          <Row gutter={10}>
            <Col span={12}>
              <Button type="primary" block size="large" onClick={confirmTeam}>
                Confirm
              </Button>
            </Col>
            <Col span={12}>
              <Button danger block size="large" onClick={resetLogin}>
                Wrong Team
              </Button>
            </Col>
          </Row>
        </Card>
      </Modal>

      {/* SUPERVISOR MODAL (logic only added) */}
      <Modal open={showSupervisorModal} footer={null} centered>
        <h3>Active Session Found</h3>
        <p>Supervisor approval required to close previous session.</p>

        <Input.Password
          placeholder="Supervisor Password"
          value={supervisorPassword}
          onChange={(e) => setSupervisorPassword(e.target.value)}
          style={{ marginBottom: 15 }}
        />

        <Button type="primary" block onClick={handleSupervisorOverride}>
          Authorize & Close
        </Button>
      </Modal>

      {/* DASHBOARD (unchanged UI) */}
      {isLoggedIn && (
        <div style={{ padding: 20 }}>
          <Card
            title="Year-End Cycle Count Dashboard"
            extra={
              <Button danger onClick={resetLogin}>
                Logout
              </Button>
            }
          >
            <p>
              <b>Team Leader:</b> {team.team_leader}
            </p>
            <p>
              <b>Assistants:</b>{" "}
              {Array.isArray(team.assistants)
                ? team.assistants.join(", ")
                : "None"}
            </p>

            <Divider />

            <Row gutter={24}>
              {/* LEFT SECTION - PRODUCTS LIST */}
              <Col span={10}>
                <Title level={4}>Products</Title>

                <Tabs
                  activeKey={activeTab}
                  onChange={(key) => setActiveTab(key)}
                  items={[
                    {
                      key: "all",
                      label: "All",
                    },
                    {
                      key: "pending",
                      label: "Pending",
                    },
                    {
                      key: "completed",
                      label: "Completed",
                    },
                  ]}
                />

                <Table
                  columns={columns}
                  dataSource={filteredProducts}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  onRow={(record) => ({
                    onClick: () => setSelectedProduct(record),
                    style: { cursor: "pointer" },
                  })}
                  rowClassName={(record) =>
                    selectedProduct?.id === record.id ? "selected-row" : ""
                  }
                />
              </Col>

              {/* RIGHT SECTION - PRODUCT DETAILS */}
              <Col span={14}>
                <Title level={4}>Product Details</Title>

                {selectedProduct ? (
                  <Card>
                    <Text strong>Product Name:</Text>
                    <p>{selectedProduct.product_name}</p>

                    <Text strong>Batch No:</Text>
                    <p>{selectedProduct.batch_no}</p>

                    <Text strong>Expiry Date:</Text>
                    <p>{selectedProduct.expiry_date}</p>

                    <Text strong>MRP:</Text>
                    <p>₹ {selectedProduct.mrp}</p>

                    {/* Quantity intentionally hidden */}
                  </Card>
                ) : (
                  <p>Select a product to view details</p>
                )}
              </Col>
            </Row>
          </Card>
        </div>
      )}
    </>
  );
}
