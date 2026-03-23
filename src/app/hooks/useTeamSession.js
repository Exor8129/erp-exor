"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { message } from "antd";

const ONE_HOUR = 60 * 60 * 1000;

export function useTeamSession() {
  const [team, setTeam] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [activeSession, setActiveSession] = useState(null);

  // LOGIN
  const login = async (username, password) => {
    if (!username || !password) {
      message.warning("Enter Username and Password");
      return null;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      message.error("Invalid Username or Password");
      return null;
    }

    setTeam(data);
    return data;
  };

  // CHECK SESSION
  const checkSession = async (team) => {
    const { data: session } = await supabase
      .from("counting_sessions")
      .select("*")
      .eq("team_id", team.id)
      .is("sessions_stop", null)
      .maybeSingle();

    if (!session) return { status: "new" };

    const inactiveTime = new Date() - new Date(session.last_activity);

    if (inactiveTime > ONE_HOUR) {
      await supabase
        .from("counting_sessions")
        .update({ sessions_stop: new Date() })
        .eq("id", session.id);

      return { status: "expired" };
    }

    setActiveSession(session);
    return { status: "active", session };
  };

  // CREATE SESSION
  const createSession = async (teamId) => {
    const { data, error } = await supabase
      .from("counting_sessions")
      .insert({
        team_id: teamId,
        sessions_start: new Date(),
        last_activity: new Date(),
      })
      .select()
      .single();

    if (error) {
      message.error("Failed to start session");
      return null;
    }

    setSessionId(data.id);
    return data.id;
  };

  // FORCE CLOSE (Supervisor)
  const forceCloseSession = async (sessionId, password) => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("role", "supervisor")
      .eq("password", password)
      .maybeSingle();

    if (!data) {
      message.error("Invalid Supervisor Password");
      return false;
    }

    await supabase
      .from("counting_sessions")
      .update({ sessions_stop: new Date() })
      .eq("id", sessionId);

    return true;
  };

  return {
    team,
    sessionId,
    loading,
    activeSession,
    login,
    checkSession,
    createSession,
    forceCloseSession,
  };
}