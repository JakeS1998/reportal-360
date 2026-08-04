import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";

const STATUS_CONFIG = {
  present: { label: "Present", activeClass: "bg-green-500 text-white", dotClass: "bg-green-500" },
  late: { label: "Late", activeClass: "bg-amber-500 text-white", dotClass: "bg-amber-500" },
  absent: { label: "Absent", activeClass: "bg-rose-500 text-white", dotClass: "bg-rose-500" },
  excused: { label: "Excused", activeClass: "bg-slate-400 text-white", dotClass: "bg-slate-400" },
};

const STATUS_ORDER = ["present", "late", "absent", "excused"];

export default function AttendanceTab({ classId, students }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState({});
  const [existing, setExisting] = useState({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.AttendanceRecord.filter({ class_id: classId, date }, "student_name", 500);
        const existMap = {};
        const statusMap = {};
        data.forEach(r => {
          existMap[r.student_id] = r;
          statusMap[r.student_id] = r.status;
        });
        setExisting(existMap);
        setRecords(statusMap);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [classId, date]);

  const setStatus = (studentId, status) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const toCreate = [];
      const toUpdate = [];
      for (const student of students) {
        const status = records[student.id] || "present";
        const ex = existing[student.id];
        if (ex) {
          if (ex.status !== status) toUpdate.push({ id: ex.id, status });
        } else {
          toCreate.push({ student_id: student.id, class_id: classId, date, status });
        }
      }
      if (toCreate.length > 0) await base44.entities.AttendanceRecord.bulkCreate(toCreate);
      if (toUpdate.length > 0) await base44.entities.AttendanceRecord.bulkUpdate(toUpdate);
      setSaved(true);
      const data = await base44.entities.AttendanceRecord.filter({ class_id: classId, date }, "student_name", 500);
      const existMap = {};
      data.forEach(r => { existMap[r.student_id] = r; });
      setExisting(existMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const summary = STATUS_ORDER.map(s => ({
    key: s,
    ...STATUS_CONFIG[s],
    count: students.filter(st => (records[st.id] || "present") === s).length,
  }));

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-48" />
        <Button onClick={handleSave} disabled={loading || students.length === 0} className="bg-slate-900 hover:bg-slate-800">
          <Save className="w-4 h-4 mr-1" /> Save Attendance
        </Button>
        {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        {summary.map(s => (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            <span className={`w-3 h-3 rounded-full ${s.dotClass}`}></span>
            <span className="text-slate-600">{s.label}: <strong className="text-slate-900">{s.count}</strong></span>
          </div>
        ))}
      </div>

      {students.length === 0 ? (
        <p className="text-center text-slate-400 py-12">Add students first to mark attendance.</p>
      ) : (
        <div className="space-y-2">
          {students.map(student => (
            <div key={student.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
              <span className="font-medium text-slate-900">{student.student_name}</span>
              <div className="flex gap-2">
                {STATUS_ORDER.map(s => {
                  const active = (records[student.id] || "present") === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(student.id, s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${active ? STATUS_CONFIG[s].activeClass : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}