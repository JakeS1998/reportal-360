import React, { useState, useMemo } from "react";
import { useClassManagement } from "@/lib/useClassManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserCheck, Plus, X, Search } from "lucide-react";

const ROLE_BADGE = { "Primary Teacher": "bg-blue-50 text-blue-600", "Assistant Teacher": "bg-slate-100 text-slate-600", "Co-Teacher": "bg-indigo-50 text-indigo-600", Substitute: "bg-amber-50 text-amber-600" };
const ROLES = ["Primary Teacher", "Assistant Teacher", "Co-Teacher", "Substitute"];

export default function TeacherAssignments() {
  const cm = useClassManagement();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignRole, setAssignRole] = useState("Primary Teacher");
  const [search, setSearch] = useState("");

  const activeClasses = useMemo(() => cm.classes.filter((c) => c.status !== "archived"), [cm.classes]);

  const selectedClass = cm.classes.find((c) => c.id === selectedClassId);
  const assignedTeachers = cm.teacherAssignments.filter((ta) => ta.class_id === selectedClassId);
  const assignedIds = new Set(assignedTeachers.map((t) => t.teacher_id));
  const availableTeachers = cm.teachers.filter((t) => {
    if (!(t.role === "teacher" || t.role === "manager") || assignedIds.has(t.id)) return false;
    if (selectedClass?.subject && t.subject && t.subject !== selectedClass.subject) return false;
    return true;
  });

  const filteredAvailable = search
    ? availableTeachers.filter((t) => t.full_name?.toLowerCase().includes(search.toLowerCase()))
    : availableTeachers;

  const handleAssign = async () => {
    if (!assignTeacherId || !selectedClassId) return;
    const teacher = cm.teachers.find((t) => t.id === assignTeacherId);
    await cm.assignTeacher(assignTeacherId, teacher?.full_name || "", selectedClassId, assignRole);
    setShowAssign(false);
    setAssignTeacherId("");
    setAssignRole("Primary Teacher");
    setSearch("");
  };

  const handleRemove = async (assignmentId, name) => {
    if (!confirm(`Remove ${name} from this class?`)) return;
    await cm.removeTeacher(assignmentId);
  };

  const handleChangeRole = async (assignmentId, newRole) => {
    const ta = cm.teacherAssignments.find((t) => t.id === assignmentId);
    if (ta) await cm.assignTeacher(ta.teacher_id, ta.teacher_name, ta.class_id, newRole);
  };

  if (cm.loading) return <div className="animate-pulse rounded-xl bg-slate-100 h-64" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Teacher Assignments</h2>
        <p className="text-sm text-slate-500">Assign teachers to classes and manage their roles</p>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Select Class</label>
        <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="mt-1 w-full md:w-96 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2">
          <option value="">Choose a class…</option>
          {activeClasses.map((c) => <option key={c.id} value={c.id}>{c.class_name} {c.subject ? `· ${c.subject}` : ""} {c.grade_level ? `· Gr ${c.grade_level}` : ""}</option>)}
        </select>
      </div>

      {selectedClass ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{selectedClass.class_name}</h3>
              <p className="text-xs text-slate-500">{selectedClass.subject || "—"} · Grade {selectedClass.grade_level || "—"} {selectedClass.room ? `· Room ${selectedClass.room}` : ""}</p>
            </div>
            <Button onClick={() => { setShowAssign(true); setSearch(""); }} disabled={availableTeachers.length === 0} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-1" /> Assign Teacher
            </Button>
          </div>

          {assignedTeachers.length === 0 ? (
            <div className="text-center py-10">
              <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No teachers assigned yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedTeachers.map((ta) => (
                <div key={ta.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-500">{(ta.teacher_name || "?").charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{ta.teacher_name || "—"}</p>
                    <select
                      value={ta.role}
                      onChange={(e) => handleChangeRole(ta.id, e.target.value)}
                      className="text-xs bg-transparent border-none p-0 text-slate-500 focus:outline-none cursor-pointer"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ROLE_BADGE[ta.role] || ""}`}>{ta.role}</span>
                  <button onClick={() => handleRemove(ta.id, ta.teacher_name)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Remove"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Select a class to manage teacher assignments.</p>
        </div>
      )}

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Teacher to {selectedClass?.class_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teachers…" className="pl-10" />
            </div>
            <div className="max-h-48 overflow-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {filteredAvailable.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No available teachers</p>
              ) : (
                filteredAvailable.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setAssignTeacherId(t.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${assignTeacherId === t.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-slate-500">{(t.full_name || "?").charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.full_name}</p>
                      <p className="text-xs text-slate-400">{t.email || t.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Role</label>
              <select value={assignRole} onChange={(e) => setAssignRole(e.target.value)} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={!assignTeacherId} className="bg-slate-900 hover:bg-slate-800">Assign</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}