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
import TeacherWorkload from "@/components/schedule/TeacherWorkload";
import { getWeekStart, addWeeks, isScheduleActiveInWeek, formatWeekRange, weeksBetween, gradeColor } from "@/lib/scheduleWeeks";

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
  const { canManageStaff } = useSchool();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherFilter, setTeacherFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ class_id: "", teacher_id: "", day_of_week: "Monday", start_time: "08:00", end_time: "09:00", room: "", recurrence_type: "weekly" });
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [timetable, setTimetable] = useState(null);
  const [showHours, setShowHours] = useState(false);
  const gridRefs = useRef({});

  const load = useCallback(async () => {
    if (!cm.schoolCode) return;
    setLoading(true);
    try {
      const res = await base44.entities.ClassSchedule.filter({ school_code: cm.schoolCode }, "start_time", 500);
      setSchedules(res);
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
    ? { start: toMin(timetable.break_start), end: toMin(timetable.break_end), label: "Break" }
    : null;
  const lunchBand = timetable?.lunch_start && timetable?.lunch_end
    ? { start: toMin(timetable.lunch_start), end: toMin(timetable.lunch_end), label: "Lunch" }
    : null;
  const bands = [breakBand, lunchBand].filter(Boolean);

  const activeTeachers = cm.teachers.filter((t) => t.role === "teacher" || t.role === "manager");
  const activeClasses = cm.classes.filter((c) => c.status === "active");

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
      recurrence_type: "weekly",
      ...overrides,
    });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setFormError("");
    setForm({ class_id: s.class_id, teacher_id: s.teacher_id, day_of_week: s.day_of_week, start_time: s.start_time || "08:00", end_time: s.end_time || "09:00", room: s.room || "", recurrence_type: s.recurrence_type || "weekly" });
    setShowForm(true);
  };

  const hasConflict = (teacherId, day, start, end, excludeId) => {
    const sMin = toMin(start);
    const eMin = toMin(end);
    return schedules.some((s) =>
      s.teacher_id === teacherId &&
      s.day_of_week === day &&
      s.id !== excludeId &&
      sMin < toMin(s.end_time) &&
      eMin > toMin(s.start_time)
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.class_id || !form.teacher_id) { setFormError("Select a class and a teacher."); return; }
    if (toMin(form.end_time) <= toMin(form.start_time)) { setFormError("End time must be after start time."); return; }
    if (hasConflict(form.teacher_id, form.day_of_week, form.start_time, form.end_time, editing?.id)) {
      setFormError("That teacher already has a class overlapping this time on " + form.day_of_week + ".");
      return;
    }
    const cls = cm.classes.find((c) => c.id === form.class_id);
    const teacher = cm.teachers.find((t) => t.id === form.teacher_id);
    const payload = {
      class_id: form.class_id,
      class_name: cls?.class_name || "",
      school_code: cm.schoolCode,
      teacher_id: form.teacher_id,
      teacher_name: teacher?.full_name || "",
      room: form.room,
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      recurrence_type: form.recurrence_type || "weekly",
      recurrence_weeks: form.recurrence_type === "biweekly" ? 2 : 1,
      start_date: weekStart.toISOString().slice(0, 10),
    };
    if (editing) {
      await base44.entities.ClassSchedule.update(editing.id, payload);
    } else {
      await base44.entities.ClassSchedule.create(payload);
      const exists = cm.teacherAssignments.find((ta) => ta.teacher_id === form.teacher_id && ta.class_id === form.class_id);
      if (!exists && teacher) {
        await base44.entities.TeacherClass.create({ teacher_id: form.teacher_id, teacher_name: teacher.full_name || "", class_id: form.class_id, role: "Primary Teacher", school_code: cm.schoolCode });
      }
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

  const handleGridClick = (day, e) => {
    const el = gridRefs.current[day];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let min = DAY_START_MIN + Math.round(offsetY / PX_PER_MIN);
    min = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN - 30, min));
    min = Math.round(min / 15) * 15; // snap to 15 min
    openCreate({ day_of_week: day, start_time: mmToHHMM(min), end_time: mmToHHMM(Math.min(DAY_END_MIN, min + 60)) });
  };

  const filtered = useMemo(() => schedules.filter((s) => !teacherFilter || s.teacher_id === teacherFilter), [schedules, teacherFilter]);
  const byDay = (day) => filtered
    .filter((s) => s.day_of_week === day && isScheduleActiveInWeek(s, weekStart))
    .map((s) => ({ ...s, _startMin: toMin(s.start_time), _endMin: toMin(s.end_time) }))
    .filter((s) => s._startMin >= DAY_START_MIN && s._endMin <= DAY_END_MIN);

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
            <option value="">All teachers</option>
            {activeTeachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <Button variant="outline" onClick={() => setShowHours(true)}>
            <Clock className="w-4 h-4 mr-1" /> School Hours
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
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 overflow-x-auto">
          <div className="flex min-w-[760px]">
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
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + idx);
              const isToday = weeksBetween(getWeekStart(new Date()), weekStart) === 0 && day === ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
              return (
                <div key={day} className="flex-1 min-w-[140px] border-l border-slate-100">
                  <div className={`text-center text-xs font-semibold py-2 border-b ${isToday ? "text-[#9E1B32] border-[#9E1B32]/30 bg-[#9E1B32]/5" : "text-slate-700 border-slate-100"}`}>
                    <div>{day}</div>
                    <div className="text-[10px] font-normal text-slate-400">{dayDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                  </div>
                  <div
                    ref={(el) => (gridRefs.current[day] = el)}
                    onClick={(e) => handleGridClick(day, e)}
                    className="relative cursor-cell"
                    style={{
                      height: GRID_HEIGHT,
                      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_HOUR - 1}px, #eef2f7 ${PX_PER_HOUR - 1}px, #eef2f7 ${PX_PER_HOUR}px)`,
                    }}
                  >
                    {bands.map((b, i) => {
                      const top = (b.start - DAY_START_MIN) * PX_PER_MIN;
                      const height = (b.end - b.start) * PX_PER_MIN;
                      const isLunch = b.label === "Lunch";
                      return (
                        <div
                          key={`band-${i}`}
                          className="absolute left-0 right-0 z-0 pointer-events-none flex items-center justify-center"
                          style={{
                            top,
                            height,
                            backgroundColor: isLunch ? "rgba(16,185,129,0.10)" : "rgba(245,158,11,0.10)",
                            borderTop: `1px dashed ${isLunch ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.35)"}`,
                            borderBottom: `1px dashed ${isLunch ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.35)"}`,
                          }}
                        >
                          <span className={`text-[10px] font-semibold ${isLunch ? "text-emerald-600/70" : "text-amber-600/70"}`}>{b.label}</span>
                        </div>
                      );
                    })}
                    {blocks.map((s) => {
                      const lay = layout[s.id] || { col: 0, count: 1 };
                      const top = (s._startMin - DAY_START_MIN) * PX_PER_MIN;
                      const height = Math.max(20, (s._endMin - s._startMin) * PX_PER_MIN - 2);
                      const widthPct = 100 / lay.count;
                      const cls = cm.classes.find((c) => c.id === s.class_id);
                      const bg = gradeColor(cls?.grade_level);
                      return (
                        <button
                          key={s.id}
                          onClick={(e) => { e.stopPropagation(); openEdit(s); }}
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
                <Label className="text-sm font-medium text-slate-700">Day</Label>
                <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
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
            <div>
              <Label className="text-sm font-medium text-slate-700">Repeat</Label>
              <select value={form.recurrence_type} onChange={(e) => setForm({ ...form, recurrence_type: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="weekly">Every week</option>
                <option value="biweekly">Every 2 weeks</option>
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

      <TeacherWorkload teachers={activeTeachers} schedules={schedules} timetable={timetable} />

      <SchoolHoursDialog
        open={showHours}
        onOpenChange={setShowHours}
        schoolCode={cm.schoolCode}
        onSaved={(payload) => setTimetable({ ...timetable, ...payload, school_code: cm.schoolCode })}
      />
    </div>
  );
}