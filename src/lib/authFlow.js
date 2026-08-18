import { base44 } from "@/api/base44Client";

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours absolute session lifetime
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

export function stampSession(session) {
  const now = Date.now();
  return { ...session, session_expires_at: now + SESSION_TTL_MS, last_activity: now };
}

export function isSessionExpired(session) {
  if (!session) return true;
  const now = Date.now();
  if (session.session_expires_at && now > session.session_expires_at) return true;
  if (session.last_activity && now - session.last_activity > IDLE_TIMEOUT_MS) return true;
  return false;
}

// Shared post-login helper: stores a lightweight session immediately.
// SchoolContext refreshes the detailed school data after navigation.
export async function completeLogin(user) {
  let schoolData = {
    school_code: user.school_code,
    system_code: user.system_code,
    school_name: user.school_name || "",
    system_name: user.system_name || "",
  };

  if (user.school_code && user.system_code) {
    try {
      const schoolRes = await base44.functions.invoke("fetchSchoolData", {
        system_code: user.system_code,
        school_code: user.school_code,
      });
      if (schoolRes.data && !schoolRes.data.error) schoolData = schoolRes.data;
    } catch {
      // The basic school identity above is enough to continue into the dashboard.
    }
  }

  let systemSchools = [];
  if (["area", "commissioner"].includes(user.role) || user.school_code === "0000") {
    const schoolsRes = await base44.functions.invoke("subscriberAccess", {
      action: "schoolsBySystem",
      systemCode: user.system_code,
    });
    systemSchools = schoolsRes.data?.schools || [];
  }

  const session = stampSession({ user, school: schoolData, systemSchools });
  localStorage.setItem("userSession", JSON.stringify(session));
  return session;
}

export function getTempSession() {
  return JSON.parse(localStorage.getItem("tempSession") || "null");
}

export function setTempSession(session) {
  localStorage.setItem("tempSession", JSON.stringify(session));
}

export function clearTempSession() {
  localStorage.removeItem("tempSession");
}