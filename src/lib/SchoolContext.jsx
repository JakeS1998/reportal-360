import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { isSessionExpired } from "@/lib/authFlow";

const SchoolContext = createContext(null);

const DEFAULT_FILTERS = {
  year: "2025",
  grade: "All Grades",
  subject: "All Subjects",
  studentGroup: "All Students",
  gender: "All Gender",
  homeroom: "All Homerooms",
};

export function SchoolProvider({ children }) {
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemSchools, setSystemSchools] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  // Year filter: swap in previous-year metrics when a prior year is selected
  const activeSchool = useMemo(() => {
    if (!school) return null;
    const prevYear = String(parseInt(school.year) - 1);
    if (filters.year === prevYear && school.previous) {
      return { ...school, ...school.previous, year: prevYear, previous: null };
    }
    return school;
  }, [school, filters.year]);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session) {
      navigate("/login");
      return;
    }
    if (isSessionExpired(session)) {
      localStorage.removeItem("userSession");
      navigate("/login");
      return;
    }
    setUser(session.user);
    setSystemSchools(session.systemSchools || []);
    const initial = session.school;
    setSchool(initial);
    setLoading(false);
    if (initial && initial.system_code && initial.school_code && (initial.math_proficiency == null || !initial.previous || !initial.county)) {
      base44.functions
        .invoke("fetchSchoolData", { system_code: initial.system_code, school_code: initial.school_code })
        .then((res) => {
          if (res.data && !res.data.error) {
            setSchool(res.data);
            localStorage.setItem("userSession", JSON.stringify({ ...session, school: res.data }));
          }
        })
        .catch(() => {});
    }
  }, [navigate]);

  // Enforce session expiry + idle timeout while the dashboard is open
  useEffect(() => {
    if (!user) return;
    const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    let lastTouch = Date.now();
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouch < 10000) return; // throttle writes
      lastTouch = now;
      const s = JSON.parse(localStorage.getItem("userSession") || "null");
      if (s) {
        s.last_activity = now;
        localStorage.setItem("userSession", JSON.stringify(s));
      }
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const interval = setInterval(() => {
      const s = JSON.parse(localStorage.getItem("userSession") || "null");
      if (!s) return;
      if (isSessionExpired(s)) {
        localStorage.removeItem("userSession");
        clearInterval(interval);
        window.location.href = "/login";
      }
    }, 30000);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
  }, [user]);

  const switchSchool = () => {
    localStorage.removeItem("userSession");
    navigate("/login");
  };

  // Area users: switch to a different school within their system
  const selectSchool = async (schoolCode) => {
    if (!school || !school.system_code) return;
    if (schoolCode === school.school_code) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("fetchSchoolData", {
        system_code: school.system_code,
        school_code: schoolCode,
      });
      if (res.data && !res.data.error) {
        setSchool(res.data);
        const session = JSON.parse(localStorage.getItem("userSession") || "{}");
        localStorage.setItem("userSession", JSON.stringify({ ...session, school: res.data }));
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const isArea = user?.role === "area" || user?.role === "commissioner";
  const isManager = user?.role === "manager";
  const isTeacher = user?.role === "teacher";
  const canManageStaff = isArea || isManager || user?.role === "admin";

  return (
    <SchoolContext.Provider value={{
      school, activeSchool, user, loading,
      switchSchool, selectSchool,
      systemSchools, filters, setFilter,
      isArea, isManager, isTeacher, canManageStaff,
    }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}