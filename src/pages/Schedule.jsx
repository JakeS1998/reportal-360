import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useClassManagement } from "@/lib/useClassManagement";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Clock, Trash2, Edit2, CalendarDays, MapPin, User, BookOpen } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const CRIMSON = "#9E1B32";

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

export default function Schedule() {
  const cm = useClassManagement();
  const { canManageStaff } = useSchool();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherFilter, setTeacherFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ class_id: "", teacher_id: "", day_of_week: "Monday", start_time: "08:00", end_time: "09:00", room: "" });

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

  useEffect(() => { load(); }, [load]);

  const activeTeachers = cm.teachers.filter((t) => t.role === "teacher" || t.role === "manager");
  const activeClasses = cm.classes.filter((c) => c.status === "active");

  const openCreate = (day) => {
    setEditing(null);
    setForm({ class_id: activeClasses[0]?.id || "", teacher_id: "", day_of_week: day || "Monday", start_time: "08:00", end_time: "09:00", room: "" });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ class_id: s.class_id, teacher_id: s.teacher_id, day_of_week: s.day_of_week, start_time: s.start_time || "08:00", end_time: s.end_time || "09:00", room: s.room || "" });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.class_id || !form.teacher_id) return;
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
      recurrence_type: "weekly",
      recurrence_weeks: 1,
      start_date: new Date().toISOString().slice(0, 10),
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

  const filtered = useMemo(() => schedules.filter((s) => !teacherFilter || s.teacher_id === teacherFilter), [schedules, teacherFilter]);
  const byDay = (day) => filtered.filter((s) => s.day_of_week === day).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

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
          <p className="text-sm text-slate-500">Schedule classes to teachers by day and time — assignments happen here, not at class creation.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
            <option value="">All teachers</option>
            {activeTeachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <Button onClick={() => openCreate("Monday")} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-1" /> Schedule Class
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-xl bg-slate-100 h-64" />
      ) : activeClasses.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Create a class first, then schedule it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {DAYS.map((day) => (
            <div key={day} className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col min-h-[200px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-900">{day}</h3>
                <button onClick={() => openCreate(day)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title={`Add to ${day}`}><Plus className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2 flex-1">
                {byDay(day).length === 0 ? (
                  <p className="text-xs text-slate-300 text-center py-8">No classes</p>
                ) : byDay(day).map((s) => (
                  <div key={s.id} className="group rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:border-slate-200 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{s.class_name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><User className="w-3 h-3" />{s.teacher_name || "—"}</p>
                        {s.room && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />Room {s.room}</p>}
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(s)} className="p-1 rounded text-slate-400 hover:bg-white hover:text-slate-600" title="Edit"><Edit2 className="w-3 h-3" /></button>
                        <button onClick={() => handleDelete(s)} className="p-1 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Remove"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">{editing ? "Save Changes" : "Schedule"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}