import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, CalendarClock, Clock, MapPin, User } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function ScheduleTab({ school, user }) {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    class_id: "", teacher_id: "", room: "", day_of_week: "Monday",
    start_time: "08:00", end_time: "09:00", recurrence_type: "none", recurrence_weeks: 1, start_date: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sched, cls] = await Promise.all([
        base44.entities.ClassSchedule.filter({ school_code: school.school_code }, "start_time", 1000),
        base44.entities.Class.filter({ school_code: school.school_code }, "class_name", 500),
      ]);
      setSchedules(sched);
      setClasses(cls);
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "list", system_code: user.system_code, school_code: user.school_code,
      });
      if (res.data.success) setTeachers(res.data.teachers);
    } finally { setLoading(false); }
  }, [school, user]);

  useEffect(() => { load(); }, [load]);

  const teacherName = (id) => {
    const t = teachers.find((x) => x.id === id);
    return t?.full_name || t?.username || "—";
  };
  const className = (id) => classes.find((c) => c.id === id)?.class_name || "—";

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cls = classes.find((c) => c.id === form.class_id);
      const t = teachers.find((x) => x.id === form.teacher_id);
      await base44.entities.ClassSchedule.create({
        class_id: form.class_id,
        class_name: cls?.class_name || "",
        school_code: school.school_code,
        teacher_id: form.teacher_id,
        teacher_name: t?.full_name || t?.username || "",
        room: form.room,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        recurrence_type: form.recurrence_type,
        recurrence_weeks: Number(form.recurrence_weeks) || 1,
        start_date: form.start_date || undefined,
      });
      setForm({ class_id: "", teacher_id: "", room: "", day_of_week: "Monday", start_time: "08:00", end_time: "09:00", recurrence_type: "none", recurrence_weeks: 1, start_date: "" });
      setShowForm(false);
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this schedule slot?")) return;
    await base44.entities.ClassSchedule.delete(id);
    await load();
  };

  const recurrenceLabel = (s) => {
    if (s.recurrence_type === "none") return "One-off";
    if (s.recurrence_type === "weekly") return `Weekly × ${s.recurrence_weeks}`;
    return `Every 2 wks × ${s.recurrence_weeks}`;
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Weekly Schedule</h2>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} size="sm" className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-1" /> Schedule a Class
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-5 rounded-2xl border border-slate-200 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Class *</Label>
              <select required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value="">Select class...</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Teacher *</Label>
              <select required value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value="">Select teacher...</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.username}</option>)}
              </select>
            </div>
            <div><Label className="text-xs text-slate-500">Room</Label><Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></div>
            <div>
              <Label className="text-xs text-slate-500">Day *</Label>
              <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div><Label className="text-xs text-slate-500">Start Time *</Label><Input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label className="text-xs text-slate-500">End Time *</Label><Input type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            <div>
              <Label className="text-xs text-slate-500">Repeat</Label>
              <select value={form.recurrence_type} onChange={(e) => setForm({ ...form, recurrence_type: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                <option value="none">No repeat (manual)</option>
                <option value="weekly">Every week</option>
                <option value="biweekly">Every 2 weeks</option>
              </select>
            </div>
            <div><Label className="text-xs text-slate-500">For (weeks)</Label><Input type="number" min="1" value={form.recurrence_weeks} onChange={(e) => setForm({ ...form, recurrence_weeks: e.target.value })} disabled={form.recurrence_type === "none"} /></div>
            <div><Label className="text-xs text-slate-500">Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          </div>
          <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 mt-4">
            {saving ? "Saving..." : "Add to Schedule"}
          </Button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {DAYS.map((day) => {
            const daySlots = schedules.filter((s) => s.day_of_week === day).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200 p-3 min-h-[200px]">
                <h3 className="font-semibold text-slate-900 text-sm mb-3 pb-2 border-b border-slate-100">{day}</h3>
                {daySlots.length === 0 ? (
                  <p className="text-xs text-slate-300 text-center py-8">No classes</p>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map((s) => (
                      <Card key={s.id} className="p-3 border-slate-200 bg-slate-50 rounded-xl">
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-slate-900 text-sm">{className(s.class_id)}</p>
                          <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500"><Clock className="w-3 h-3" /> {s.start_time}–{s.end_time}</div>
                        {s.teacher_name && <div className="flex items-center gap-1.5 text-xs text-slate-500"><User className="w-3 h-3" /> {s.teacher_name}</div>}
                        {s.room && <div className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="w-3 h-3" /> {s.room}</div>}
                        <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">{recurrenceLabel(s)}</span>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}