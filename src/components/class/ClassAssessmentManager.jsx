import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";

export default function ClassAssessmentManager({ classId, students, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [maxScore, setMaxScore] = useState(100);
  const [subject, setSubject] = useState("");
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);

  const setScore = (id, v) => setScores((s) => ({ ...s, [id]: v }));

  const entries = students
    .map((sa) => ({ student_id: sa.student_id, score: scores[sa.student_id] }))
    .filter((e) => e.score !== "" && e.score != null && !isNaN(Number(e.score)));

  const save = async () => {
    if (!name.trim() || entries.length === 0) return;
    setSaving(true);
    try {
      await base44.entities.AttainmentRecord.bulkCreate(
        entries.map((e) => ({
          student_id: e.student_id,
          class_id: classId,
          assessment_name: name.trim(),
          date,
          score: Number(e.score),
          max_score: Number(maxScore) || 100,
          subject: subject.trim() || undefined,
        }))
      );
      setName("");
      setScores({});
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  if (students.length === 0) return <p className="text-sm text-slate-400">No students to assess.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Assessment name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Unit 4 Quiz" className="mt-0.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-0.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Max score</label>
          <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="mt-0.5" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Subject (optional)</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Math" className="mt-0.5" />
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {students.map((sa) => {
          const val = scores[sa.student_id] ?? "";
          const pct = val !== "" && !isNaN(Number(val)) && Number(maxScore) > 0 ? Math.round((Number(val) / Number(maxScore)) * 100) : null;
          return (
            <div key={sa.id} className="flex items-center gap-3 py-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-slate-500">{(sa.student_name || "?").charAt(0).toUpperCase()}</span>
              </div>
              <p className="text-sm font-medium text-slate-800 flex-1 truncate">{sa.student_name}</p>
              <Input
                type="number"
                value={val}
                onChange={(e) => setScore(sa.student_id, e.target.value)}
                placeholder="—"
                className="w-24 text-sm"
              />
              <span className="text-xs text-slate-400 w-10 text-right">{pct != null ? `${pct}%` : ""}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{entries.length} of {students.length} students scored</p>
        <Button onClick={save} disabled={saving || !name.trim() || entries.length === 0} size="sm"><Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save assessment"}</Button>
      </div>
    </div>
  );
}