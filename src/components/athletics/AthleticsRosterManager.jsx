import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function AthleticsRosterManager({ team, students, members, schoolCode, onAdded }) {
  const [studentId, setStudentId] = useState(""); const [saving, setSaving] = useState(false);
  const roster = members.filter((member) => member.team_id === team.id);
  const available = students.filter((student) => !roster.some((member) => member.student_id === student.id));
  const add = async () => { const student = students.find((item) => item.id === studentId); if (!student) return; setSaving(true); const member = await base44.entities.AthleticsTeamMember.create({ school_code: schoolCode, team_id: team.id, student_id: student.id, student_name: student.student_name, grade_level: student.grade_level || "" }); setStudentId(""); setSaving(false); onAdded(member); };
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-slate-900">{team.name}</h3><p className="text-xs text-slate-500">{team.sport} · Coach {team.coach_name}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{roster.length} athletes</span></div><div className="mt-3 flex gap-2"><select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-white px-3 text-sm"><option value="">Add student to roster</option>{available.map((student) => <option key={student.id} value={student.id}>{student.student_name} {student.grade_level ? `· ${student.grade_level}` : ""}</option>)}</select><Button size="sm" onClick={add} disabled={!studentId || saving}>{saving ? "Adding..." : "Add"}</Button></div>{roster.length > 0 && <p className="mt-3 text-sm text-slate-600">{roster.map((member) => member.student_name).join(", ")}</p>}</div>;
}