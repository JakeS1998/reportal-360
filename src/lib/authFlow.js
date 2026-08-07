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

// Shared post-login helper: fetches school data + system schools list,
// stores the full session in localStorage, and returns it.
export async function completeLogin(user) {
  const dataRes = await base44.functions.invoke("fetchSchoolData", {
    system_code: user.system_code,
    school_code: user.school_code,
  });

  if (dataRes.data?.error) {
    throw new Error(dataRes.data.error);
  }

  const schoolData = dataRes.data;

  // Enrich user with system/school names if missing
  if (!user.system_name && schoolData?.system_name) {
    user.system_name = schoolData.system_name;
  }
  if (!user.school_name && schoolData?.school_name && user.school_code !== "0000") {
    user.school_name = schoolData.school_name;
  }

  let systemSchools = [];
  if (user.role === "area" || user.school_code === "0000") {
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