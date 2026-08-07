import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const todayName = () => DAY_NAMES[new Date().getDay()];
const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = (t || "").split(":");
  const hh = parseInt(h, 10);
  if (Number.isNaN(hh)) return t;
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export function useNotifications() {
  const { user, school, isTeacher } = useSchool();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!school?.school_code || !user?.id) { setLoading(false); return; }
      try {
        const query = isTeacher
          ? { teacher_id: user.id, school_code: school.school_code }
          : { school_code: school.school_code };
        const schedules = await base44.entities.ClassSchedule.filter(query, undefined, 500);
        const todays = schedules.filter((s) => s.day_of_week === todayName());
        if (todays.length === 0) { setItems([]); return; }
        const checks = await Promise.all(
          todays.map((s) => base44.entities.AttendanceRecord.filter({ class_id: s.class_id, date: todayStr() }, undefined, 1))
        );
        const missing = todays.filter((_, i) => checks[i].length === 0);
        setItems(
          missing.map((s) => ({
            id: `att-${s.id}`,
            type: "attendance",
            title: `Attendance not taken: ${s.class_name}`,
            detail: `${todayName()} · ${fmtTime(s.start_time)}${s.teacher_name ? ` · ${s.teacher_name}` : ""}`,
            class_id: s.class_id,
          }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, school?.school_code, isTeacher]);

  return { items, loading, count: items.length };
}