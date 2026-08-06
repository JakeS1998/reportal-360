import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Clock, MinusCircle, Save, CalendarCheck } from "lucide-react";

const STATUSES = [
  { key: "present", label: "Present", icon: Check, active: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { key: "absent", label: "Absent", icon: X, active: "bg-rose-100 text-rose-700 border-rose-300" },
  { key: "late", label: "Late", icon: Clock, active: "bg-amber-100 text-amber-700 border-amber-300" },
  { key: "excused", label: "Excused", icon: MinusCircle, active: "bg-slate-200 text-slate-700 border-slate-400" },
];

const INACTIVE = "bg-white text-slate-400 border-slate-200 hover:bg-slate-50";

export default function ClassAttendanceManager({ classId, students, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [marks, setMarks] = useState(() => Object.fromEntries(students.map((s) => [s.student_id, "present"])));
  const [saving, setSaving] = useState(false);

  const set = (id, status) => setMarks((m) => ({ ...m, [id]: status }));
  const markAll = (status) => setMarks(Object.fromEntries(students.map((s) => [s.student_id, status])));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.AttendanceRecord.bulkCreate(
        students.map((s) => ({ student_id: s.student_id, class_id: classId, date, status: marks[s.student_id] || "present" }))
      );
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  if (students.length === 0) return <p className="text-sm text-slate-400">No students to mark.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-0.5 w-44" />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={() => markAll("present")} variant="outline" size="sm"><Check className="w-3.5 h-3.5 mr-1" /> Mark all present</Button>
        </div>
        <Button onClick={save} disabled={saving} size="sm" className="ml-auto"><Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save attendance"}</Button>
      </div>

      <div className="divide-y divide-slate-50">
        {students.map((sa) => (
          <div key={sa.id} className="flex items-center gap-3 py-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-slate-500">{(sa.student_name || "?").charAt(0).toUpperCase()}</span>
            </div>
            <p className="text-sm font-medium text-slate-800 flex-1 truncate">{sa.student_name}</p>
            <div className="flex items-center gap-1.5">
              {STATUSES.map((st) => {
                const active = marks[sa.student_id] === st.key;
                return (
                  <button
                    key={st.key}
                    onClick={() => set(sa.student_id, st.key)}
                    title={st.label}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border transition-colors ${active ? st.active : INACTIVE}`}
                  >
                    <st.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}