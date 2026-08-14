import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function useStudentPortalData(includeSchedule = false) {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "", profile: null, schedules: [] });
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!session?.user || session.user.role !== "student") { navigate("/login", { replace: true }); return; }
    const load = async () => {
      try {
        const res = await base44.functions.invoke("manageStudents", { action: "get_profile", caller_username: session.user.username, caller_password: session.user.password || localStorage.getItem("userPassword") || "", student_id: session.user.student_id });
        if (!res.data?.success) throw new Error(res.data?.error || "Unable to load your information");
        let schedules = [];
        if (includeSchedule) {
          const allSchedules = await base44.entities.ClassSchedule.filter({ school_code: session.user.school_code }, "start_time", 500);
          const classIds = new Set((res.data.classes || []).map((item) => item.id));
          schedules = allSchedules.filter((item) => classIds.has(item.class_id));
        }
        setState({ loading: false, error: "", profile: res.data, schedules });
      } catch (error) { setState({ loading: false, error: error.message || "Unable to load your information", profile: null, schedules: [] }); }
    };
    load();
    const unsubscribe = base44.entities.StudentClass.subscribe((event) => {
      if (event.data?.student_id === session.user.student_id) load();
    });
    return unsubscribe;
  }, [includeSchedule, navigate]);
  return state;
}