"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Select,
  Typography,
  Progress,
  Space,
  message,
  Input,
  Modal,
} from "antd";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import dayjs from "dayjs";
import TeamLoginModal from "../components/TeamLoginModal";
import SupervisorModal from "../components/SupervisorModal";

const { Title, Text } = Typography;

export default function CycleDashboard() {
  console.log("🚀 CycleDashboard Loaded");
  const router = useRouter();

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  // const [passwords, setPasswords] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  // const [selectedTeamId, setSelectedTeamId] = useState(null);

  const [teamLoginVisible, setTeamLoginVisible] = useState(false);
  const [supervisorVisible, setSupervisorVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  
  

  const fetchCycles = async () => {
    console.log("🚀 Starting to fetch cycles...");
    setLoading(true);

    try {
      let allCycles = [];
      let from = 0;
      const batchSize = 1000;

      // 🔹 STEP 1: FETCH ALL CYCLES (Pagination Safe)
      while (true) {
        const { data, error } = await supabase
          .from("count_cycles")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (!data || data.length === 0) break;

        allCycles = [...allCycles, ...data];

        if (data.length < batchSize) break;

        from += batchSize;
      }

      console.log("✅ TOTAL CYCLES FETCHED:", allCycles.length);

      // 🔹 STEP 2: ENRICH WITH COUNTS
      const enriched = await Promise.all(
        allCycles.map(async (cycle) => {
          // 🔥 RPC CALL (NO LIMIT ISSUE)
          const { data: counts, error: rpcError } = await supabase.rpc(
            "get_cycle_counts",
            {
              p_cycle_id: cycle.id,
            },
          );

          if (rpcError) {
            console.error("❌ RPC ERROR:", rpcError);
          }

          console.log("🔍 Cycle ID:", cycle.id);
          console.log("📊 RPC Response:", counts);

          const total = counts?.[0]?.total || 0;
          const completed = counts?.[0]?.completed || 0;

          console.log("✅ Parsed:", { total, completed });

          // 🔥 OPTIONAL HARD CHECK (DEBUG ONLY)
          const { count: directCount } = await supabase
            .from("cycle_items")
            .select("*", { count: "exact", head: true })
            .eq("cycle_id", cycle.id);

          console.log("🧪 Direct Count:", directCount);

          return {
            ...cycle,
            total,
            completed,
            progress: total ? Math.round((completed / total) * 100) : 0,
          };
        }),
      );

      console.log("🚀 FINAL ENRICHED DATA:", enriched);

      setCycles(enriched);
    } catch (err) {
      console.error(err);
      message.error("Error loading cycles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const prevCard = () => {
    setActiveIndex((prev) => (prev === 0 ? teams.length - 1 : prev - 1));
  };

  const nextCard = () => {
    setActiveIndex((prev) => (prev === teams.length - 1 ? 0 : prev + 1));
  };

  // 🔹 Filters
  const filteredData =
    filterType === "all"
      ? cycles
      : cycles.filter((c) => c.cycle_type === filterType);

  // 🔹 Table Columns
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (_, r) => (
        <div>
          <Text strong>{r.cycle_name}</Text>
          <div style={{ fontSize: 12 }}>
            {dayjs(r.created_at).format("DD-MM-YYYY")}
          </div>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "cycle_type",
      render: (t) => (
        <Tag color="blue">{t.replace("_", " ").toUpperCase()}</Tag>
      ),
    },
    {
      title: "Progress",
      render: (r) => (
        <div style={{ width: 150 }}>
          <Progress percent={r.progress} size="small" />
          <Text style={{ fontSize: 11 }}>
            {r.completed}/{r.total}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (s) => {
        const color =
          s === "active" ? "orange" : s === "completed" ? "green" : "default";

        return <Tag color={color}>{s.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Cycle ID",
      dataIndex: "id",
      render: (id) => (
        <div
          style={{
            display: "inline-block",
            padding: "6px 16px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #1677ff, #69b1ff)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
            boxShadow: "0 2px 6px rgba(22,119,255,0.3)",

          }}
        >
          {id}
        </div>
      ),
    },

    {
      title: "Actions",
      render: (r) => (
        <Space>
          <Button
            type="primary"
            size="small"
            onClick={async () => {
              setSelectedCycle(r);

              try {
                const data = await fetchTeamsWithStatus(r.id);
                setTeams(data);
                setTeamModalVisible(true);
              } catch (err) {
                message.error("Failed to load teams");
              }
            }}
          >
            Open
          </Button>
        </Space>
      ),
    },
  ];

  // 🔹 Summary
  const total = cycles.length;
  const active = cycles.filter((c) => c.status === "active").length;
  const completed = cycles.filter((c) => c.status === "completed").length;

  const handleTeamLogin = async (password) => {
    setLoadingLogin(true);

    try {
      if (!selectedTeam) throw new Error("No team selected");

      if (selectedTeam.password !== password) {
        throw new Error("Wrong password");
      }

      const { data: existing } = await supabase
        .from("counting_sessions")
        .select("*")
        .eq("team_id", selectedTeam.id)
        .is("sessions_stop", null)
        .maybeSingle();

      if (existing) {
        setTeamLoginVisible(false);
        setSupervisorVisible(true);
        return;
      }

      await createSession(selectedTeam);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoadingLogin(false);
    }
  };

  const createSession = async (team) => {
    try {
      if (!selectedCycle) throw new Error("No cycle selected");
      const { error } = await supabase.from("counting_sessions").insert([
        {
          team_id: team.id,
          cycle_id: selectedCycle.id,
        },
      ]);

      if (error) throw error;

      message.success(`Logged in as ${team.team_leader}`);

      setTeamLoginVisible(false);
      setSupervisorVisible(false);
      setTeamModalVisible(false);

      router.push(`/cyclecount/${selectedCycle.id}?teamId=${team.id}`);
    } catch (err) {
      message.error("Error starting session");
    }
  };

  const handleSupervisorAuth = async (password) => {
    setLoadingLogin(true);

    try {
      if (!password) {
        throw new Error("Enter supervisor password");
      }

      // 🔥 Validate supervisor
      const { data: supervisor, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "supervisor")
        .eq("password", password)
        .maybeSingle();

      if (error) throw error;

      if (!supervisor) {
        throw new Error("Invalid password"); // 👈 THIS triggers toast
      }

      // 🔥 Close existing session
      await supabase
        .from("counting_sessions")
        .update({ sessions_stop: new Date() })
        .eq("team_id", selectedTeam.id)
        .is("sessions_stop", null);

      // 🔥 Create new session
      await createSession(selectedTeam);

    } catch (err) {
      message.error(err.message || "Something went wrong");
    } finally {
      setLoadingLogin(false);
    }
  };

  const fetchTeamsWithStatus = async (cycleId) => {
    // 1. Get all teams (✅ include assistants)
    const { data: teams, error: teamError } = await supabase
      .from("teams")
      .select("id, team_leader, username, password, status, assistants")
      .eq("status", "ACTIVE");
    if (teamError) throw teamError;

    // 2. Get active sessions for this cycle
    const { data: sessions, error: sessionError } = await supabase
      .from("counting_sessions")
      .select("team_id, cycle_id, sessions_start")
      .is("sessions_stop", null)
      .eq("cycle_id", cycleId);

    if (sessionError) throw sessionError;

    // 3. Map active teams
    const activeMap = {};
    sessions.forEach((s) => {
      activeMap[s.team_id] = s;
    });

    // 4. Merge + FIX assistants
    return teams.map((t) => {
      let parsedAssistants = [];

      try {
        parsedAssistants =
          typeof t.assistants === "string"
            ? JSON.parse(t.assistants)
            : t.assistants || [];
      } catch (e) {
        parsedAssistants = [];
      }
      // ✅ Normalize to string array
      const cleanAssistants = parsedAssistants.map((a) =>
        typeof a === "object" ? a.name : a,
      );

      return {
        ...t,
        assistants: cleanAssistants, // ✅ always array now
        isActive: !!activeMap[t.id],
        sessionInfo: activeMap[t.id] || null,
      };
    });
  };

  const cleanCardStyles = `
.deck-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.deck {
  position: relative;
  width: 340px;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

/* NAV */
.nav-btn {
  border: none;
  background: #f5f5f5;
  color: #333;
  font-size: 20px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
  position: relative;
}

.nav-btn:hover {
  background: #e6f4ff;
  color: #1677ff;
}

/* CARD */
.card {
  position: absolute;
  width: 200px;
  height: 250px;
  border-radius: 14px;
  padding: 14px;
  background: #ffffff;
  transition: all 0.4s ease;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  border: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  will-change: transform;
  backface-visibility: hidden;
}

/* POSITIONS */
.card.center {
  box-shadow: 0 12px 32px rgba(22,119,255,0.25);
  transform: translateX(0) scale(1.05);
  z-index: 10;
}

.card.left {
  transform: translateX(-140px) scale(0.9);
  opacity: 0.5;
   z-index: 5;
}

.card.right {
  transform: translateX(140px) scale(0.9);
  opacity: 0.5;
   z-index: 5;
}

.card.hidden {
  opacity: 0;
  pointer-events: none;
   z-index: 0;
}

/* ACTIVE */
.card.active {
  border: 1px solid #1677ff;
  box-shadow: 0 10px 28px rgba(22,119,255,0.2);
}

/* HEADER */
.card-header {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* AVATAR */
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e6f4ff;
  color: #1677ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

/* TEXT */
.username {
  font-weight: 600;
  font-size: 14px;
}

.leader {
  font-size: 12px;
  color: #666;
}

/* ASSISTANTS */
.assistants {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* LOGIN */
.login-box {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card.center.disabled{
  opacity: 1;
  border: 1px solid orange;
  box-shadow: 0 12px 32px rgba(255,165,0,0.3);
  background: #fff7e6;}

/* DISABLED */
.card.disabled {
  opacity: 0.4;
  cursor: pointer;
}
`;

  return (
    <div style={{ padding: 24 }}>
      <style>{cleanCardStyles}</style>
      {/* Header */}
      <Row justify="space-between" align="middle">
        <Title level={3}>Cycle Count Dashboard</Title>

        <Button
          type="primary"
          onClick={() => router.push("/admin/yearEndCountInitiate")}
        >
          + Initiate Count
        </Button>
      </Row>

      {/* Filters */}
      <Card style={{ marginTop: 16 }}>
        <Select
          value={filterType}
          onChange={setFilterType}
          style={{ width: 200 }}
          options={[
            { label: "All", value: "all" },
            { label: "Year End", value: "year_end" },
            { label: "Cycle", value: "cycle" },
            { label: "ABC", value: "abc" },
          ]}
        />
      </Card>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card>
            <Text>Total Counts</Text>
            <Title>{total}</Title>
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <Text>Active</Text>
            <Title>{active}</Title>
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <Text>Completed</Text>
            <Title>{completed}</Title>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card style={{ marginTop: 16 }}>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        open={teamModalVisible}
        onCancel={() => setTeamModalVisible(false)}
        footer={null}
        width={600}
        centered
      >
        {/* HEADER */}
        <div style={{ marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            Select Team
          </Title>
          <Text type="secondary">
            Choose an available team to start counting
          </Text>
        </div>

        <div className="deck-wrapper">
          {/* LEFT BUTTON */}
          <button
            className="nav-btn"
            onClick={(e) => {
              e.stopPropagation();
              prevCard();
            }}
            disabled={teamLoginVisible || supervisorVisible}
          >
            ‹
          </button>

          {/* 👇 IMPORTANT WRAPPER (prevents overlap issues) */}
          <div style={{ position: "relative", width: 340, height: 260 }}>
            <div className="deck">
              {teams.map((team, index) => {
                const position =
                  index === activeIndex
                    ? "center"
                    : index === (activeIndex - 1 + teams.length) % teams.length
                      ? "left"
                      : index === (activeIndex + 1) % teams.length
                        ? "right"
                        : "hidden";

                return (
                  <div
                    key={team.id}
                    className={`card ${position} ${team.isActive ? "disabled" : ""
                      } ${selectedTeam?.id === team.id ? "active" : ""}`}
                    onClick={() => {
                      if (teamLoginVisible || position !== "center") return;

                      setSelectedTeam(team);

                      setTimeout(() => {
                        if (team.isActive) {
                          // ✅ keep team modal open
                          setSupervisorVisible(true);
                        } else {
                          // ✅ close team modal only for login
                          setTeamModalVisible(false);
                          setTeamLoginVisible(true);
                        }
                      }, 200);
                    }}
                  >
                    {/* TOP */}
                    <div className="card-header">
                      <div className="avatar">
                        {team.username?.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div className="username">{team.username}</div>
                        <div className="leader">👤 {team.team_leader}</div>
                      </div>
                    </div>

                    {/* ASSISTANTS */}
                    <div className="assistants">
                      {team.assistants?.length > 0 ? (
                        team.assistants.map((a, i) => <Tag key={i}>{a}</Tag>)
                      ) : (
                        <Text type="secondary">No assistants</Text>
                      )}
                    </div>

                    {/* ACTIVE */}
                    {team.isActive && (
                      <Tag color="orange" style={{ marginTop: 8 }}>
                        Resume / Force Login
                      </Tag>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT BUTTON */}
          <button
            className="nav-btn"
            onClick={(e) => {
              e.stopPropagation();
              nextCard();
            }}
            disabled={teamLoginVisible || supervisorVisible}
          >
            ›
          </button>
        </div>
      </Modal>

      <TeamLoginModal
        open={teamLoginVisible}
        teamName={selectedTeam?.username} // ✅ FIXED
        onLogin={handleTeamLogin}
        onClose={() => setTeamLoginVisible(false)} // ✅ REQUIRED for close
        loading={loadingLogin}
      />

      <SupervisorModal
        open={supervisorVisible}
        team={selectedTeam}
        onConfirm={handleSupervisorAuth}
        onCancel={() => setSupervisorVisible(false)}
        loading={loadingLogin}
      />
    </div>
  );
}
