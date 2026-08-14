import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useClassManagement } from "@/lib/useClassManagement";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, CalendarDays, MapPin, BookOpen, AlertTriangle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import SchoolHoursDialog from "@/components/schedule/SchoolHoursDialog";
import DetentionAssignmentDialog from "@/components/schedule/DetentionAssignmentDialog";
import TeacherWorkload from "@/components/schedule/TeacherWorkload";
import LessonPlanDialog from "@/components/lesson-plans/LessonPlanDialog";
import { getWeekStart, addWeeks, isScheduleActiveInWeek, formatWeekRange, weeksBetween } from "@/lib/scheduleWeeks";
import { useSubjectColors } from "@/lib/useSubjectColors";
import { getCycleDayType, getSchoolDays } from "@/lib/schedulingModels";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const CRIMSON = "#9E1B32";

const DAY_START_MIN = 7 * 60; // 7:00 AM
const DAY_END_MIN = 16 * 60; // 4:00 PM
const PX_PER_MIN = 1.4;
const PX_PER_HOUR = PX_PER_MIN * 60;
const GRID_HEIGHT = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN;

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
};

const pad = (n) => String(n).padStart(2, "0");
const mmToHHMM = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

const HOURS = [];
for (let m = DAY_START_MIN; m < DAY_END_MIN; m += 60) HOURS.push(m);

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

