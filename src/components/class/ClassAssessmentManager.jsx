import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";

const assignmentTypes = ["classwork", "quiz", "test", "essay", "project", "homework", "presentation", "other"];
const letterGrades = ["", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];

export default function ClassAssessmentManager({ classId, students, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [maxScore, setMaxScore] = useState(100);
  const [subject, setSubject] = useState("");
  const [assignmentType, setAssignmentType] = useState("classwork");
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);

  const updateRecord = (id, update) => setRecords((current) => ({ ...current, [id]: { status: "submitted", score: "", letterGrade: "", ...current[id], ...update } }));
  const getRecord = (id) => ({ status: "submitted", score: "", letterGrade: "", ...records[id] });
  const entries = students.map((student) => ({ student_id: student.student_id, ...getRecord(student.student_id) })).filter((entry) => entry.status === "missed" || (entry.score !== "" && !isNaN(Number(entry.score))));

  const save = async () => {
    if (!name.trim() || entries.length === 0) return;
    setSaving(true);
    try {
      await base44.entities.AttainmentRecord.bulkCreate(entries.map((entry) => ({
        student_id: entry.student_id,
        class_id: classId,
        assessment_name: name.trim(),
        assignment_type: assignmentType,
        date,
        score: entry.status === "missed" ? undefined : Number(entry.score),
        max_score: Number(maxScore) || 100,
        letter_grade: entry.letterGrade || undefined,
        submission_status: entry.status,
        subject: subject.trim() || undefined,
      })));
      setName("");
      setRecords({});
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  if (students.length === 0) return <p className="text-sm text-slate-400">No students to assess.</p>;

  return <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div><label className="text-xs font-medium text-slate-500">Assignment name *</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Unit 4 Quiz" className="mt-0.5" /></div>
      <div><label className="text-xs font-medium text-slate-500">Assignment type</label><select value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)} className="mt-0.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">{assignmentTypes.map((type) => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}</select></div>
      <div><label className="text-xs font-medium text-slate-500">Date</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-0.5" /></div>
      <div><label className="text-xs font-medium text-slate-500">Max score</label><Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className="mt-0.5" /></div>
      <div><label className="text-xs font-medium text-slate-500">Subject (optional)</label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Math" className="mt-0.5" /></div>
    </div>

    <div className="divide-y divide-slate-50">
      {students.map((student) => {
        const record = getRecord(student.student_id);
        const pct = record.score !== "" && !isNaN(Number(record.score)) && Number(maxScore) > 0 ? Math.round((Number(record.score) / Number(maxScore)) * 100) : null;
        return <div key={student.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-2 sm:grid-cols-[1fr_96px_108px_92px_44px]">
          <p className="text-sm font-medium text-slate-800 truncate">{student.student_name}</p>
          <select value={record.status} onChange={(e) => updateRecord(student.student_id, { status: e.target.value, score: e.target.value === "missed" ? "" : record.score })} className="h-9 rounded-md border border-input bg-transparent px-2 text-xs"><option value="submitted">Submitted</option><option value="late">Late</option><option value="missed">Missed</option></select>
          <Input type="number" value={record.score} disabled={record.status === "missed"} onChange={(e) => updateRecord(student.student_id, { score: e.target.value })} placeholder="Score" className="w-24 text-sm" />
          <select value={record.letterGrade} onChange={(e) => updateRecord(student.student_id, { letterGrade: e.target.value })} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"><option value="">Grade</option>{letterGrades.slice(1).map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select>
          <span className="text-xs text-slate-400 text-right">{pct != null ? `${pct}%` : ""}</span>
        </div>;
      })}
    </div>

    <div className="flex items-center justify-between"><p className="text-xs text-slate-400">{entries.length} of {students.length} students recorded</p><Button onClick={save} disabled={saving || !name.trim() || entries.length === 0} size="sm"><Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save assessment"}</Button></div>
  </div>;
}