import { base44 } from "@/api/base44Client";

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

  const session = { user, school: schoolData, systemSchools };
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