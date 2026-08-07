import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link, useNavigate } from "react-router-dom";
import SectionCard from "@/components/SectionCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ClassAttendanceManager from "@/components/class/ClassAttendanceManager";
import ClassAssessmentManager from "@/components/class/ClassAssessmentManager";
import ClassBehaviourManager from "@/components/class/ClassBehaviourManager";
import { ArrowLeft, Users, UserCheck, Calendar, GraduationCap, ClipboardCheck, Plus, ShieldAlert } from "lucide-react";

const STATUS_COLOR = { present: "text-emerald-600", absent: "text-rose-500", late: "text-amber-500", excused: "text-slate-400" };
const INCIDENT_COLOR = { positive: "text-emerald-600", warning: "text-amber-600", minor: "text-orange-600", major: "text-rose-600" };

export default function ClassDashboard() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [attOpen, setAttOpen] = useState(false);
  const [asmOpen, setAsmOpen] = useState(false);
  const [behOpen, setBehOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const cls = await base44.entities.Class.get(classId);
      const [teachers, students, attendance, attainment, behaviour] = await Promise.all([
        base44.entities.TeacherClass.filter({ class_id: classId }),
        base44.entities.StudentClass.filter({ class_id: classId, status: "active" }, "student_name"),
        base44.entities.AttendanceRecord.filter({ class_id: classId }, "-date", 500),
        base44.entities.AttainmentRecord.filter({ class_id: classId }, "-date", 500),
        base44.entities.BehaviourRecord.filter({ class_id: classId }, "-date", 500),
      ]);
      const present = attendance.filter((a) => a.status === "present").length;
      const attendanceRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null;
      const avgScore = attainment.length > 0 ? Math.round(attainment.reduce((s, a) => s + (a.score / (a.max_score || 100)) * 100, 0) / attainment.length) : null;
      setData({ cls, teachers, students, attendance, attainment, behaviour, attendanceRate, avgScore });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { loadData(); }, [loadData]);

  const reload = () => setReloadKey((k) => k + 1);

  if (loading) return <div className="animate-pulse rounded-xl bg-slate-100 h-64" />;
  if (!data) return <p className="text-sm text-slate-400 text-center py-16">Class not found.</p>;

  const { cls, teachers, students, attendance, attainment, behaviour, attendanceRate, avgScore } = data;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <h2 className="text-lg font-bold text-slate-900">{cls.class_name}</h2>
        <p className="text-sm text-slate-500">{cls.subject || "—"} · Grade {cls.grade_level || "—"} {cls.room ? `· Room ${cls.room}` : ""} {cls.period ? `· Period ${cls.period}` : ""}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Users className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs text-slate-400">Enrolled</p></div>
          <p className="text-2xl font-bold text-slate-900">{students.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><UserCheck className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs text-slate-400">Teachers</p></div>
          <p className="text-2xl font-bold text-slate-900">{teachers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Calendar className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs text-slate-400">Attendance</p></div>
          <p className="text-2xl font-bold text-slate-900">{attendanceRate !== null ? `${attendanceRate}%` : "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><GraduationCap className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs text-slate-400">Avg Score</p></div>
          <p className="text-2xl font-bold text-slate-900">{avgScore !== null ? `${avgScore}%` : "—"}</p>
        </div>
      </div>

      <SectionCard title="Teachers" icon={UserCheck}>
        {teachers.length === 0 ? (
          <p className="text-sm text-slate-400">No teachers assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {teachers.map((t) => (
              <span key={t.id} className="text-sm bg-slate-50 rounded-lg px-3 py-1.5 text-slate-700">
                {t.teacher_name} <span className="text-slate-400">· {t.role}</span>
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title={`Student Roster (${students.length})`} icon={Users}>
        {students.length === 0 ? (
          <p className="text-sm text-slate-400">No students enrolled.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {students.map((sa) => (
              <Link key={sa.id} to={`/students/${sa.student_id}`} className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-500">{(sa.student_name || "?").charAt(0).toUpperCase()}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 flex-1 truncate">{sa.student_name}</p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAttOpen(true)} variant="outline" size="sm"><ClipboardCheck className="w-4 h-4 mr-1.5" /> Take Attendance</Button>
        <Button onClick={() => setAsmOpen(true)} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1.5" /> Record Assessment</Button>
        <Button onClick={() => setBehOpen(true)} variant="outline" size="sm"><ShieldAlert className="w-4 h-4 mr-1.5" /> Log Incident</Button>
      </div>

      <Dialog open={attOpen} onOpenChange={setAttOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Take Attendance</DialogTitle>
          </DialogHeader>
          <ClassAttendanceManager key={`att-${reloadKey}`} classId={classId} students={students} onSaved={() => { setAttOpen(false); reload(); loadData(); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={asmOpen} onOpenChange={setAsmOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Record Assessment</DialogTitle>
          </DialogHeader>
          <ClassAssessmentManager key={`asm-${reloadKey}`} classId={classId} students={students} onSaved={() => { setAsmOpen(false); reload(); loadData(); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={behOpen} onOpenChange={setBehOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Log Behaviour Incident</DialogTitle>
          </DialogHeader>
          <ClassBehaviourManager key={`beh-${reloadKey}`} classId={classId} students={students} onSaved={() => { setBehOpen(false); reload(); loadData(); }} />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Recent Attendance" icon={Calendar}>
          {attendance.length === 0 ? (
            <p className="text-sm text-slate-400">No attendance records.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-auto">
              {attendance.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{a.date}</span>
                  <span className={`font-medium ${STATUS_COLOR[a.status] || "text-slate-500"}`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Assessments" icon={GraduationCap}>
          {attainment.length === 0 ? (
            <p className="text-sm text-slate-400">No assessment records.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-auto">
              {attainment.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="text-slate-700 truncate">{a.assessment_name}</p>
                    <p className="text-xs text-slate-400">{a.date} {a.subject ? `· ${a.subject}` : ""}</p>
                  </div>
                  <span className="font-medium text-slate-700 shrink-0">{a.score}/{a.max_score || 100}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent Incidents" icon={ShieldAlert}>
        {behaviour.length === 0 ? (
          <p className="text-sm text-slate-400">No behaviour incidents logged.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-auto">
            {behaviour.slice(0, 10).map((b) => (
              <div key={b.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-slate-700 truncate">{b.description}</p>
                  <p className="text-xs text-slate-400">{b.date} {b.action_taken ? `· ${b.action_taken}` : ""}</p>
                </div>
                <span className={`font-medium capitalize shrink-0 ${INCIDENT_COLOR[b.incident_type] || "text-slate-500"}`}>{b.incident_type}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}