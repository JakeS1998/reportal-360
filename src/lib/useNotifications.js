import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const todayName = () => DAY_NAMES[new Date().getDay()];
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtTime = (time) => { const [hours, minutes] = (time || "").split(":"); const hour = Number(hours); return Number.isNaN(hour) ? time : `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`; };

export function useNotifications() {
  const { user, school, isTeacher } = useSchool();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      if (!school?.school_code || !user?.id) { setLoading(false); return; }
      const creds = { school_code: school.school_code, caller_username: user.username, caller_password: user.password || localStorage.getItem("userPassword") || "", caller_email: user.email || "", caller_sso: Boolean(user.sso || user.email) };
      try {
        const messageResult = await base44.functions.invoke("manageStaffMessages", { action: "inbox", ...creds });
        const messageItems = (messageResult.data?.messages || []).filter((message) => message.type === "message" && !message.read_at).map((message) => ({ id: `msg-${message.id}`, type: "message", title: `New message from ${message.sender_name || "a colleague"}`, detail: message.content }));
        const query = isTeacher ? { teacher_id: user.id, school_code: school.school_code } : { school_code: school.school_code };
        const schedules = await base44.entities.ClassSchedule.filter(query, undefined, 500);
        const todays = schedules.filter((schedule) => schedule.day_of_week === todayName());
        const checks = await Promise.all(todays.map((schedule) => base44.entities.AttendanceRecord.filter({ class_id: schedule.class_id, date: todayStr() }, undefined, 1)));
        const attendanceItems = todays.filter((_, index) => checks[index].length === 0).map((schedule) => ({ id: `att-${schedule.id}`, type: "attendance", title: `Attendance not taken: ${schedule.class_name}`, detail: `${todayName()} · ${fmtTime(schedule.start_time)}${schedule.teacher_name ? ` · ${schedule.teacher_name}` : ""}`, class_id: schedule.class_id }));
        setItems([...messageItems, ...attendanceItems]);
      } finally { setLoading(false); }
    };
    load();
  }, [user?.id, school?.school_code, isTeacher]);
  return { items, loading, count: items.length };
}