import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const SchoolContext = createContext(null);

export function SchoolProvider({ children }) {
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemSchools, setSystemSchools] = useState([]);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session) {
      navigate("/");
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

  const switchSchool = () => {
    localStorage.removeItem("userSession");
    navigate("/");
  };

  // Commissioner: switch to a different school within their system
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

  return (
    <SchoolContext.Provider value={{ school, user, loading, switchSchool, selectSchool, systemSchools }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}