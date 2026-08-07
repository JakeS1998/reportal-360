import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Link } from "react-router-dom";
import { BookOpen, Clock, MapPin, AlertCircle, CalendarDays } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const todayName = () => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export default function MyClasses() {
  const { user } = useSchool();
  const [schedules, setSchedules] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const res = await base44.entities.ClassSchedule.filter({ teacher_id: user.id }, "day_of_week", 500);
        setSchedules(res);
        const todays = res.filter((s) => s.day_of_week === todayName());
        if (todays.length > 0) {
          const checks = await Promise.all(
            todays.map((s) => base44.entities.AttendanceRecord.filter({ class_id: s.class_id, date: todayStr() }, undefined, 1))
          );
          const map = {};
          todays.forEach((s, i) => { map[s.class_id] = checks[i].length > 0; });
          setAttendanceMap(map);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) return <div className="animate-pulse rounded-xl bg-slate-100 h-64" />;

  const todays = schedules.filter((s) => s.day_of_week === todayName()).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  const otherDays = DAYS.filter((d) => d !== todayName());
  const countFor = (day) => schedules.filter((s) => s.day_of_week === day).length;

  const ClassCard = ({ s, showReminder }) => {
    const taken = attendanceMap[s.class_id];
    return (
      <Link to={`/classes/${s.class_id}`} state={{ fromClassId: s.class_id }} className="block bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">{s.class_name}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</p>
            {s.room && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />Room {s.room}</p>}
          </div>
          {showReminder && taken === false && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600 shrink-0">
              <AlertCircle className="w-3 h-3" /> Attendance not taken
            </span>
          )}
          {showReminder && taken === true && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 shrink-0">
              Attendance taken
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">My Classes</h2>
        <p className="text-sm text-slate-500">{schedules.length} scheduled class{schedules.length === 1 ? "" : "es"} this week</p>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No classes scheduled for you yet. A manager can schedule classes from the Weekly Schedule page.</p>
        </div>
      ) : (
        <>
          {/* Today */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Today · {todayName()}</h3>
              {todays.some((s) => attendanceMap[s.class_id] === false) && (
                <span className="text-xs text-amber-600 font-medium">Attendance reminders below</span>
              )}
            </div>
            {todays.length === 0 ? (
              <p className="text-sm text-slate-400">No classes scheduled today.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todays.map((s) => <ClassCard key={s.id} s={s} showReminder />)}
              </div>
            )}
          </div>

          {/* Other days */}
          {otherDays.filter((d) => countFor(d) > 0).map((day) => (
            <div key={day}>
              <h3 className="text-sm font-bold text-slate-900 mb-3">{day}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schedules.filter((s) => s.day_of_week === day).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")).map((s) => <ClassCard key={s.id} s={s} />)}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}