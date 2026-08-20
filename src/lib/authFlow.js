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

// Store the minimum session data immediately. SchoolContext loads fresh school data after navigation.
export function completeLogin(user) {
  const school = {
    school_code: user.school_code,
    system_code: user.system_code,
    school_name: user.school_name || "",
    system_name: user.system_name || "",
  };
  const session = stampSession({ user, school, systemSchools: [] });
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