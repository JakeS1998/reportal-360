import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useClassManagement } from "@/lib/useClassManagement";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/SectionCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Home, Users, AlertTriangle, DoorOpen } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Homeroom() {
  const cm = useClassManagement();
  const { canManageStaff } = useSchool();

  const [homerooms, setHomerooms] = useState([]);
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ homeroom_name: "", teacher_id: "", room: "", grade_level: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoResult, setAutoResult] = useState(null);

  const load = useCallback(async () => {
    if (!cm.schoolCode) return;
    setLoading(true);
    try {
      const [hrRes, ttRes] = await Promise.all([
        base44.entities.Homeroom.filter({ school_code: cm.schoolCode }, "homeroom_name", 200),
        base44.entities.SchoolTimetable.filter({ school_code: cm.schoolCode }, undefined, 5),
      ]);
      setHomerooms(hrRes);
      setTimetable(ttRes[0] || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cm.schoolCode]);

  useEffect(() => { load(); }, [load]);

  const activeTeachers = cm.teachers.filter((t) => (t.role === "teacher" || t.role === "manager") && t.active !== false);
  const assignedTeacherIds = new Set(homerooms.map((h) => h.teacher_id).filter(Boolean));

  const studentAssignment = useMemo(() => {
    const map = {}; // student_id -> homeroom_id
    homerooms.forEach((h) => (h.student_ids || []).forEach((sid) => { map[sid] = h.id; }));
    return map;
  }, [homerooms]);

  const homeroomTime = timetable?.homeroom_start && timetable?.homeroom_end
    ? `${fmt(timetable.homeroom_start)} – ${fmt(timetable.homeroom_end)}`
    : null;

  const openCreate = () => {
    setEditing(null);
    setError("");
    setForm({ homeroom_name: "", teacher_id: "", room: "", grade_level: "" });
    setShowForm(true);
  };
  const openEdit = (h) => {
    setEditing(h);
    setError("");
    setForm({ homeroom_name: h.homeroom_name || "", teacher_id: h.teacher_id || "", room: h.room || "", grade_level: h.grade_level || "" });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!homeroomTime) { setError("Set homeroom hours in the Weekly Schedule page first."); return; }
    if (!form.homeroom_name) { setError("Homeroom name is required."); return; }
    if (!form.teacher_id) { setError("Assign a teacher to this homeroom."); return; }
    // 1 teacher per homeroom — prevent duplicate assignment
    const conflict = homerooms.find((h) => h.teacher_id === form.teacher_id && h.id !== editing?.id);
    if (conflict) { setError(`${conflict.teacher_name} already leads ${conflict.homeroom_name}.`); return; }

    setSaving(true);
    setError("");
    try {
      const teacher = activeTeachers.find((t) => t.id === form.teacher_id);
      const teacherName = teacher?.full_name || "";
      const room = form.room || teacher?.room || "";
      if (editing) {
        await base44.entities.Homeroom.update(editing.id, {
          homeroom_name: form.homeroom_name, teacher_id: form.teacher_id, teacher_name: teacherName,
          room, grade_level: form.grade_level,
        });
        if (editing.class_id) {
          await base44.entities.Class.update(editing.class_id, {
            class_name: form.homeroom_name, teacher_name: teacherName, room, grade_level: form.grade_level,
          });
          // refresh the linked class's daily schedule (time/teacher/room)
          const slots = await base44.entities.ClassSchedule.filter({ class_id: editing.class_id }, undefined, 50);
          const present = new Set(slots.map((s) => s.day_of_week));
          for (const day of DAYS) {
            if (present.has(day)) {
              const s = slots.find((x) => x.day_of_week === day);
              await base44.entities.ClassSchedule.update(s.id, {
                teacher_id: form.teacher_id, teacher_name: teacherName, room,
                start_time: timetable.homeroom_start, end_time: timetable.homeroom_end,
              });
            } else {
              await base44.entities.ClassSchedule.create({
                class_id: editing.class_id, class_name: form.homeroom_name, school_code: cm.schoolCode,
                teacher_id: form.teacher_id, teacher_name: teacherName, room, day_of_week: day,
                start_time: timetable.homeroom_start, end_time: timetable.homeroom_end,
                recurrence_type: "weekly", recurrence_weeks: 1, start_date: new Date().toISOString().slice(0, 10),
              });
            }
          }
          // sync teacher assignment
          const tc = cm.teacherAssignments.find((ta) => ta.class_id === editing.class_id);
          if (tc) await base44.entities.TeacherClass.update(tc.id, { teacher_id: form.teacher_id, teacher_name: teacherName });
          else await base44.entities.TeacherClass.create({ teacher_id: form.teacher_id, teacher_name: teacherName, class_id: editing.class_id, role: "Primary Teacher", school_code: cm.schoolCode });
        }
      } else {
        const cls = await base44.entities.Class.create({
          class_name: form.homeroom_name, school_code: cm.schoolCode, school_name: cm.schoolName,
          subject: "Homeroom", grade_level: form.grade_level, room, status: "active",
          sessions_per_week: 5, academic_year_id: cm.currentYear?.id || "", teacher_name: teacherName,
        });
        await base44.entities.TeacherClass.create({ teacher_id: form.teacher_id, teacher_name: teacherName, class_id: cls.id, role: "Primary Teacher", school_code: cm.schoolCode });
        for (const day of DAYS) {
          await base44.entities.ClassSchedule.create({
            class_id: cls.id, class_name: form.homeroom_name, school_code: cm.schoolCode,
            teacher_id: form.teacher_id, teacher_name: teacherName, room, day_of_week: day,
            start_time: timetable.homeroom_start, end_time: timetable.homeroom_end,
            recurrence_type: "weekly", recurrence_weeks: 1, start_date: new Date().toISOString().slice(0, 10),
          });
        }
        await base44.entities.Homeroom.create({
          school_code: cm.schoolCode, homeroom_name: form.homeroom_name, teacher_id: form.teacher_id,
          teacher_name: teacherName, room, grade_level: form.grade_level, class_id: cls.id, student_ids: [],
        });
      }
      setShowForm(false);
      setEditing(null);
      load();
      cm.loadData();
    } catch (err) {
      setError(err.message || "Failed to save homeroom");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (h) => {
    if (!confirm(`Delete ${h.homeroom_name}? This removes its daily homeroom class and teacher assignment.`)) return;
    try {
      if (h.class_id) {
        await base44.entities.ClassSchedule.deleteMany({ class_id: h.class_id });
        await base44.entities.TeacherClass.deleteMany({ class_id: h.class_id });
        await base44.entities.Class.delete(h.class_id);
      }
      await base44.entities.Homeroom.delete(h.id);
      load();
      cm.loadData();
    } catch (err) {
      alert(err.message || "Failed to delete homeroom");
    }
  };

  const assignStudent = async (studentId, homeroomId) => {
    const current = studentAssignment[studentId];
    if (current === homeroomId) return;
    const updates = [];
    if (current) {
      const h = homerooms.find((x) => x.id === current);
      if (h) updates.push(base44.entities.Homeroom.update(h.id, { student_ids: (h.student_ids || []).filter((s) => s !== studentId) }));
    }
    if (homeroomId) {
      const h = homerooms.find((x) => x.id === homeroomId);
      if (h) updates.push(base44.entities.Homeroom.update(h.id, { student_ids: [...(h.student_ids || []), studentId] }));
    }
    if (updates.length) { await Promise.all(updates); load(); }
  };

  // Auto-assign unassigned students to homerooms, matching by grade and
  // balancing counts across homerooms of the same grade.
  const autoAssignHomerooms = async () => {
    if (homerooms.length === 0) { setAutoResult({ error: "Create at least one homeroom first." }); return; }
    if (!confirm("Auto-assign students to homerooms by grade, balancing counts? Already-assigned students stay where they are.")) return;
    setAutoRunning(true);
    setAutoResult(null);
    try {
      const counts = {};
      homerooms.forEach((h) => { counts[h.id] = (h.student_ids || []).length; });
      const byGrade = {};
      homerooms.forEach((h) => { const g = h.grade_level || ""; (byGrade[g] ||= []).push(h); });
      const assignedSet = new Set();
      homerooms.forEach((h) => (h.student_ids || []).forEach((sid) => assignedSet.add(sid)));

      const updates = {}; // homeroomId -> new student_ids array (seeded from existing)
      homerooms.forEach((h) => { updates[h.id] = null; }); // lazy
      let placed = 0;
      let noMatch = 0;
      for (const s of cm.students) {
        if (assignedSet.has(s.id)) continue;
        if (s.status && s.status !== "active") continue;
        const g = s.grade_level || "";
        const list = byGrade[g];
        if (!list || list.length === 0) { noMatch++; continue; }
        list.sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0));
        const target = list[0];
        if (updates[target.id] === null) updates[target.id] = [...(target.student_ids || [])];
        updates[target.id].push(s.id);
        counts[target.id] = (counts[target.id] || 0) + 1;
        assignedSet.add(s.id);
        placed++;
      }
      const toWrite = Object.entries(updates).filter(([, v]) => v !== null);
      if (toWrite.length) await Promise.all(toWrite.map(([id, ids]) => base44.entities.Homeroom.update(id, { student_ids: ids })));
      setAutoResult({ placed, noMatch, total: cm.students.length });
      load();
    } catch (err) {
      setAutoResult({ error: err.message || "Failed to auto-assign homerooms" });
    } finally {
      setAutoRunning(false);
    }
  };

  if (!canManageStaff) {
    return <div className="flex items-center justify-center py-20 text-slate-400">You do not have access to this page.</div>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse rounded-xl bg-slate-100 h-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-xl bg-slate-100 h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Home className="w-5 h-5 text-slate-500" /> Homerooms</h2>
          <p className="text-sm text-slate-500">
            {homerooms.length} homeroom{homerooms.length === 1 ? "" : "s"} at {cm.schoolName}
            {homeroomTime ? ` · meets daily ${homeroomTime}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={autoAssignHomerooms} disabled={autoRunning} variant="outline" className="border-slate-200">
            <Users className="w-4 h-4 mr-1" /> {autoRunning ? "Assigning…" : "Auto Assign"}
          </Button>
          <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-4 h-4 mr-1" /> New Homeroom</Button>
        </div>
      </div>

      {!homeroomTime && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> No homeroom hours configured. Set them in the Weekly Schedule page (School Hours) before creating homerooms.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {homerooms.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <Home className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No homerooms yet. Create one to assign a teacher and students.</p>
          </div>
        ) : homerooms.map((h) => {
          const count = (h.student_ids || []).length;
          return (
            <div key={h.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{h.homeroom_name}</h3>
                  <p className="text-xs text-slate-500">{h.teacher_name || "No teacher"}{h.grade_level ? ` · Grade ${h.grade_level}` : ""}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(h)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100">Edit</button>
                  <button onClick={() => handleDelete(h)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                <DoorOpen className="w-3.5 h-3.5 text-slate-400" /> {h.room || "—"}
                <span className="text-slate-300">·</span>
                <Users className="w-3.5 h-3.5 text-slate-400" /> {count} student{count === 1 ? "" : "s"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Student assignment */}
      <SectionCard title="Assign Students to Homerooms" subtitle={`${cm.students.length} students · 1 homeroom per student`} icon={Users}>
        {cm.students.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No students enrolled.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {cm.students.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                  {(s.student_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.student_name}</p>
                  <p className="text-[11px] text-slate-400">Grade {s.grade_level || "—"}</p>
                </div>
                <select
                  value={studentAssignment[s.id] || ""}
                  onChange={(e) => assignStudent(s.id, e.target.value || null)}
                  className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 max-w-[220px]"
                >
                  <option value="">Unassigned</option>
                  {homerooms.map((h) => <option key={h.id} value={h.id}>{h.homeroom_name}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Homeroom" : "New Homeroom"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Homeroom Name</Label>
              <Input required value={form.homeroom_name} onChange={(e) => setForm({ ...form, homeroom_name: e.target.value })} placeholder="e.g. Homeroom 4A" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Teacher (1 per homeroom)</Label>
              <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="">Select a teacher…</option>
                {activeTeachers.map((t) => {
                  const taken = assignedTeacherIds.has(t.id) && t.id !== form.teacher_id;
                  return <option key={t.id} value={t.id} disabled={taken}>{t.full_name}{t.subject ? ` · ${t.subject}` : ""}{taken ? " (assigned)" : ""}</option>;
                })}
              </select>
              <p className="text-xs text-slate-400 mt-1">Each teacher leads one homeroom. The homeroom class meets every day {homeroomTime || "(set homeroom hours first)"}.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700">Room</Label>
                <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Auto from teacher" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Grade</Label>
                <Input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} placeholder="e.g. 4" className="mt-1" />
              </div>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? "Saving…" : editing ? "Save Changes" : "Create Homeroom"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Auto-Assign Result */}
      <Dialog open={!!autoResult} onOpenChange={(v) => !v && setAutoResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Auto-Assign Homerooms Result</DialogTitle>
          </DialogHeader>
          {autoResult?.error ? (
            <p className="text-sm text-rose-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{autoResult.error}</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-2xl font-bold text-emerald-600">{autoResult?.placed || 0}</p>
                  <p className="text-xs text-slate-500">Students assigned</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-2xl font-bold text-amber-600">{autoResult?.noMatch || 0}</p>
                  <p className="text-xs text-slate-500">No matching homeroom</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {autoResult?.placed > 0
                  ? `Distributed ${autoResult.placed} unassigned student${autoResult.placed === 1 ? "" : "s"} across homerooms by grade, balancing counts.`
                  : "Every student is already in a homeroom (or none match an existing homeroom's grade)."}
                {autoResult?.noMatch > 0 && ` ${autoResult.noMatch} student${autoResult.noMatch === 1 ? "" : "s"} had no homeroom for their grade.`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setAutoResult(null)} className="bg-slate-900 hover:bg-slate-800">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function fmt(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  return `${hh % 12 || 12}:${m} ${ampm}`;
}