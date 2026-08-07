import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Link } from "react-router-dom";
import { BookOpen, MapPin, AlertCircle, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { getWeekStart, addWeeks, isScheduleActiveInWeek, formatWeekRange, weeksBetween, gradeColor } from "@/lib/scheduleWeeks";
import { buildTeachingSlots, mmToHHMM } from "@/lib/teachingSlots";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_START_MIN = 7 * 60;
const DAY_END_MIN = 16 * 60;
const PX_PER_MIN = 1.4;
const PX_PER_HOUR = PX_PER_MIN * 60;
const GRID_HEIGHT = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN;

const SPECIAL_STYLE = {
  Homeroom: "border-blue-200 bg-blue-50 text-blue-600",
  Break: "border-amber-200 bg-amber-50 text-amber-600",
  Lunch: "border-emerald-200 bg-emerald-50 text-emerald-600",
};

const HOURS = [];
for (let m = DAY_START_MIN; m < DAY_END_MIN; m += 60) HOURS.push(m);

const toMin = (t) => { if (!t) return 0; const [h, m] = t.split(":"); return parseInt(h, 10) * 60 + parseInt(m, 10); };
const fmtTime = (t) => { if (!t) return ""; const [h, m] = t.split(":"); const hh = parseInt(h, 10); const ampm = hh >= 12 ? "PM" : "AM"; const h12 = hh % 12 || 12; return `${h12}:${m} ${ampm}`; };
const todayName = () => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
const todayStr = () => new Date().toISOString().slice(0, 10);

function layoutBlocks(blocks) {
  const sorted = [...blocks].sort((a, b) => a._startMin - b._startMin);
  const clusters = [];
  let cluster = [];
  let clusterEnd = -1;
  for (const b of sorted) {
    if (cluster.length === 0 || b._startMin < clusterEnd) {
      cluster.push(b);
      clusterEnd = Math.max(clusterEnd, b._endMin);
    } else {
      clusters.push(cluster);
      cluster = [b];
      clusterEnd = b._endMin;
    }
  }
  if (cluster.length) clusters.push(cluster);
  const layout = {};
  for (const cl of clusters) {
    cl.forEach((b, i) => { layout[b.id] = { col: i, count: cl.length }; });
  }
  return layout;
}

export default function MyClasses() {
  const { user } = useSchool();
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState({});
  const [attendanceMap, setAttendanceMap] = useState({});
  const [covers, setCovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [timetable, setTimetable] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const res = await base44.entities.ClassSchedule.filter({ teacher_id: user.id }, "day_of_week", 500);
        setSchedules(res);
        const ids = [...new Set(res.map((s) => s.class_id))];
        const classRes = await Promise.all(ids.map((id) => base44.entities.Class.get(id).catch(() => null)));
        const map = {};
        classRes.forEach((c) => { if (c) map[c.id] = c; });
        setClasses(map);
        if (user.school_code) {
          const ttRes = await base44.entities.SchoolTimetable.filter({ school_code: user.school_code }, undefined, 5).catch(() => []);
          setTimetable(ttRes[0] || null);
        }
        try {
          const coversRes = await base44.functions.invoke("manageClassCovers", {
            action: "list",
            caller_username: user.username,
            caller_password: user.password || localStorage.getItem("userPassword") || "",
            cover_teacher_id: user.id,
          });
          setCovers(coversRes.data?.covers || []);
        } catch (e) { setCovers([]); }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const isCurrentWeek = useMemo(() => weeksBetween(weekStart, getWeekStart(new Date())) === 0, [weekStart]);

  useEffect(() => {
    if (!isCurrentWeek) { setAttendanceMap({}); return; }
    const wkStart = weekStart.getTime();
    const wkEnd = wkStart + 5 * 24 * 60 * 60 * 1000;
    const todayCovers = covers.filter((c) => {
      if (c.status !== "active" || c.day_of_week !== todayName() || !c.cover_date) return false;
      const t = new Date(c.cover_date + "T00:00:00").getTime();
      return t >= wkStart && t < wkEnd;
    });
    const todays = [
      ...schedules.filter((s) => s.day_of_week === todayName() && isScheduleActiveInWeek(s, weekStart)),
      ...todayCovers,
    ];
    if (todays.length === 0) { setAttendanceMap({}); return; }
    Promise.all(
      todays.map((s) => base44.entities.AttendanceRecord.filter({ class_id: s.class_id, date: todayStr() }, undefined, 1).catch(() => []))
    ).then((checks) => {
      const map = {};
      todays.forEach((s, i) => { map[s.class_id] = checks[i].length > 0; });
      setAttendanceMap(map);
    });
  }, [schedules, isCurrentWeek, weekStart, covers]);

  const weekSchedules = useMemo(
    () => schedules.filter((s) => isScheduleActiveInWeek(s, weekStart)),
    [schedules, weekStart]
  );

  const weekCovers = useMemo(() => {
    if (!covers.length) return [];
    const wkStart = weekStart.getTime();
    const wkEnd = wkStart + 5 * 24 * 60 * 60 * 1000;
    return covers.filter((c) => {
      if (c.status !== "active" || !c.cover_date) return false;
      const t = new Date(c.cover_date + "T00:00:00").getTime();
      return t >= wkStart && t < wkEnd;
    });
  }, [covers, weekStart]);

  const teachingSlots = useMemo(() => buildTeachingSlots(timetable).map((s) => ({ start: s.start, end: s.end })), [timetable]);

  const specialBlocks = useMemo(() => {
    if (!timetable) return [];
    const out = [];
    if (timetable.homeroom_start && timetable.homeroom_end) out.push({ start: toMin(timetable.homeroom_start), end: toMin(timetable.homeroom_end), label: "Homeroom" });
    if (timetable.break_start && timetable.break_end) out.push({ start: toMin(timetable.break_start), end: toMin(timetable.break_end), label: "Break" });
    if (timetable.lunch_start && timetable.lunch_end) out.push({ start: toMin(timetable.lunch_start), end: toMin(timetable.lunch_end), label: "Lunch" });
    return out.filter((b) => b.start >= DAY_START_MIN && b.end <= DAY_END_MIN);
  }, [timetable]);

  const byDay = (day) => [
    ...weekSchedules.filter((s) => s.day_of_week === day),
    ...weekCovers.filter((c) => c.day_of_week === day).map((c) => ({
      id: `cover-${c.id}`, class_id: c.class_id, class_name: c.class_name,
      start_time: c.start_time, end_time: c.end_time, room: c.room,
      _isCover: true, _coverTeacher: c.original_teacher_name,
    })),
  ]
    .map((s) => ({ ...s, _startMin: toMin(s.start_time), _endMin: toMin(s.end_time) }))
    .filter((s) => s._startMin >= DAY_START_MIN && s._endMin <= DAY_END_MIN);

  if (loading) return <div className="animate-pulse rounded-xl bg-slate-100 h-64" />;

  const todays = byDay(todayName());
  const hasPending = isCurrentWeek && todays.some((s) => attendanceMap[s.class_id] === false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Classes</h2>
          <p className="text-sm text-slate-500">{weekSchedules.length} scheduled class{weekSchedules.length === 1 ? "" : "es"} this week</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addWeeks(weekStart, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={() => setWeekStart(getWeekStart(new Date()))} className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium">Today</button>
          <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-semibold text-slate-700 ml-1">{formatWeekRange(weekStart)}</span>
        </div>
      </div>

      {hasPending && (
        <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4" /> Attendance still needed for one or more of today's classes.
        </div>
      )}

      {weekSchedules.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No classes scheduled for you this week. Try a different week, or ask a manager to schedule classes.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
          <div className="flex min-w-[760px]">
            <div className="w-12 shrink-0 relative" style={{ height: GRID_HEIGHT }}>
              {HOURS.map((m) => (
                <div key={m} className="absolute left-0 right-0 text-[10px] text-slate-400 -translate-y-1/2 text-right pr-1" style={{ top: (m - DAY_START_MIN) * PX_PER_MIN }}>
                  {fmtTime(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`)}
                </div>
              ))}
            </div>
            {DAYS.map((day, idx) => {
              const blocks = byDay(day);
              const layout = layoutBlocks(blocks);
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + idx);
              const isToday = isCurrentWeek && day === todayName();
              const freeSlots = teachingSlots.filter((slot) => !blocks.some((b) => b._startMin < slot.end && b._endMin > slot.start));
              return (
                <div key={day} className="flex-1 min-w-[140px] border-l border-slate-100">
                  <div className={`text-center text-xs font-semibold py-2 border-b ${isToday ? "text-[#9E1B32] border-[#9E1B32]/30 bg-[#9E1B32]/5" : "text-slate-700 border-slate-100"}`}>
                    <div>{day}</div>
                    <div className="text-[10px] font-normal text-slate-400">{dayDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                  </div>
                  <div className="relative" style={{ height: GRID_HEIGHT, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_HOUR - 1}px, #eef2f7 ${PX_PER_HOUR - 1}px, #eef2f7 ${PX_PER_HOUR}px)` }}>
                    {specialBlocks.map((sb) => {
                      const top = (sb.start - DAY_START_MIN) * PX_PER_MIN;
                      const height = Math.max(20, (sb.end - sb.start) * PX_PER_MIN - 2);
                      return (
                        <div
                          key={`sp-${day}-${sb.label}`}
                          className={`absolute rounded-lg p-1.5 text-[10px] leading-tight overflow-hidden border ${SPECIAL_STYLE[sb.label] || "border-slate-200 bg-slate-50 text-slate-500"}`}
                          style={{ top, height, left: "2px", width: "calc(100% - 4px)" }}
                          title={`${sb.label} · ${fmtTime(mmToHHMM(sb.start))}–${fmtTime(mmToHHMM(sb.end))}`}
                        >
                          <p className="font-semibold truncate">{sb.label}</p>
                          <p className="opacity-80 truncate">{fmtTime(mmToHHMM(sb.start))}–{fmtTime(mmToHHMM(sb.end))}</p>
                        </div>
                      );
                    })}
                    {freeSlots.map((slot) => {
                      const top = (slot.start - DAY_START_MIN) * PX_PER_MIN;
                      const height = Math.max(20, (slot.end - slot.start) * PX_PER_MIN - 2);
                      return (
                        <div
                          key={`pat-${day}-${slot.start}`}
                          className="absolute rounded-lg p-1.5 text-[10px] leading-tight overflow-hidden border border-dashed border-slate-300 bg-slate-50 text-slate-400"
                          style={{ top, height, left: "2px", width: "calc(100% - 4px)" }}
                          title={`PAT (Personal & Administration Time) · ${fmtTime(mmToHHMM(slot.start))}–${fmtTime(mmToHHMM(slot.end))}`}
                        >
                          <p className="font-semibold truncate">PAT</p>
                          <p className="opacity-80 truncate">{fmtTime(mmToHHMM(slot.start))}–{fmtTime(mmToHHMM(slot.end))}</p>
                        </div>
                      );
                    })}
                    {blocks.map((s) => {
                      const lay = layout[s.id] || { col: 0, count: 1 };
                      const top = (s._startMin - DAY_START_MIN) * PX_PER_MIN;
                      const height = Math.max(20, (s._endMin - s._startMin) * PX_PER_MIN - 2);
                      const widthPct = 100 / lay.count;
                      const cls = classes[s.class_id];
                      const bg = gradeColor(cls?.grade_level);
                      const taken = attendanceMap[s.class_id];
                      const showBadge = isToday && taken === false;
                      return (
                        <Link
                          key={s.id}
                          to={`/classes/${s.class_id}`}
                          state={{ fromClassId: s.class_id }}
                          className="absolute rounded-lg p-1.5 text-left text-white text-[10px] leading-tight overflow-hidden hover:ring-2 hover:ring-white transition-shadow block"
                          style={{
                            top,
                            height,
                            left: `calc(${lay.col * widthPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            backgroundColor: bg,
                          }}
                          title={`${s.class_name} · ${fmtTime(s.start_time)}–${fmtTime(s.end_time)}${s._isCover ? ` · Cover for ${s._coverTeacher || ""}` : ""}${cls?.grade_level ? ` · Grade ${cls.grade_level}` : ""}`}
                        >
                          <p className="font-semibold truncate">{s.class_name}</p>
                          <p className="opacity-90 truncate">{fmtTime(s.start_time)}–{fmtTime(s.end_time)}</p>
                          {s.room && height > 56 && <p className="opacity-75 truncate flex items-center gap-0.5"><MapPin className="w-2 h-2" />{s.room}</p>}
                          {s._isCover && (
                            <span className="mt-1 inline-flex text-[9px] font-semibold px-1 py-0.5 rounded bg-white/30">
                              Cover{s._coverTeacher ? ` · ${s._coverTeacher}` : ""}
                            </span>
                          )}
                          {showBadge && (
                            <span className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded bg-white/25">
                              <AlertCircle className="w-2.5 h-2.5" /> Attendance
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
        <span className="font-medium text-slate-600">Grade colours:</span>
        {[...new Set(weekSchedules.map((s) => classes[s.class_id]?.grade_level).filter(Boolean))].sort().map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: gradeColor(g) }} /> Grade {g}
          </span>
        ))}
      </div>
    </div>
  );
}