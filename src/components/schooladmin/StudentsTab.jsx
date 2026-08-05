import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Download, Upload, Users, UserPlus } from "lucide-react";

const TEMPLATE_HEADERS = ["student_name", "student_number", "grade_level"];

export default function StudentsTab({ school }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student_name: "", student_number: "", grade_level: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkClassId, setBulkClassId] = useState("");
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studs, cls] = await Promise.all([
        base44.entities.Student.filter({ school_code: school.school_code }, "-created_date", 2000),
        base44.entities.Class.filter({ school_code: school.school_code }, "period", 500),
      ]);
      setStudents(studs);
      setClasses(cls);
    } finally { setLoading(false); }
  }, [school]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Student.create({ ...form, school_code: school.school_code });
      setForm({ student_name: "", student_number: "", grade_level: "" });
      setShowForm(false);
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this student?")) return;
    await base44.entities.Student.delete(id);
    await load();
  };

  const downloadTemplate = () => {
    const csv = TEMPLATE_HEADERS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadRes.file_url,
        json_schema: {
          type: "object",
          properties: {
            student_name: { type: "string" },
            student_number: { type: "string" },
            grade_level: { type: "string" },
          },
        },
      });
      let rows = extractRes.output;
      if (!Array.isArray(rows)) rows = rows?.rows || rows?.items || (rows ? [rows] : []);
      const payload = rows
        .filter((r) => r && r.student_name)
        .map((r) => ({
          student_name: String(r.student_name),
          student_number: r.student_number ? String(r.student_number) : "",
          grade_level: r.grade_level ? String(r.grade_level) : "",
          school_code: school.school_code,
        }));
      if (payload.length) await base44.entities.Student.bulkCreate(payload);
      await load();
      alert(`Imported ${payload.length} students.`);
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally { setUploading(false); e.target.value = ""; }
  };

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectAll = (checked) => {
    setSelected(checked ? new Set(students.map((s) => s.id)) : new Set());
  };

  const bulkAddToClass = async () => {
    if (!bulkClassId || selected.size === 0) { alert("Select a class and at least one student."); return; }
    const count = selected.size;
    await base44.entities.Student.bulkUpdate(
      Array.from(selected).map((id) => ({ id, class_id: bulkClassId }))
    );
    setSelected(new Set());
    await load();
    alert(`Assigned ${count} students.`);
  };

  const className = (id) => classes.find((c) => c.id === id)?.class_name || "—";

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Students ({students.length})</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={downloadTemplate} variant="outline" size="sm" className="border-slate-300">
            <Download className="w-4 h-4 mr-1" /> Template
          </Button>
          <label className="cursor-pointer">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} className="hidden" disabled={uploading} />
            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 border border-slate-300 bg-white hover:bg-slate-50">
              <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload Excel"}
            </span>
          </label>
          <Button onClick={() => setShowForm((v) => !v)} size="sm" className="bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4 mr-1" /> New Student
          </Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-5 rounded-2xl border border-slate-200 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label className="text-xs text-slate-500">Student Name *</Label><Input required value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} /></div>
            <div><Label className="text-xs text-slate-500">Student Number</Label><Input value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} /></div>
            <div><Label className="text-xs text-slate-500">Grade Level</Label><Input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} /></div>
          </div>
          <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 mt-4">
            {saving ? "Saving..." : "Add Student"}
          </Button>
        </form>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-4 flex items-end gap-3 flex-wrap">
        <div>
          <Label className="text-xs text-slate-500">Bulk add selected to class</Label>
          <select value={bulkClassId} onChange={(e) => setBulkClassId(e.target.value)} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm mt-1 min-w-[220px]">
            <option value="">Select class...</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
        </div>
        <Button onClick={bulkAddToClass} disabled={selected.size === 0} className="bg-slate-900 hover:bg-slate-800">
          <UserPlus className="w-4 h-4 mr-1" /> Add {selected.size > 0 ? `(${selected.size})` : ""} to Class
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
      ) : students.length === 0 ? (
        <p className="text-center text-slate-400 py-12">No students yet. Add or upload students to get started.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="p-3 text-left w-10"><input type="checkbox" checked={selected.size === students.length && students.length > 0} onChange={(e) => selectAll(e.target.checked)} /></th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Number</th>
                <th className="p-3 text-left">Grade</th>
                <th className="p-3 text-left">Class</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="p-3"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} /></td>
                  <td className="p-3 font-medium text-slate-900">{s.student_name}</td>
                  <td className="p-3 text-slate-500">{s.student_number || "—"}</td>
                  <td className="p-3 text-slate-500">{s.grade_level || "—"}</td>
                  <td className="p-3 text-slate-500">{className(s.class_id)}</td>
                  <td className="p-3 text-right"><button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}