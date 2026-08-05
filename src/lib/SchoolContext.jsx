import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const SchoolContext = createContext(null);

export function SchoolProvider({ children }) {
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session) {
      navigate("/");
      return;
    }
    setUser(session.user);
    const initial = session.school;
    setSchool(initial);
    setLoading(false);
    if (initial && initial.system_code && initial.school_code && (initial.math_proficiency == null || !initial.previous)) {
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

  return <SchoolContext.Provider value={{ school, user, loading, switchSchool }}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  return useContext(SchoolContext);
}