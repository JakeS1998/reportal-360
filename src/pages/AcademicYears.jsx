import React, { useState } from "react";
import { useClassManagement } from "@/lib/useClassManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Star, Archive, Copy } from "lucide-react";

const EMPTY = { name: "", start_date: "", end_date: "", is_current: false, status: "active" };

export default function AcademicYears() {
  const cm = useClassManagement();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showPromote, setShowPromote] = useState(false);
  const [sourceYear, setSourceYear] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [copyStudents, setCopyStudents] = useState(true);
  const [copyTeachers, setCopyTeachers] = useState(true);
  const [promoting, setPromoting] = useState(false);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setShowForm(true); };
  const openEdit = (y) => { setForm({ name: y.name, start_date: y.start_date || "", end_date: y.end_date || "", is_current: y.is_current, status: y.status || "active" }); setEditing(y); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) await cm.updateAcademicYear(editing.id, form);
    else await cm.createAcademicYear(form);
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (y) => {
    if (!confirm(`Delete academic year "${y.name}"?`)) return;
    await cm.deleteAcademicYear(y.id);
  };

  const handleSetCurrent = async (y) => {
    await cm.updateAcademicYear(y.id, { is_current: true });
  };

  const handleArchive = async (y) => {
    await cm.updateAcademicYear(y.id, { status: y.status === "archived" ? "active" : "archived" });
  };

  const handlePromote = async () => {
    setPromoting(true);
    try {
      await cm.promoteClasses(sourceYear, targetYear, copyStudents, copyTeachers);
      setShowPromote(false);
    } finally {
      setPromoting(false);
    }
  };

  if (cm.loading) return <div className="animate-pulse rounded-xl bg-slate-100 h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Academic Years</h2>
          <p className="text-sm text-slate-500">{cm.academicYears.length} year{cm.academicYears.length === 1 ? "" : "s"} defined</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setSourceYear(""); setTargetYear(""); setShowPromote(true); }} variant="outline" disabled={cm.academicYears.length < 2}>
            <Copy className="w-4 h-4 mr-1" /> Promote
          </Button>
          <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-1" /> Add Year
          </Button>
        </div>
      </div>

      {cm.academicYears.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-slate-400">No academic years yet. Create one to start organizing classes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cm.academicYears.map((y) => (
            <div key={y.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{y.name}</p>
                  {y.is_current && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Current</span>}
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${y.status === "archived" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"}`}>{y.status}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{y.start_date} → {y.end_date}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!y.is_current && (
                  <button onClick={() => handleSetCurrent(y)} className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Set as current"><Star className="w-4 h-4" /></button>
                )}
                <button onClick={() => openEdit(y)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Edit"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleArchive(y)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Archive"><Archive className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(y)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Academic Year" : "Add Academic Year"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2026-2027" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-slate-700">Start Date</Label>
                <Input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700">End Date</Label>
                <Input required type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="mt-1" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} className="rounded" />
              Set as current year
            </label>
            <div>
              <Label className="text-sm font-medium text-slate-700">Status</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPromote} onOpenChange={setShowPromote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote Classes to New Year</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Copy all classes from one academic year into another. This duplicates the class structure — optionally including teacher and student assignments.</p>
            <div>
              <label className="text-sm font-medium text-slate-700">From (source year)</label>
              <select value={sourceYear} onChange={(e) => setSourceYear(e.target.value)} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="">Select source year…</option>
                {cm.academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">To (target year)</label>
              <select value={targetYear} onChange={(e) => setTargetYear(e.target.value)} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="">Select target year…</option>
                {cm.academicYears.filter((y) => y.id !== sourceYear).map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={copyTeachers} onChange={(e) => setCopyTeachers(e.target.checked)} className="rounded" />
              Copy teacher assignments
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={copyStudents} onChange={(e) => setCopyStudents(e.target.checked)} className="rounded" />
              Copy student enrollments
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPromote(false)}>Cancel</Button>
              <Button onClick={handlePromote} disabled={!sourceYear || !targetYear || sourceYear === targetYear || promoting} className="bg-slate-900 hover:bg-slate-800">
                {promoting ? "Promoting…" : "Promote Classes"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}