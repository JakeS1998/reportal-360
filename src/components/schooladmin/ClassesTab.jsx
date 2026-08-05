import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Download, Upload, Users, BookOpen } from "lucide-react";

const TEMPLATE_HEADERS = ["class_name", "grade_level", "subject", "teacher_name", "period", "room", "year"];

export default function ClassesTab({ school }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ class_name: "", grade_level: "", subject: "", teacher_name: "", period: "", room: "", year: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, studs] = await Promise.all([
        base44.entities.Class.filter({ school_code: school.school_code }, "period", 500),
        base44.entities.Student.filter({ school_code: school.school_code }, "-created_date", 2000),
      ]);
      setClasses(cls);
      setStudents(studs);
    } finally {
      setLoading(false);
    }
  }, [school]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Class.create({ ...form, school_code: school.school_code, school_name: school.school_name });
      setForm({ class_name: "", grade_level: "", subject: "", teacher_name: "", period: "", room: "", year: "" });
      setShowForm(false);
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this class?")) return;
    await base44.entities.Class.delete(id);
    await load();
  };

  const downloadTemplate = () => {
    const csv = TEMPLATE_HEADERS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "classes_template.csv"; a.click();
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
            class_name: { type: "string" },
            grade_level: { type: "string" },
            subject: { type: "string" },
            teacher_name: { type: "string" },
            period: { type: "string" },
            room: { type: "string" },
            year: { type: "string" },
          },
        },
      });
      let rows = extractRes.output;
      if (!Array.isArray(rows)) rows = rows?.rows || rows?.items || (rows ? [rows] : []);
      const payload = rows
        .filter((r) => r && r.class_name)
        .map((r) => ({
          class_name: String(r.class_name),
          grade_level: r.grade_level ? String(r.grade_level) : "",
          subject: r.subject ? String(r.subject) : "",
          teacher_name: r.teacher_name ? String(r.teacher_name) : "",
          period: r.period ? String(r.period) : "",
          room: r.room ? String(r.room) : "",
          year: r.year ? String(r.year) : "",
          school_code: school.school_code,
          school_name: school.school_name,
        }));
      if (payload.length) await base44.entities.Class.bulkCreate(payload);
      await load();
      alert(`Imported ${payload.length} classes.`);
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const count = (id) => students.filter((s) => s.class_id === id).length;

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Classes ({classes.length})</h2>
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
            <Plus className="w-4 h-4 mr-1" /> New Class
          </Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-5 rounded-2xl border border-slate-200 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><Label className="text-xs text-slate-500">Class Name *</Label><Input required value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} /></div>
            <div><Label className="text-xs text-slate-500">Grade Level</Label><Input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} /></div>
            <div><Label className="text-xs text-slate-500">Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label className="text-xs text-slate-500">Teacher Name</Label><Input value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} /></div>
            <div><Label className="text-xs text-slate-500">Period</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. 1" /></div>
            <div><Label className="text-xs text-slate-500">Room</Label><Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></div>
            <div><Label className="text-xs text-slate-500">Year</Label><Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="e.g. 2025-2026" /></div>
          </div>
          <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800 mt-4">
            {saving ? "Saving..." : "Create Class"}
          </Button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
      ) : classes.length === 0 ? (
        <p className="text-center text-slate-400 py-12">No classes yet. Create or upload classes to get started.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <Card key={c.id} className="p-4 border-slate-200 bg-white rounded-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-900">{c.class_name}</h3>
                  <p className="text-sm text-slate-500">{c.subject || "—"} · {c.grade_level || "—"}</p>
                </div>
                <button onClick={() => handleDelete(c.id)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                {c.teacher_name && <span>{c.teacher_name}</span>}
                {c.room && <span>· Room {c.room}</span>}
                {c.period && <span>· Pd {c.period}</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-600">
                <Users className="w-4 h-4" /> {count(c.id)} students
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}