export default function Schedule() {
  const cm = useClassManagement();
  const { canManageStaff, user } = useSchool();
  const callerCreds = {
    caller_username: user?.username,
    caller_password: user?.password || localStorage.getItem("userPassword") || "",
  };
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherFilter, setTeacherFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ class_id: "", teacher_id: "", day_of_week: "Monday", start_time: "08:00", end_time: "09:00", room: "", recurrence_type: "weekly", locked: false });
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [timetable, setTimetable] = useState(null);
  const [showHours, setShowHours] = useState(false);
  const [showDetention, setShowDetention] = useState(false);
  const [lessonContext, setLessonContext] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const gridRefs = useRef({});
  const { resolveSubjectColor } = useSubjectColors();

  const load = useCallback(async () => {
    if (!cm.schoolCode) return;
    setLoading(true);
    try {
      const timetableRows = await base44.entities.SchoolTimetable.filter({ school_code: cm.schoolCode });
      const schoolTimetable = timetableRows.find((row) => row.scope === "school") || timetableRows[0];
      const startTimes = [...new Set([
        schoolTimetable?.school_start,
        schoolTimetable?.homeroom_start,
        ...(schoolTimetable?.periods || []).map((period) => period.start),
      ].filter(Boolean))];
      const batches = await Promise.all(startTimes.map((startTime) =>
        base44.entities.ClassSchedule.filter({ school_code: cm.schoolCode, start_time: startTime }, "start_time", 500)
      ));
      setSchedules(batches.flat());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cm.schoolCode]);

  const loadTimetable = useCallback(async () => {
    if (!cm.schoolCode) return;
    try {
      const rows = await base44.entities.SchoolTimetable.filter({ school_code: cm.schoolCode });
      setTimetable(rows[0] || null);
    } catch {}
  }, [cm.schoolCode]);

  useEffect(() => { load(); loadTimetable(); }, [load, loadTimetable]);

  const breakBand = timetable?.break_start && timetable?.break_end
    ? { start: toMin(timetable.break_start), end: toMin(timetable.break_end), label: "Break", kind: "break" }
    : null;
  const lunchBand = timetable?.lunch_start && timetable?.lunch_end
    ? { start: toMin(timetable.lunch_start), end: toMin(timetable.lunch_end), label: "Lunch", kind: "lunch" }
    : null;
  const homeroomBand = timetable?.homeroom_start && timetable?.homeroom_end
    ? { start: toMin(timetable.homeroom_start), end: toMin(timetable.homeroom_end), label: "Homeroom", kind: "homeroom" }
    : null;
  const bands = [homeroomBand, breakBand, lunchBand].filter(Boolean);
  const schoolStart = timetable?.school_start ? toMin(timetable.school_start) : null;
  const schoolEnd = timetable?.school_end ? toMin(timetable.school_end) : null;

  const activeTeachers = cm.teachers.filter((t) => t.role === "teacher" || t.role === "manager").sort((a, b) => (a.full_name || a.username || "").localeCompare(b.full_name || b.username || ""));
  const activeClasses = cm.classes.filter((c) => c.status === "active");
  const gradeLevels = [...new Set(cm.classes.map((item) => item.grade_level).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const scheduleDays = timetable?.scheduling_model === "rotating_block" ? (timetable.cycle_day_types?.length ? timetable.cycle_day_types : ["A", "B"]) : getSchoolDays(timetable);

  const openCreate = (overrides = {}) => {
    setEditing(null);
    setFormError("");
    setForm({
      class_id: activeClasses[0]?.id || "",
      teacher_id: teacherFilter || "",
      day_of_week: "Monday",
      start_time: "08:00",
      end_time: "09:00",
      room: "",
      recurrence_type: timetable?.scheduling_model === "rotating_block" ? "cycle" : "weekly",
      locked: false,
      ...overrides,
    });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setFormError("");
    setForm({ class_id: s.class_id, teacher_id: s.teacher_id, day_of_week: s.day_type || s.day_of_week, start_time: s.start_time || "08:00", end_time: s.end_time || "09:00", room: s.room || "", recurrence_type: s.recurrence_type || "weekly", locked: Boolean(s.locked) });
    setShowForm(true);
  };

  const hasConflict = (teacherId, day, start, end, excludedIds = new Set()) => {
    const sMin = toMin(start);
    const eMin = toMin(end);
    return schedules.some((s) => s.teacher_id === teacherId && (s.day_type || s.day_of_week) === day && !excludedIds.has(s.id) && sMin < toMin(s.end_time) && eMin > toMin(s.start_time));
  };

  const hasStudentConflict = (classId, day, start, end, excludedIds = new Set()) => {
    const studentIds = new Set(cm.studentAssignments.filter((assignment) => assignment.class_id === classId && assignment.status === "active").map((assignment) => assignment.student_id));
    if (studentIds.size === 0) return false;
    const sMin = toMin(start);
    const eMin = toMin(end);
    return schedules.some((schedule) => (schedule.day_type || schedule.day_of_week) === day && !excludedIds.has(schedule.id) && sMin < toMin(schedule.end_time) && eMin > toMin(schedule.start_time) && cm.studentAssignments.some((assignment) => assignment.class_id === schedule.class_id && assignment.status === "active" && studentIds.has(assignment.student_id)));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.class_id || !form.teacher_id) { setFormError("Select a class and a teacher."); return; }
    if (toMin(form.end_time) <= toMin(form.start_time)) { setFormError("End time must be after start time."); return; }
    const cls = cm.classes.find((c) => c.id === form.class_id);
    const teacher = cm.teachers.find((t) => t.id === form.teacher_id);
    const isTraditional = (timetable?.scheduling_model || "traditional") === "traditional";
    const meetingDays = isTraditional ? getSchoolDays(timetable).filter((day) => !teacher?.working_days?.length || teacher.working_days.includes(day)) : [form.day_of_week];
    if (!meetingDays.length) { setFormError(`${teacher?.full_name || "This teacher"} has no working days in this school timetable.`); return; }
    const linkedSchedules = editing && isTraditional ? schedules.filter((schedule) => schedule.class_id === editing.class_id && schedule.schedule_type === "traditional") : editing ? [editing] : [];
    const excludedIds = new Set(linkedSchedules.map((schedule) => schedule.id));
    for (const day of meetingDays) {
      if (hasConflict(form.teacher_id, day, form.start_time, form.end_time, excludedIds)) { setFormError(`That teacher already has a class overlapping this time on ${day}.`); return; }
      if (hasStudentConflict(form.class_id, day, form.start_time, form.end_time, excludedIds)) { setFormError(`One or more students already have a class overlapping this time on ${day}.`); return; }
      if (!isTraditional && DAYS.includes(day) && teacher?.working_days?.length && !teacher.working_days.includes(day)) { setFormError(`${teacher.full_name || "This teacher"} does not work on ${day}.`); return; }
    }
    const sharedPayload = {
      class_id: form.class_id,
      class_name: cls?.class_name || "",
      school_code: cm.schoolCode,
      teacher_id: form.teacher_id,
      teacher_name: teacher?.full_name || "",
      room: form.room,
      start_time: form.start_time,
      end_time: form.end_time,
      schedule_type: timetable?.scheduling_model || "traditional",
      recurrence_type: form.recurrence_type || "weekly",
      recurrence_weeks: form.recurrence_type === "biweekly" ? 2 : 1,
      start_date: weekStart.toISOString().slice(0, 10),
      locked: form.locked,
    };
    const payloadForDay = (day) => ({ ...sharedPayload, day_of_week: day, day_type: timetable?.scheduling_model === "rotating_block" ? day : "" });
    if (editing && isTraditional) {
      const currentByDay = new Map(linkedSchedules.map((schedule) => [schedule.day_of_week, schedule]));
      await Promise.all(meetingDays.map((day) => currentByDay.has(day) ? base44.entities.ClassSchedule.update(currentByDay.get(day).id, payloadForDay(day)) : base44.entities.ClassSchedule.create(payloadForDay(day))));
      await Promise.all(linkedSchedules.filter((schedule) => !meetingDays.includes(schedule.day_of_week)).map((schedule) => base44.entities.ClassSchedule.delete(schedule.id)));
    } else if (editing) {
      await base44.entities.ClassSchedule.update(editing.id, payloadForDay(form.day_of_week));
    } else {
      await base44.entities.ClassSchedule.bulkCreate(meetingDays.map(payloadForDay));
      const exists = cm.teacherAssignments.find((ta) => ta.teacher_id === form.teacher_id && ta.class_id === form.class_id);
      if (!exists && teacher) await base44.entities.TeacherClass.create({ teacher_id: form.teacher_id, teacher_name: teacher.full_name || "", class_id: form.class_id, role: "Primary Teacher", school_code: cm.schoolCode });
    }
    setShowForm(false);
    setEditing(null);
    load();
    cm.loadData();
  };

  const handleDelete = async (s) => {
    if (!confirm(`Remove "${s.class_name}" from ${s.day_of_week} ${fmtTime(s.start_time)}?`)) return;
    await base44.entities.ClassSchedule.delete(s.id);
    load();
  };

  const [clearing, setClearing] = useState(false);
  const handleClearSchedule = async () => {
    if (schedules.length === 0) return;
    if (!confirm(`Clear all ${schedules.length} scheduled class slot${schedules.length === 1 ? "" : "s"} for ${cm.schoolName || "this school"}? Classes and assignments are kept — only the weekly timetable is removed.`)) return;
    setClearing(true);
    try {
      await base44.entities.ClassSchedule.deleteMany({ school_code: cm.schoolCode });
      load();
      cm.loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to clear the schedule. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  const openLessonPlan = (schedule, dayIndex) => {
    const lessonDate = new Date(weekStart);
    lessonDate.setDate(lessonDate.getDate() + dayIndex);
    setLessonContext({ class_id: schedule.class_id, class_name: schedule.class_name, school_code: schedule.school_code, schedule_id: schedule.id, lesson_date: lessonDate.toISOString().slice(0, 10) });
    setContextMenu(null);
  };

  const handleGridClick = (day, e) => {
    const el = gridRefs.current[day];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let min = DAY_START_MIN + Math.round(offsetY / PX_PER_MIN);
    min = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN - 30, min));
    min = Math.round(min / 15) * 15; // snap to 15 min
    const date = new Date(weekStart); date.setDate(date.getDate() + DAYS.indexOf(day));
    openCreate({ day_of_week: timetable?.scheduling_model === "rotating_block" ? getCycleDayType(date, timetable) : day, start_time: mmToHHMM(min), end_time: mmToHHMM(Math.min(DAY_END_MIN, min + 60)) });
  };

  const subjectOptions = useMemo(() => [...new Set(activeClasses.map((item) => item.subject).filter(Boolean))].sort(), [activeClasses]);
  const hasScheduleFilter = Boolean(teacherFilter || subjectFilter || gradeFilter);
  const filtered = useMemo(() => schedules.filter((schedule) => {
    const cls = activeClasses.find((item) => item.id === schedule.class_id);
    return (!teacherFilter || schedule.teacher_id === teacherFilter)
      && (!subjectFilter || cls?.subject === subjectFilter)
      && (!gradeFilter || cls?.grade_level === gradeFilter);
  }), [schedules, activeClasses, teacherFilter, subjectFilter, gradeFilter]);
  const byDay = (day) => {
    const date = new Date(weekStart); date.setDate(date.getDate() + DAYS.indexOf(day));
    const cycleDay = timetable?.scheduling_model === "rotating_block" ? getCycleDayType(date, timetable) : "";
    return filtered
    .filter((s) => (cycleDay ? s.day_type === cycleDay : s.day_of_week === day) && isScheduleActiveInWeek(s, weekStart))
    .map((s) => ({ ...s, _startMin: toMin(s.start_time), _endMin: toMin(s.end_time) }))
    .filter((s) => s._startMin >= DAY_START_MIN && s._endMin <= DAY_END_MIN);
  };
  if (!canManageStaff) {
    return (
      <div className="text-center py-16">
        <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">You don't have access to the weekly schedule.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Weekly Schedule</h2>
          <p className="text-sm text-slate-500">Click any time slot to schedule a class. Assignments happen here, not at class creation.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
            <option value="">Filter by teacher</option>
            {activeTeachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
            <option value="">Filter by subject</option>
            {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
            <option value="">Filter by grade</option>
            {gradeLevels.map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
          </select>
          <Button variant="outline" onClick={handleClearSchedule} disabled={clearing || schedules.length === 0} className="border-rose-200 text-rose-600 hover:bg-rose-50">
            <Trash2 className="w-4 h-4 mr-1" /> {clearing ? "Clearing…" : "Clear Schedule"}
          </Button>
          <Button variant="outline" onClick={() => setShowHours(true)}>
            <Clock className="w-4 h-4 mr-1" /> School Hours
          </Button>
          <Button variant="outline" onClick={() => setShowDetention(true)}>
            <CalendarDays className="w-4 h-4 mr-1" /> Assign Detention
          </Button>
          <Button onClick={() => openCreate()} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-1" /> Schedule Class
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, -1))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight className="w-4 h-4" /></Button>
          <span className="text-sm font-semibold text-slate-700 ml-1">{formatWeekRange(weekStart)}</span>
        </div>
        <span className="text-xs text-slate-400">New classes anchor to the week shown above.</span>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-xl bg-slate-100 h-64" />
      ) : activeClasses.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Create a class first, then schedule it here.</p>
        </div>
      ) : !hasScheduleFilter ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500">Choose a teacher, subject, or grade to view its weekly schedule.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
          <div className="min-w-[760px]">
            {/* Day headers (separate row so the time gutter aligns with the grid body) */}
            <div className="flex">
              <div className="w-12 shrink-0" />
              {DAYS.map((day, idx) => {
                const dayDate = new Date(weekStart);
                dayDate.setDate(dayDate.getDate() + idx);
                const isToday = weeksBetween(getWeekStart(new Date()), weekStart) === 0 && day === ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
                return (
                  <div key={`h-${day}`} className={`flex-1 min-w-[140px] text-center text-xs font-semibold py-2 border-b border-l border-slate-100 ${isToday ? "text-[#9E1B32] border-[#9E1B32]/30 bg-[#9E1B32]/5" : "text-slate-700 border-slate-100"}`}>
                    <div>{day}</div>
                    <div className="text-[10px] font-normal text-slate-400">{dayDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                  </div>
                );
              })}
            </div>
            {/* Grid body: time gutter + day columns share the same top origin */}
            <div className="flex">
              {/* Time gutter */}
              <div className="w-12 shrink-0 relative" style={{ height: GRID_HEIGHT }}>
                {HOURS.map((m) => (
                  <div key={m} className="absolute left-0 right-0 text-[10px] text-slate-400 -translate-y-1/2 text-right pr-1" style={{ top: (m - DAY_START_MIN) * PX_PER_MIN }}>
                    {fmtTime(mmToHHMM(m))}
                  </div>
                ))}
              </div>
              {/* Day columns */}
              {DAYS.map((day, idx) => {
                const blocks = byDay(day);
                const layout = layoutBlocks(blocks);
                return (
                  <div key={day} className="flex-1 min-w-[140px] border-l border-slate-100">
                    <div
                      ref={(el) => (gridRefs.current[day] = el)}
                      onClick={(e) => handleGridClick(day, e)}
                      className="relative cursor-cell"
                      style={{
                        height: GRID_HEIGHT,
                        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_HOUR - 1}px, #eef2f7 ${PX_PER_HOUR - 1}px, #eef2f7 ${PX_PER_HOUR}px)`,
                      }}
                    >
                    {schoolStart != null && schoolStart > DAY_START_MIN && (
                      <div className="absolute left-0 right-0 z-0 pointer-events-none bg-slate-100/70" style={{ top: 0, height: (schoolStart - DAY_START_MIN) * PX_PER_MIN }} />
                    )}
                    {schoolEnd != null && schoolEnd < DAY_END_MIN && (
                      <div className="absolute left-0 right-0 z-0 pointer-events-none bg-slate-100/70" style={{ top: (schoolEnd - DAY_START_MIN) * PX_PER_MIN, bottom: 0 }} />
                    )}
                    {bands.map((b, i) => {
                      const top = (b.start - DAY_START_MIN) * PX_PER_MIN;
                      const height = (b.end - b.start) * PX_PER_MIN;
                      const palette = {
                        homeroom: { bg: "rgba(99,102,241,0.10)", dash: "rgba(99,102,241,0.35)", text: "text-indigo-600/70" },
                        break: { bg: "rgba(245,158,11,0.10)", dash: "rgba(245,158,11,0.35)", text: "text-amber-600/70" },
                        lunch: { bg: "rgba(16,185,129,0.10)", dash: "rgba(16,185,129,0.35)", text: "text-emerald-600/70" },
                      }[b.kind];
                      return (
                        <div
                          key={`band-${i}`}
                          className="absolute left-0 right-0 z-0 pointer-events-none flex items-center justify-center"
                          style={{
                            top,
                            height,
                            backgroundColor: palette.bg,
                            borderTop: `1px dashed ${palette.dash}`,
                            borderBottom: `1px dashed ${palette.dash}`,
                          }}
                        >
                          <span className={`text-[10px] font-semibold ${palette.text}`}>{b.label}</span>
                        </div>
                      );
                    })}
                    {blocks.map((s) => {
                      const lay = layout[s.id] || { col: 0, count: 1 };
                      const top = (s._startMin - DAY_START_MIN) * PX_PER_MIN;
                      const height = Math.max(20, (s._endMin - s._startMin) * PX_PER_MIN - 2);
                      const widthPct = 100 / lay.count;
                      const cls = cm.classes.find((c) => c.id === s.class_id);
                      const bg = resolveSubjectColor(cls?.subject);
                      return (
                        <button
                          key={s.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, schedule: s, dayIndex: idx }); }}
                          className="absolute rounded-lg p-1.5 text-left text-white text-[10px] leading-tight overflow-hidden hover:ring-2 hover:ring-white transition-shadow"
                          style={{
                            top,
                            height,
                            left: `calc(${lay.col * widthPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            backgroundColor: bg,
                          }}
                          title={`${s.class_name} · ${fmtTime(s.start_time)}–${fmtTime(s.end_time)}${s.teacher_name ? ` · ${s.teacher_name}` : ""}`}
                        >
                          <p className="font-semibold truncate">{s.class_name}</p>
                          <p className="opacity-90 truncate">{fmtTime(s.start_time)}–{fmtTime(s.end_time)}</p>
                          {!teacherFilter && <p className="opacity-80 truncate">{s.teacher_name}</p>}
                          {s.room && height > 56 && <p className="opacity-75 truncate flex items-center gap-0.5"><MapPin className="w-2 h-2" />{s.room}</p>}
                        </button>
                      );
                    })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {schedules.length > 0 && byDay("Monday").length === 0 && byDay("Tuesday").length === 0 && byDay("Wednesday").length === 0 && byDay("Thursday").length === 0 && byDay("Friday").length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-4">No classes fall within 7 AM–4 PM. Use “Schedule Class” to add one.</p>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Scheduled Class" : "Schedule a Class"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Class</Label>
              <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="">Select class…</option>
                {activeClasses.map((c) => <option key={c.id} value={c.id}>{c.class_name}{c.subject ? ` · ${c.subject}` : ""}{c.grade_level ? ` · Gr ${c.grade_level}` : ""}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Teacher</Label>
              <select required value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="">Select teacher…</option>
                {activeTeachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}{t.subject ? ` · ${t.subject}` : ""}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700">{timetable?.scheduling_model === "traditional" ? "Meeting days" : timetable?.scheduling_model === "rotating_block" ? "Cycle day" : "Day"}</Label>
                {timetable?.scheduling_model === "traditional" ? <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Every selected school day</div> : <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  {scheduleDays.map((d) => <option key={d} value={d}>{timetable?.scheduling_model === "rotating_block" ? `${d} Day` : d}</option>)}
                </select>}
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Start</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">End</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Room (optional)</Label>
              <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. 204" className="mt-1" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.locked} onChange={(event) => setForm({ ...form, locked: event.target.checked })} /> Lock this slot against auto-scheduling</label>
            <div>
              <Label className="text-sm font-medium text-slate-700">Repeat</Label>
              <select value={form.recurrence_type} onChange={(e) => setForm({ ...form, recurrence_type: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="weekly">Every week</option>
                <option value="biweekly">Every 2 weeks</option>
                {timetable?.scheduling_model === "rotating_block" && <option value="cycle">Every matching cycle day</option>}
                <option value="none">This week only</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">The schedule starts in the week of {weekStart.toLocaleDateString()} and repeats from there.</p>
            </div>
            {formError && (
              <p className="text-sm text-rose-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{formError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              {editing && (
                <Button type="button" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => { handleDelete(editing); setShowForm(false); }}>
                  <Trash2 className="w-4 h-4 mr-1" /> Remove
                </Button>
              )}
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">{editing ? "Save Changes" : "Schedule"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {contextMenu && <div className="fixed z-[60] w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-xl" style={{ left: contextMenu.x, top: contextMenu.y }}><button className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100" onClick={() => openLessonPlan(contextMenu.schedule, contextMenu.dayIndex)}>Complete lesson plan</button></div>}
      <LessonPlanDialog open={!!lessonContext} onOpenChange={(open) => { if (!open) setLessonContext(null); }} context={lessonContext} />

      <TeacherWorkload teachers={activeTeachers} schedules={schedules} timetable={timetable} callerCreds={callerCreds} />

      <DetentionAssignmentDialog open={showDetention} onOpenChange={setShowDetention} schoolCode={cm.schoolCode} schoolName={cm.schoolName} teachers={activeTeachers} startDate={weekStart.toISOString().slice(0, 10)} onSaved={() => { load(); cm.loadData(); }} />

      <SchoolHoursDialog
        open={showHours}
        onOpenChange={setShowHours}
        schoolCode={cm.schoolCode}
        grades={gradeLevels}
        onSaved={(payload) => setTimetable({ ...timetable, ...payload, school_code: cm.schoolCode })}
      />
    </div>
  );
}