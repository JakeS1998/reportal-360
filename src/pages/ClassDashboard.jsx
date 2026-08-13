import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useSchool } from "@/lib/SchoolContext";
import SectionCard from "@/components/SectionCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ClassAssessmentManager from "@/components/class/ClassAssessmentManager";
import ClassBehaviourManager from "@/components/class/ClassBehaviourManager";
import ClassGradesExportButton from "@/components/class/ClassGradesExportButton";
import QuickActionsDialog from "@/components/class/QuickActionsDialog";
import DetentionDialog from "@/components/class/DetentionDialog";
import ClassLessonPlans from "@/components/class/ClassLessonPlans";
import TeacherAssignments from "@/components/assignments/TeacherAssignments";
import { ArrowLeft, Users, UserCheck, Calendar, CalendarDays, CalendarCheck, GraduationCap, ClipboardCheck, Plus, ShieldAlert, Armchair } from "lucide-react";

const STATUS_COLOR = { present: "text-emerald-600", absent: "text-rose-500", late: "text-amber-500", excused: "text-slate-400" };
const INCIDENT_COLOR = { positive: "text-emerald-600", warning: "text-amber-600", minor: "text-orange-600", major: "text-rose-600" };

export default function ClassDashboard() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSchool();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [asmOpen, setAsmOpen] = useState(false);
  const [behOpen, setBehOpen] = useState(false);
  const [detentionOpen, setDetentionOpen] = useState(false);
  const [attendanceTarget, setAttendanceTarget] = useState(null);
  const [denied, setDenied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (!user) return;
    try {
      // The Class record may be missing for legacy/seeded homerooms — fall back to the homeroom.
      let cls = null;
      try { cls = await base44.entities.Class.get(classId); } catch (e) { /* class may be missing */ }
      if (!cls) {
        const hrs = await base44.entities.Homeroom.filter({ class_id: classId }, undefined, 1).catch(() => []);
        if (hrs.length) {
          const h = hrs[0];
          cls = { id: classId, class_name: h.homeroom_name, school_code: h.school_code, subject: "Homeroom", grade_level: h.grade_level || "", room: h.room || "", teacher_name: h.teacher_name || "", status: "active" };
        }
      }
      if (!cls) { setData(null); setDenied(false); return; }
      // Access guard: assigned teacher, active cover, or admin/manager/area.
      const role = user?.role;
      let allowed = role === "admin" || role === "manager" || role === "area";
      if (!allowed && role === "teacher") {
        const myTc = await base44.entities.TeacherClass.filter({ class_id: classId, teacher_id: user.id }, undefined, 1).catch(() => []);
        if (myTc.length) allowed = true;
        if (!allowed) {
          try {
            const res = await base44.functions.invoke("manageClassCovers", {
              action: "check_access",
              caller_username: user.username,
              caller_password: user.password || localStorage.getItem("userPassword") || "",
              class_id: classId,
              teacher_id: user.id,
            });
            if (res.data?.allowed) allowed = true;
          } catch (e) { /* ignore */ }
        }
      }
      if (!allowed) { setDenied(true); setData(null); return; }
      setDenied(false);
      const [teachers, studentClasses, attendance, attainment, behaviour, homerooms] = await Promise.all([
        base44.entities.TeacherClass.filter({ class_id: classId }),
        base44.entities.StudentClass.filter({ class_id: classId, status: "active" }, "student_name"),
        base44.entities.AttendanceRecord.filter({ class_id: classId }, "-date", 500),
        base44.entities.AttainmentRecord.filter({ class_id: classId }, "-date", 500),
        base44.entities.BehaviourRecord.filter({ class_id: classId }, "-date", 500),
        base44.entities.Homeroom.filter({ class_id: classId }, undefined, 5),
      ]);
      let students = studentClasses;
      // For a linked homeroom class, pull the roster directly from the homeroom
      // assignment so it always reflects the admin auto-assignment.
      if (homerooms.length && homerooms[0].student_ids?.length) {
        const hr = homerooms[0];
        const idSet = new Set(hr.student_ids);
        let allStudents = [];
        try {
          const res = await base44.functions.invoke("manageStudents", {
            action: "list",
            caller_username: user?.username,
            caller_password: user?.password || localStorage.getItem("userPassword") || "",
            school_code: cls.school_code,
          });
          allStudents = res.data?.students || [];
        } catch (e) { /* fall back to direct read below */ }
        if (allStudents.length === 0) {
          allStudents = await base44.entities.Student.filter({ school_code: cls.school_code }, "student_name", 500).catch(() => []);
        }
        students = allStudents
          .filter((s) => idSet.has(s.id))
          .map((s) => ({ id: s.id, student_id: s.id, student_name: s.student_name, class_id: classId, status: "active" }));
      }
      const present = attendance.filter((a) => a.status === "present").length;
      const attendanceRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null;
      const scoredAttainment = attainment.filter((record) => typeof record.score === "number" && record.submission_status !== "missed");
      const avgScore = scoredAttainment.length > 0 ? Math.round(scoredAttainment.reduce((sum, record) => sum + (record.score / (record.max_score || 100)) * 100, 0) / scoredAttainment.length) : null;
      setData({ cls, teachers, students, attendance, attainment, behaviour, attendanceRate, avgScore });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [classId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const reload = () => setReloadKey((k) => k + 1);

  const openAttendance = async () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const dayLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const schedules = await base44.entities.ClassSchedule.filter({ class_id: classId }, undefined, 200);
    const schedule = schedules.find((item) => item.day_of_week === dayName);
    setAttendanceTarget({ scheduleId: schedule?.id || `manual-${classId}-${dateStr}`, dateStr, dayLabel });
  };

  if (loading) return <div className="animate-pulse rounded-xl bg-slate-100 h-64" />;
  if (denied) return <p className="text-sm text-slate-400 text-center py-16">You don't have access to this class.</p>;
  if (!data) return <p className="text-sm text-slate-400 text-center py-16">Class not found.</p>;

  const { cls, teachers, students, attendance, attainment, behaviour, attendanceRate, avgScore } = data;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/my-classes")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Back to My Classes
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

      <SectionCard title="Scheduled lesson plans" icon={CalendarDays}>
        <ClassLessonPlans classInfo={cls} selectedLesson={location.state?.selectedLesson} />
      </SectionCard>

      <SectionCard title="Assignments" icon={ClipboardCheck}>
        <TeacherAssignments classInfo={cls} user={user} />
      </SectionCard>

      <SectionCard title={`Student Roster (${students.length})`} icon={Users}>
        {students.length === 0 ? (
          <p className="text-sm text-slate-400">No students enrolled.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {students.map((sa) => (
              <Link key={sa.id} to={`/students/${sa.student_id}`} state={{ fromClassId: classId }} className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
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
        <Button asChild variant="outline" size="sm"><Link to={`/classes/${classId}/seating-plan`}><Armchair className="w-4 h-4 mr-1.5" /> Seating plan</Link></Button>
        <Button onClick={openAttendance} variant="outline" size="sm"><CalendarCheck className="w-4 h-4 mr-1.5" /> Record Attendance</Button>
        <Button onClick={() => setAsmOpen(true)} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1.5" /> Record Assessment</Button>
        <ClassGradesExportButton className={cls.class_name} students={students} attainment={attainment} />
        <Button onClick={() => setBehOpen(true)} variant="outline" size="sm"><ShieldAlert className="w-4 h-4 mr-1.5" /> Log Incident</Button>
        <Button onClick={() => setDetentionOpen(true)} variant="outline" size="sm"><CalendarDays className="w-4 h-4 mr-1.5" /> Assign Detention</Button>
      </div>

      <QuickActionsDialog
        open={!!attendanceTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAttendanceTarget(null);
            reload();
            loadData();
          }
        }}
        mode="attendance"
        classId={classId}
        scheduleId={attendanceTarget?.scheduleId}
        className={cls.class_name}
        dayLabel={attendanceTarget?.dayLabel}
        dateStr={attendanceTarget?.dateStr}
        user={user}
      />

      <DetentionDialog open={detentionOpen} onOpenChange={setDetentionOpen} classId={classId} students={students} user={user} onSaved={() => { reload(); loadData(); }} />

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
          <ClassBehaviourManager key={`beh-${reloadKey}`} classId={classId} students={students} user={user} onSaved={() => { setBehOpen(false); reload(); loadData(); }} />
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
                    <p className="text-xs text-slate-400">{a.date}{a.assignment_type ? ` · ${a.assignment_type}` : ""}{a.subject ? ` · ${a.subject}` : ""}</p>
                  </div>
                  <span className="font-medium text-slate-700 shrink-0">{a.submission_status === "missed" ? "Missed" : `${a.score}/${a.max_score || 100}${a.letter_grade ? ` · ${a.letter_grade}` : ""}`}{a.submission_status === "late" ? " · Late" : ""}</span>
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