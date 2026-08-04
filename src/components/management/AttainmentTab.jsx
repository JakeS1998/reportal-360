import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

const gradeFor = (p) => p >= 90 ? "A" : p >= 80 ? "B" : p >= 70 ? "C" : p >= 60 ? "D" : "F";

export default function AttainmentTab({ classId, students }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    student_id: "",
    assessment_name: "",
    date: new Date().toISOString().split("T")[0],
    score: "",
    max_score: "100",
  });

  const load = async () => {
    try {
      const data = await base44.entities.AttainmentRecord.filter({ class_id: classId }, "-date", 500);
      setRecords(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, [classId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.entities.AttainmentRecord.create({
        student_id: form.student_id,
        class_id: classId,
        assessment_name: form.assessment_name,
        date: form.date,
        score: parseFloat(form.score),
        max_score: parseFloat(form.max_score) || 100,
      });
      setForm({ ...form, score: "" });
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const studentName = (id) => students.find(s => s.id === id)?.student_name || "Unknown";
  const pct = (score, max) => max ? ((score / max) * 100).toFixed(1) : "0";

  const grouped = records.reduce((acc, r) => {
    const key = `${r.assessment_name} — ${r.date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div>
      <form onSubmit={handleAdd} className="bg-white p-5 rounded-2xl border border-slate-200 mb-6">
        <h3 className="font-medium text-slate-900 mb-4">Record Assessment Score</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs text-slate-500">Student</Label>
            <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option value="">Select...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.student_name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Assessment</Label>
            <Input placeholder="e.g. Midterm" value={form.assessment_name} onChange={e => setForm({ ...form, assessment_name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Date</Label>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Score</Label>
            <Input type="number" step="0.1" placeholder="85" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Max</Label>
            <Input type="number" value={form.max_score} onChange={e => setForm({ ...form, max_score: e.target.value })} />
          </div>
        </div>
        <Button type="submit" disabled={loading || !form.student_id || !form.assessment_name || !form.score} className="bg-slate-900 hover:bg-slate-800 mt-4">
          <Plus className="w-4 h-4 mr-1" /> Add Score
        </Button>
      </form>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-center text-slate-400 py-12">No assessment records yet.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, recs]) => {
            const avg = recs.reduce((sum, r) => sum + (r.score / r.max_score * 100), 0) / recs.length;
            return (
              <div key={key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                  <h4 className="font-medium text-slate-900">{key}</h4>
                  <span className="text-sm text-slate-500">Avg: <strong className="text-slate-900">{avg.toFixed(1)}%</strong> ({gradeFor(avg)})</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {recs.map(r => {
                    const p = parseFloat(pct(r.score, r.max_score));
                    return (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3">
                        <span className="text-slate-700">{studentName(r.student_id)}</span>
                        <span className="text-sm">
                          <strong className="text-slate-900">{r.score}</strong>/{r.max_score}
                          <span className="text-slate-400 ml-2">({p}% · {gradeFor(p)})</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}