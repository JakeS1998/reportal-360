import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, X, CheckCheck, Save } from "lucide-react";

export default function QuickAttendance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(searchParams.get("class") || "");
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [marks, setMarks] = useState({});
  const [existing, setExisting] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const session = localStorage.getItem("schoolSession");
        if (!session) { setLoading(false); return; }
        const school = JSON.parse(session);
        const data = await base44.entities.Class.filter({ school_code: school.school_code }, "-created_date", 500);
        setClasses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    const load = async () => {
      const studs = await base44.entities.Student.filter({ class_id: selectedClass }, "student_name", 500);
      setStudents(studs);
    };
    load();
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) { setMarks({}); setExisting({}); return; }
    const load = async () => {
      try {
        const data = await base44.entities.AttendanceRecord.filter({ class_id: selectedClass, date }, "student_name", 500);
        const existMap = {};
        const markMap = {};
        data.forEach(r => {
          existMap[r.student_id] = r;
          markMap[r.student_id] = r.status === "absent" ? "absent" : "present";
        });
        setExisting(existMap);
        setMarks(markMap);
        setSaved(false);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [selectedClass, date]);

  const toggle = (studentId) => {
    setMarks(prev => ({ ...prev, [studentId]: prev[studentId] === "absent" ? "present" : "absent" }));
    setSaved(false);
  };

  const markAllPresent = () => {
    const all = {};
    students.forEach(s => { all[s.id] = "present"; });
    setMarks(all);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const toCreate = [];
      const toUpdate = [];
      for (const student of students) {
        const status = marks[student.id] || "present";
        const ex = existing[student.id];
        if (ex) {
          if (ex.status !== status) toUpdate.push({ id: ex.id, status });
        } else {
          toCreate.push({ student_id: student.id, class_id: selectedClass, date, status });
        }
      }
      if (toCreate.length > 0) await base44.entities.AttendanceRecord.bulkCreate(toCreate);
      if (toUpdate.length > 0) await base44.entities.AttendanceRecord.bulkUpdate(toUpdate);
      setSaved(true);
      const data = await base44.entities.AttendanceRecord.filter({ class_id: selectedClass, date }, "student_name", 500);
      const existMap = {};
      data.forEach(r => { existMap[r.student_id] = r; });
      setExisting(existMap);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter(s => (marks[s.id] || "present") === "present").length;
  const absentCount = students.length - presentCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <button onClick={() => navigate("/schedule")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Quick Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Mark students present or absent in seconds</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Class</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-56 h-10 rounded-md border border-slate-200 px-3 text-sm bg-white">
              <option value="">Select a class...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name} — {c.school_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Date</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
          </div>
          {selectedClass && students.length > 0 && (
            <>
              <Button onClick={markAllPresent} variant="outline" className="border-slate-300">
                <CheckCheck className="w-4 h-4 mr-1" /> All Present
              </Button>
              <div className="ml-auto flex items-center gap-3">
                {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
                <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </>
          )}
        </div>

        {selectedClass && students.length > 0 && (
          <div className="flex gap-6 mb-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Present: <strong className="text-slate-900">{presentCount}</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              Absent: <strong className="text-slate-900">{absentCount}</strong>
            </span>
          </div>
        )}

        {!selectedClass ? (
          <p className="text-center text-slate-400 py-12">Select a class to start marking attendance.</p>
        ) : students.length === 0 ? (
          <p className="text-center text-slate-400 py-12">No students in this class yet.</p>
        ) : (
          <div className="space-y-2">
            {students.map((student, i) => {
              const isAbsent = (marks[student.id] || "present") === "absent";
              return (
                <div
                  key={student.id}
                  onClick={() => toggle(student.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer select-none ${isAbsent ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200 hover:border-slate-300"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400 w-6">{i + 1}</span>
                    <span className="font-medium text-slate-900">{student.student_name}</span>
                    {student.student_number && <span className="text-sm text-slate-400">#{student.student_number}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${!isAbsent ? "bg-green-500 text-white" : "bg-slate-100 text-slate-300"}`}>
                      <Check className="w-5 h-5" />
                    </span>
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isAbsent ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-300"}`}>
                      <X className="w-5 h-5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}