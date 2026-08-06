import React, { useState, useMemo } from "react";
import { useClassManagement } from "@/lib/useClassManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/SectionCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Edit2, Copy, Archive, Trash2, BookOpen, Users } from "lucide-react";

const STATUS_BADGE = { active: "bg-emerald-50 text-emerald-600", archived: "bg-slate-100 text-slate-500", draft: "bg-amber-50 text-amber-600" };
const ROLE_BADGE = { "Primary Teacher": "bg-blue-50 text-blue-600", "Assistant Teacher": "bg-slate-100 text-slate-600", "Co-Teacher": "bg-indigo-50 text-indigo-600", Substitute: "bg-amber-50 text-amber-600" };

const EMPTY_FORM = { class_name: "", subject: "", grade_level: "", period: "", room: "", description: "", academic_year_id: "", status: "active" };

export default function ClassManagement() {
  const cm = useClassManagement();
  const [search, setSearch] = useState("");
  const [fGrade, setFGrade] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fYear, setFYear] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dupClass, setDupClass] = useState(null);
  const [dupYear, setDupYear] = useState("");

  const grades = useMemo(() => [...new Set(cm.classes.map((c) => c.grade_level).filter(Boolean))].sort(), [cm.classes]);
  const subjects = useMemo(() => [...new Set(cm.classes.map((c) => c.subject).filter(Boolean))].sort(), [cm.classes]);

  const filtered = useMemo(() => {
    return cm.classes.filter((c) => {
      if (search && !c.class_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (fGrade && c.grade_level !== fGrade) return false;
      if (fSubject && c.subject !== fSubject) return false;
      if (fYear && c.academic_year_id !== fYear) return false;
      return true;
    });
  }, [cm.classes, search, fGrade, fSubject, fYear]);

  const getTeachers = (classId) => cm.teacherAssignments.filter((ta) => ta.class_id === classId);
  const getStudentCount = (classId) => cm.studentAssignments.filter((sa) => sa.class_id === classId && sa.status === "active").length;
  const getYearName = (yearId) => cm.academicYears.find((y) => y.id === yearId)?.name || "—";

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, academic_year_id: cm.currentYear?.id || "" });
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (cls) => {
    setForm({ class_name: cls.class_name || "", subject: cls.subject || "", grade_level: cls.grade_level || "", period: cls.period || "", room: cls.room || "", description: cls.description || "", academic_year_id: cls.academic_year_id || "", status: cls.status || "active" });
    setEditing(cls);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) await cm.updateClass(editing.id, form);
    else await cm.createClass(form);
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (cls) => {
    if (!confirm(`Delete "${cls.class_name}"? This removes all teacher and student assignments.`)) return;
    await cm.deleteClass(cls.id);
  };

  const handleArchive = async (cls) => {
    await cm.updateClass(cls.id, { status: cls.status === "archived" ? "active" : "archived" });
  };

  const handleDuplicate = async () => {
    if (!dupClass || !dupYear) return;
    await cm.duplicateClass(dupClass, dupYear);
    setDupClass(null);
    setDupYear("");
  };

  if (cm.loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse rounded-xl bg-slate-100 h-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="animate-pulse rounded-xl bg-slate-100 h-44" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Classes</h2>
          <p className="text-sm text-slate-500">{filtered.length} class{filtered.length === 1 ? "" : "es"} at {cm.schoolName}</p>
        </div>
        <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-1" /> Create Class
        </Button>
      </div>

      {/* Stat Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Total Classes</p>
          <p className="text-2xl font-bold text-slate-900">{cm.classes.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{cm.classes.filter((c) => c.status === "active").length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Without Teachers</p>
          <p className="text-2xl font-bold text-amber-600">{cm.classes.filter((c) => !cm.teacherAssignments.find((ta) => ta.class_id === c.id)).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400">Unassigned Students</p>
          <p className="text-2xl font-bold text-slate-900">{cm.students.filter((s) => !cm.studentAssignments.find((sa) => sa.student_id === s.id && sa.status === "active")).length}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search classes…" className="pl-10" />
        </div>
        <select value={fGrade} onChange={(e) => setFGrade(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
          <option value="">All Grades</option>
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={fSubject} onChange={(e) => setFSubject(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
          <option value="">All Subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fYear} onChange={(e) => setFYear(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
          <option value="">All Years</option>
          {cm.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No classes found. Create your first class to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cls) => {
            const teachers = getTeachers(cls.id);
            const studentCount = getStudentCount(cls.id);
            return (
              <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{cls.class_name}</h3>
                    <p className="text-xs text-slate-500">{cls.subject || "—"} · Grade {cls.grade_level || "—"}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[cls.status] || ""}`}>{cls.status}</span>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{studentCount} student{studentCount === 1 ? "" : "s"}</span>
                    {cls.room && <><span className="text-slate-300">·</span><span>Room {cls.room}</span></>}
                    <span className="text-slate-300">·</span><span>{getYearName(cls.academic_year_id)}</span>
                  </div>
                  {teachers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {teachers.map((t) => (
                        <span key={t.id} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ROLE_BADGE[t.role] || "bg-slate-100"}`}>
                          {t.teacher_name} ({t.role})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-500">No teacher assigned</p>
                  )}
                  {cls.description && <p className="text-xs text-slate-400 line-clamp-2">{cls.description}</p>}
                </div>

                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100">
                  <button onClick={() => openEdit(cls)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setDupClass(cls); setDupYear(cm.currentYear?.id || ""); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleArchive(cls)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title={cls.status === "archived" ? "Unarchive" : "Archive"}><Archive className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(cls)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 ml-auto" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Class" : "Create Class"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Class Name</Label>
              <Input required value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} placeholder="e.g. Grade 4 Reading" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700">Subject</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Grade</Label>
                <Input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} placeholder="e.g. 5" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Period</Label>
                <Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">Room</Label>
                <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. 204" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Academic Year</Label>
              <select value={form.academic_year_id} onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="">—</option>
                {cm.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Description (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">{editing ? "Save Changes" : "Create Class"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={!!dupClass} onOpenChange={(v) => !v && setDupClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate "{dupClass?.class_name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Select the academic year to copy this class into:</p>
            <select value={dupYear} onChange={(e) => setDupYear(e.target.value)} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <option value="">Select year…</option>
              {cm.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDupClass(null)}>Cancel</Button>
              <Button onClick={handleDuplicate} disabled={!dupYear} className="bg-slate-900 hover:bg-slate-800">Duplicate</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}